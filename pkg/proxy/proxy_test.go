package proxy

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestProxy_LoadBalancing(t *testing.T) {
	// Create test backends
	backend1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "backend1")
	}))
	defer backend1.Close()

	backend2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "backend2")
	}))
	defer backend2.Close()

	// Initialize proxy with test backends
	p, err := New([]string{backend1.URL, backend2.URL})
	if err != nil {
		t.Fatalf("Failed to create proxy: %v", err)
	}

	// Test Round-Robin
	cases := []string{"backend1", "backend2", "backend1", "backend2"}
	for _, expected := range cases {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		w := httptest.NewRecorder()

		// Get next backend and serve
		backend := p.defaultPool.GetNext()
		backend.Proxy.ServeHTTP(w, req)

		if w.Body.String() != expected {
			t.Errorf("Expected %s, got %s", expected, w.Body.String())
		}
	}
}

func TestProxy_Headers(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Proxy-By") != "NLB-Plus" {
			t.Error("Missing X-Proxy-By header")
		}
	}))
	defer backend.Close()

	p, _ := New([]string{backend.URL})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	next := p.defaultPool.GetNext()
	next.Proxy.ServeHTTP(w, req)
}

func TestProxy_Lifecycle(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "backend")
	}))
	defer backend.Close()

	p, _ := New([]string{backend.URL})

	// Start in goroutine
	// Use a listener to get the actual port
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to listen: %v", err)
	}
	addr := ln.Addr().String()
	ln.Close() // Close it so Start can use it (minimal race risk)

	errCh := make(chan error, 1)
	go func() {
		errCh <- p.Start(addr)
	}()

	// Wait a bit for server to start
	time.Sleep(200 * time.Millisecond)

	// Test Health handler
	resp, err := http.Get("http://" + addr + "/health")
	if err == nil && resp.StatusCode == http.StatusOK {
		resp.Body.Close()
	}

	// Test Proxy handler
	resp, err = http.Get("http://" + addr + "/")
	if err == nil && resp.StatusCode == http.StatusOK {
		resp.Body.Close()
	}

	// Shutdown
	ctx := context.Background()
	if err := p.Shutdown(ctx); err != nil {
		t.Errorf("Shutdown failed: %v", err)
	}

	// Test double shutdown (coverage for nil server check)
	p2 := &Proxy{}
	p2.Shutdown(ctx)

	// Expect Start to return error (Server closed)
	err = <-errCh
	if err != http.ErrServerClosed {
		t.Errorf("Expected ServerClosed error, got %v", err)
	}
}

func TestProxy_AdvancedMatching(t *testing.T) {
	backend1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "glob")
	}))
	defer backend1.Close()

	backend2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "method")
	}))
	defer backend2.Close()

	backend3 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "priority")
	}))
	defer backend3.Close()

	p, _ := New([]string{})
	p.UpdateRoutes([]ConfigRoute{
		{Path: "/api/*", Targets: []string{backend1.URL}, Priority: 10},
		{Path: "/api/priority", Targets: []string{backend3.URL}, Priority: 5}, // Higher priority (lower number)
		{Path: "/method", Methods: []string{"POST"}, Targets: []string{backend2.URL}, Priority: 1},
	})

	// Test case 1: Glob match
	req1 := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	w1 := httptest.NewRecorder()
	p.ServeHTTP(w1, req1)
	if w1.Body.String() != "glob" {
		t.Errorf("Glob match failed: expected glob, got %s", w1.Body.String())
	}

	// Test case 2: Priority match (/api/priority matches both, but backend3 has higher priority)
	req2 := httptest.NewRequest(http.MethodGet, "/api/priority", nil)
	w2 := httptest.NewRecorder()
	p.ServeHTTP(w2, req2)
	if w2.Body.String() != "priority" {
		t.Errorf("Priority match failed: expected priority, got %s", w2.Body.String())
	}

	// Test case 3: Method filter (POST matches, GET should fail)
	req3 := httptest.NewRequest(http.MethodPost, "/method", nil)
	w3 := httptest.NewRecorder()
	p.ServeHTTP(w3, req3)
	if w3.Body.String() != "method" {
		t.Errorf("Method match failed: expected method, got %s", w3.Body.String())
	}

	req4 := httptest.NewRequest(http.MethodGet, "/method", nil)
	w4 := httptest.NewRecorder()
	p.ServeHTTP(w4, req4)
	if w4.Code != http.StatusServiceUnavailable { // No route matches
		t.Errorf("Method filter failed: expected 503, got %d", w4.Code)
	}

	// Test case 4: Header match
	p.UpdateRoutes([]ConfigRoute{
		{
			Path:    "/header",
			Targets: []string{backend1.URL},
			Rules: &RoutingRule{
				Conditions: []Condition{
					{Type: "header", Key: "X-Premium", Operator: "equals", Value: "true"},
				},
			},
		},
	})
	req5 := httptest.NewRequest(http.MethodGet, "/header", nil)
	req5.Header.Set("X-Premium", "true")
	w5 := httptest.NewRecorder()
	p.ServeHTTP(w5, req5)
	if w5.Body.String() != "glob" {
		t.Errorf("Header match failed: expected glob, got %s", w5.Body.String())
	}

	// Test case 5: Query match
	p.UpdateRoutes([]ConfigRoute{
		{
			Path:    "/query",
			Targets: []string{backend1.URL},
			Rules: &RoutingRule{
				Conditions: []Condition{
					{Type: "query", Key: "v", Operator: "contains", Value: "2"},
				},
			},
		},
	})
	req6 := httptest.NewRequest(http.MethodGet, "/query?v=2.1", nil)
	w6 := httptest.NewRecorder()
	p.ServeHTTP(w6, req6)
	if w6.Body.String() != "glob" {
		t.Errorf("Query match failed: expected glob, got %s", w6.Body.String())
	}
}

func TestProxy_LoadBalancingAlgorithms(t *testing.T) {
	backend1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "b1")
	}))
	defer backend1.Close()

	backend2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "b2")
	}))
	defer backend2.Close()

	p, _ := New([]string{})

	// Test Random
	p.UpdateRoutes([]ConfigRoute{
		{
			Path:      "/random",
			Targets:   []string{backend1.URL, backend2.URL},
			Algorithm: "random",
		},
	})

	results := make(map[string]int)
	for i := 0; i < 100; i++ {
		req := httptest.NewRequest(http.MethodGet, "/random", nil)
		w := httptest.NewRecorder()
		p.ServeHTTP(w, req)
		results[w.Body.String()]++
	}
	if results["b1"] == 0 || results["b2"] == 0 {
		t.Errorf("Random distribution failed: b1=%d, b2=%d", results["b1"], results["b2"])
	}

	// Test Weighted
	p.UpdateRoutes([]ConfigRoute{
		{
			Path:      "/weighted",
			Targets:   []string{backend1.URL, backend2.URL},
			Algorithm: "weighted",
			Weights: map[string]int{
				backend1.URL: 90,
				backend2.URL: 10,
			},
		},
	})

	results = make(map[string]int)
	for i := 0; i < 500; i++ {
		req := httptest.NewRequest(http.MethodGet, "/weighted", nil)
		w := httptest.NewRecorder()
		p.ServeHTTP(w, req)
		results[w.Body.String()]++
	}
	if results["b1"] < results["b2"] {
		t.Errorf("Weighted distribution failed: b1=%d, b2=%d", results["b1"], results["b2"])
	}
}

func TestProxy_ResponseCaching(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, time.Now().UnixNano())
	}))
	defer backend.Close()

	p, _ := New([]string{})
	p.UpdateRoutes([]ConfigRoute{
		{
			Path:    "/cached",
			Targets: []string{backend.URL},
			Cache: &CacheConfig{
				Enabled: true,
				TTL:     1,
			},
		},
	})

	// First request - MISS
	req1 := httptest.NewRequest(http.MethodGet, "/cached", nil)
	w1 := httptest.NewRecorder()
	p.ServeHTTP(w1, req1)
	body1 := w1.Body.String()
	if w1.Header().Get("X-GP-Cache") != "MISS" {
		t.Error("First request should be a cache MISS")
	}

	// Second request - HIT
	req2 := httptest.NewRequest(http.MethodGet, "/cached", nil)
	w2 := httptest.NewRecorder()
	p.ServeHTTP(w2, req2)
	body2 := w2.Body.String()
	if w2.Header().Get("X-GP-Cache") != "HIT" {
		t.Error("Second request should be a cache HIT")
	}
	if body1 != body2 {
		t.Error("Cached response should match first response")
	}

	// Wait for expiration
	time.Sleep(1100 * time.Millisecond)

	// Third request - MISS (expired)
	req3 := httptest.NewRequest(http.MethodGet, "/cached", nil)
	w3 := httptest.NewRecorder()
	p.ServeHTTP(w3, req3)
	if w3.Header().Get("X-GP-Cache") != "MISS" {
		t.Error("Request after TTL should be a cache MISS")
	}
}

func TestProxy_HeaderManipulation(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Req-Added") != "val1" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if r.Header.Get("X-Req-Removed") != "" {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.Header().Set("X-Res-Original", "orig")
		w.Header().Set("X-Res-Removed", "to-be-removed")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "ok")
	}))
	defer backend.Close()

	p, _ := New([]string{})
	p.UpdateRoutes([]ConfigRoute{
		{
			Path:    "/headers",
			Targets: []string{backend.URL},
			Headers: &HeadersConfig{
				AddRequest:     map[string]string{"X-Req-Added": "val1"},
				RemoveRequest:  []string{"X-Req-Removed"},
				AddResponse:    map[string]string{"X-Res-Added": "val2"},
				RemoveResponse: []string{"X-Res-Removed"},
			},
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/headers", nil)
	req.Header.Set("X-Req-Removed", "should-be-gone")
	w := httptest.NewRecorder()
	p.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Header manipulation failed: backend returned status %d", w.Code)
	}
	if w.Header().Get("X-Res-Added") != "val2" {
		t.Error("Failed to add response header")
	}
	if w.Header().Get("X-Res-Removed") != "" {
		t.Error("Failed to remove response header")
	}
}

func TestProxy_NewError(t *testing.T) {
	_, err := New([]string{"://invalid-url"})
	if err == nil {
		t.Error("Expected error for invalid URL")
	}
}
