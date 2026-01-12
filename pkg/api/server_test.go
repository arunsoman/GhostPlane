package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/arunsoman/GhostPlane/pkg/config"
	"github.com/arunsoman/GhostPlane/pkg/db"
	"github.com/arunsoman/GhostPlane/pkg/proxy"
)

func TestServer_Config(t *testing.T) {
	conf := &config.Config{Version: "v1"}
	p, _ := proxy.New([]string{})
	s, _ := NewServer(conf, nil, p, nil, nil, "../../templates")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/config", nil)
	w := httptest.NewRecorder()

	s.handleConfig(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestServer_Metrics(t *testing.T) {
	p, _ := proxy.New([]string{"http://localhost:8081"})
	s, _ := NewServer(nil, nil, p, nil, nil, "../../templates")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics", nil)
	w := httptest.NewRecorder()

	s.handleMetrics(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestServer_Health(t *testing.T) {
	s, _ := NewServer(nil, nil, nil, nil, nil, "../../templates")
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	s.handleHealth(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestServer_Setup(t *testing.T) {
	dbPath := "./test_api_nlb.db"
	defer os.Remove(dbPath)
	store, _ := db.NewStore(dbPath)
	defer store.Close()

	s, _ := NewServer(nil, nil, nil, nil, store, "../../templates")

	// Test check
	req := httptest.NewRequest(http.MethodGet, "/api/v1/setup/check", nil)
	w := httptest.NewRecorder()
	s.handleSetupCheck(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Setup check failed: %d", w.Code)
	}

	var checkResp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&checkResp)
	if checkResp["setup_complete"] != false {
		t.Error("Expected setup_complete to be false")
	}

	// Test initialize
	payload := map[string]string{"cluster_name": "api-test"}
	body, _ := json.Marshal(payload)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/setup/initialize", bytes.NewBuffer(body))
	w = httptest.NewRecorder()
	s.handleSetupInitialize(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Setup initialize failed: %d", w.Code)
	}

	complete, _ := store.IsSetupComplete()
	if !complete {
		t.Error("Expected setup to be complete in DB")
	}
}

func TestServer_Lifecycle(t *testing.T) {
	p, _ := proxy.New([]string{"http://localhost:8081"})
	s, err := NewServer(nil, nil, p, nil, nil, "../../templates")
	if err != nil {
		t.Fatalf("failed to create server: %v", err)
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- s.Start("127.0.0.1:0")
	}()

	time.Sleep(100 * time.Millisecond)

	if err := s.Shutdown(context.Background()); err != nil {
		t.Errorf("Shutdown failed: %v", err)
	}
}
