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
	serve(p, w1, req1)
	if w1.Body.String() != "glob" {
		t.Errorf("Glob match failed: expected glob, got %s", w1.Body.String())
	}

	// Test case 2: Priority match (/api/priority matches both, but backend3 has higher priority)
	req2 := httptest.NewRequest(http.MethodGet, "/api/priority", nil)
	w2 := httptest.NewRecorder()
	serve(p, w2, req2)
	if w2.Body.String() != "priority" {
		t.Errorf("Priority match failed: expected priority, got %s", w2.Body.String())
	}

	// Test case 3: Method filter (POST matches, GET should fail)
	req3 := httptest.NewRequest(http.MethodPost, "/method", nil)
	w3 := httptest.NewRecorder()
	serve(p, w3, req3)
	if w3.Body.String() != "method" {
		t.Errorf("Method match failed: expected method, got %s", w3.Body.String())
	}

	req4 := httptest.NewRequest(http.MethodGet, "/method", nil)
	w4 := httptest.NewRecorder()
	serve(p, w4, req4)
	if w4.Code != http.StatusServiceUnavailable { // No route matches
		t.Errorf("Method filter failed: expected 503, got %d", w4.Code)
	}
}

// Helper to simulate the proxy handler matching without full Start()
func serve(p *Proxy, w *httptest.ResponseRecorder, r *http.Request) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	for _, route := range p.routes {
		if route.Matches(r) {
			backend := route.Pool.GetNext()
			if backend != nil {
				backend.Proxy.ServeHTTP(w, r)
				return
			}
		}
	}
	w.WriteHeader(http.StatusServiceUnavailable)
}

func TestProxy_NewError(t *testing.T) {
	_, err := New([]string{"://invalid-url"})
	if err == nil {
		t.Error("Expected error for invalid URL")
	}
}
