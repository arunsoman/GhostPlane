package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync" // Added for sync.Mutex
	"sync/atomic"
	"time"

	"github.com/arunsoman/GhostPlane/pkg/auth"
	"github.com/arunsoman/GhostPlane/pkg/config"
	"github.com/arunsoman/GhostPlane/pkg/db"
	"github.com/arunsoman/GhostPlane/pkg/ebpf"
	"github.com/arunsoman/GhostPlane/pkg/proxy"
	"github.com/arunsoman/GhostPlane/pkg/setup"
	"github.com/arunsoman/GhostPlane/pkg/templates" // Added for templates
)

// Server represents the Management API server
type Server struct {
	config      *config.Config
	authService *auth.AuthService
	proxy       *proxy.Proxy
	ebpfLoader  *ebpf.Loader
	templates   *templates.Repository // Added
	renderer    *templates.Renderer   // Added
	mu          sync.Mutex            // Added
	store       *db.Store
	// Stream channels
	metricsTicker  *time.Ticker
	DeploymentChan chan templates.Deployment // Added for SSE broadcasting

	server *http.Server
}

// NewServer creates a new API server
func NewServer(cfg *config.Config, authSvc *auth.AuthService, p *proxy.Proxy, el *ebpf.Loader, s *db.Store, templatePath string) (*Server, error) {
	// Initialize template repository and renderer
	repo, err := templates.NewRepository(templatePath)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize template repository: %w", err)
	}
	renderer := templates.NewRenderer()

	return &Server{
		config:         cfg,
		authService:    authSvc,
		proxy:          p,
		ebpfLoader:     el,
		templates:      repo,
		renderer:       renderer,
		store:          s,
		DeploymentChan: make(chan templates.Deployment, 10), // Buffered channel
	}, nil
}

// Start starts the API server
func (s *Server) Start(addr string) error {
	mux := http.NewServeMux()

	// Public endpoints (no auth required)
	mux.HandleFunc("/api/v1/login", s.authService.HandleLogin)
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/api/v1/setup/check", s.handleSetupCheck)
	mux.HandleFunc("/api/v1/stream", s.handleStream) // SSE endpoint

	// Protected endpoints (auth required)
	protectedMux := http.NewServeMux()
	protectedMux.HandleFunc("/api/v1/config", s.handleConfig)
	protectedMux.HandleFunc("/api/v1/metrics", s.handleMetrics)
	protectedMux.HandleFunc("/api/v1/migrate", s.handleMigrate)
	protectedMux.HandleFunc("/api/v1/ebpf/stats", s.handleEBPFStats)
	protectedMux.HandleFunc("/api/v1/ebpf/config", s.handleEBPFConfig)
	protectedMux.HandleFunc("/api/v1/change-password", s.authService.HandleChangePassword)
	protectedMux.HandleFunc("/api/v1/setup/initialize", s.handleSetupInitialize)

	// Template Gallery Routes
	tmplHandler := templates.NewHandler(s.templates, s.renderer, templates.NewSimulator(), s.proxy, s.ebpfLoader, s.store, s.DeploymentChan)
	fmt.Println("DEBUG: Registering Template Routes...")
	protectedMux.HandleFunc("/api/v1/templates", tmplHandler.ListTemplates)
	fmt.Println("DEBUG: Registering /api/v1/deployments/active")
	protectedMux.HandleFunc("/api/v1/deployments/active", tmplHandler.GetActiveDeployment)
	protectedMux.HandleFunc("/api/v1/templates/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/deploy") {
			tmplHandler.DeployTemplate(w, r)
		} else if strings.HasSuffix(r.URL.Path, "/verify") {
			tmplHandler.VerifyTemplate(w, r)
		} else {
			tmplHandler.GetTemplate(w, r)
		}
	})

	// Wrap protected routes with auth middleware
	mux.Handle("/api/v1/", s.authService.Middleware(protectedMux))

	s.server = &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the API server
func (s *Server) Shutdown(ctx context.Context) error {
	if s.server != nil {
		return s.server.Shutdown(ctx)
	}
	return nil
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodPost {
		var newRoutes []proxy.ConfigRoute
		if err := json.NewDecoder(r.Body).Decode(&newRoutes); err != nil {
			http.Error(w, "Invalid config payload", http.StatusBadRequest)
			return
		}

		if err := s.proxy.UpdateRoutes(newRoutes); err != nil {
			http.Error(w, "Failed to apply routes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Save to store
		if err := s.store.SaveRoutes(newRoutes); err != nil {
			fmt.Printf("⚠️ Failed to persist routes: %v\n", err)
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "applied",
			"count":  len(newRoutes),
		})
		return
	}

	// GET: Return current runtime routes
	activeRoutes := s.proxy.GetRoutes()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"static_config": s.config,
		"active_routes": activeRoutes,
	})
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	totalRequests := atomic.LoadUint64(&s.proxy.TotalRequests)
	activeConns := atomic.LoadInt32(&s.proxy.ActiveConnections)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"total_requests":     totalRequests,
		"active_connections": activeConns,
		"system_health":      "optimal",
		"timestamp":          time.Now().Unix(),
	})
}
func (s *Server) handleSetupCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	complete, _ := s.store.IsSetupComplete()
	caps := setup.CheckCapabilities()

	// Extend capabilities with setup state
	response := map[string]interface{}{
		"caps":           caps,
		"setup_complete": complete,
	}
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleSetupInitialize(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ClusterName string `json:"cluster_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	if err := s.store.SetSetting("cluster_name", req.ClusterName); err != nil {
		http.Error(w, "failed to save settings", http.StatusInternalServerError)
		return
	}
	if err := s.store.SetSetting("setup_complete", "true"); err != nil {
		http.Error(w, "failed to mark setup complete", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "initialized"})
}
func (s *Server) handleStream(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	fmt.Println("📡 New SSE client connected")

	// Create a context for the client connection
	ctx := r.Context()

	// Periodic metrics ticker
	metricsTicker := time.NewTicker(2 * time.Second)
	defer metricsTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			fmt.Println("🔌 SSE client disconnected")
			return
		case log := <-s.proxy.LogChan:
			// Stream log entry
			logData, _ := json.Marshal(log)
			fmt.Fprintf(w, "event: log\ndata: %s\n\n", logData)
			flusher.Flush()
		case <-metricsTicker.C:
			// Stream aggregate metrics
			totalRequests := atomic.LoadUint64(&s.proxy.TotalRequests)
			activeConns := atomic.LoadInt32(&s.proxy.ActiveConnections)
			data, _ := json.Marshal(map[string]interface{}{
				"total_requests":     totalRequests,
				"active_connections": activeConns,
				"timestamp":          time.Now().Unix(),
			})
			fmt.Fprintf(w, "event: metrics\ndata: %s\n\n", data)
			flusher.Flush()

		case deploy := <-s.DeploymentChan:
			// Stream deployment event
			data, _ := json.Marshal(deploy)
			fmt.Fprintf(w, "event: deployment\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}

// InitializeRoutes loads routes from store and applies them to proxy
func (s *Server) InitializeRoutes() error {
	data, err := s.store.LoadRoutes()
	if err != nil {
		return err
	}
	if data == "" {
		return nil
	}

	var routes []proxy.ConfigRoute
	if err := json.Unmarshal([]byte(data), &routes); err != nil {
		return fmt.Errorf("failed to parse persisted routes: %v", err)
	}

	return s.proxy.UpdateRoutes(routes)
}

func (s *Server) handleMigrate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload struct {
		Config string `json:"config"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	migrator := proxy.NewMigrator()
	routes := migrator.Migrate(payload.Config)

	if routes == nil {
		json.NewEncoder(w).Encode([]proxy.ConfigRoute{})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}
func (s *Server) handleEBPFStats(w http.ResponseWriter, r *http.Request) {
	if s.ebpfLoader == nil {
		http.Error(w, "eBPF not initialized", http.StatusServiceUnavailable)
		return
	}

	stats, err := s.ebpfLoader.GetStats()
	if err != nil {
		http.Error(w, "Failed to get XDP stats: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (s *Server) handleEBPFConfig(w http.ResponseWriter, r *http.Request) {
	if s.ebpfLoader == nil {
		http.Error(w, "eBPF not initialized", http.StatusServiceUnavailable)
		return
	}

	if r.Method == http.MethodPost {
		var req struct {
			AddListener    uint16 `json:"add_listener"`
			RemoveListener uint16 `json:"remove_listener"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		if req.AddListener != 0 {
			if err := s.ebpfLoader.AddListener(req.AddListener); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		if req.RemoveListener != 0 {
			if err := s.ebpfLoader.RemoveListener(req.RemoveListener); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		w.WriteHeader(http.StatusOK)
		return
	}

	// GET: Return current L4 backends (simplified for now)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "active",
	})
}
