package proxy

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"path"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// AccessLog represents a single proxied request record
type AccessLog struct {
	Timestamp  time.Time `json:"timestamp"`
	Method     string    `json:"method"`
	Path       string    `json:"path"`
	Status     int       `json:"status"`
	DurationMs int64     `json:"duration_ms"`
	Backend    string    `json:"backend"`
	ClientIP   string    `json:"client_ip"`
}

// statusWriter is a wrapper for http.ResponseWriter to capture status code
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// Backend represents a single target server
type Backend struct {
	URL   *url.URL
	Alive bool
	Proxy *httputil.ReverseProxy
}

// Pool represents a group of backends
type Pool struct {
	backends []*Backend
	current  uint64
}

// Route represents a routing rule
type Route struct {
	Path     string
	Methods  []string // Empty means all methods
	Priority int
	Pool     *Pool
}

// Matches checks if a request matches this route
func (r *Route) Matches(req *http.Request) bool {
	// 1. Method match
	if len(r.Methods) > 0 {
		matchedMethod := false
		for _, m := range r.Methods {
			if m == req.Method {
				matchedMethod = true
				break
			}
		}
		if !matchedMethod {
			return false
		}
	}

	// 2. Path match (Glob)
	matchedPath, _ := path.Match(r.Path, req.URL.Path)
	if matchedPath {
		return true
	}

	// Fallback to prefix match for legacy support/ease of use
	if len(r.Path) > 0 && r.Path != "/" {
		if req.URL.Path == r.Path || (len(req.URL.Path) > len(r.Path) && req.URL.Path[len(r.Path)] == '/' && req.URL.Path[:len(r.Path)] == r.Path) {
			return true
		}
	}

	return false
}

// GetNext returns the next available backend using round-robin, skipping unhealthy ones
func (p *Pool) GetNext() *Backend {
	n := uint64(len(p.backends))
	if n == 0 {
		return nil
	}

	// Try up to n backends to find an alive one
	for i := uint64(0); i < n; i++ {
		next := atomic.AddUint64(&p.current, 1)
		b := p.backends[(next-1)%n]
		if b.Alive {
			return b
		}
	}

	// If none are alive, just return one (fallback)
	next := atomic.AddUint64(&p.current, 1)
	return p.backends[(next-1)%n]
}

// Proxy represents the L7 reverse proxy
type Proxy struct {
	server            *http.Server
	defaultPool       *Pool
	routes            []Route
	mu                sync.RWMutex
	TotalRequests     uint64
	ActiveConnections int32
	LogChan           chan AccessLog
}

// New creates a new proxy instance with backend URLs
func New(defaultBackends []string) (*Proxy, error) {
	pool, err := createBackendPool(defaultBackends)
	if err != nil {
		return nil, err
	}

	return &Proxy{
		defaultPool: pool,
		LogChan:     make(chan AccessLog, 1000), // Buffer for logs
	}, nil
}

// ConfigRoute represents a route configuration from API
type ConfigRoute struct {
	Path     string   `json:"path"`
	Methods  []string `json:"methods"`
	Priority int      `json:"priority"`
	Targets  []string `json:"targets"`
}

// UpdateRoutes atomically updates the routing table
func (p *Proxy) UpdateRoutes(configRoutes []ConfigRoute) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	var newRoutes []Route
	for _, cr := range configRoutes {
		pool, err := createBackendPool(cr.Targets)
		if err != nil {
			return err
		}
		newRoutes = append(newRoutes, Route{
			Path:     cr.Path,
			Methods:  cr.Methods,
			Priority: cr.Priority,
			Pool:     pool,
		})
	}

	// Sort routes by priority (ascending)
	sort.Slice(newRoutes, func(i, j int) bool {
		return newRoutes[i].Priority < newRoutes[j].Priority
	})

	p.routes = newRoutes
	fmt.Printf("🔄 Updated L7 Routes: %d rules active\n", len(newRoutes))
	return nil
}

// GetRoutes returns the current active routes
func (p *Proxy) GetRoutes() []ConfigRoute {
	p.mu.RLock()
	defer p.mu.RUnlock()

	var current []ConfigRoute
	for _, r := range p.routes {
		var targets []string
		if r.Pool != nil {
			for _, b := range r.Pool.backends {
				targets = append(targets, b.URL.String())
			}
		}
		current = append(current, ConfigRoute{
			Path:     r.Path,
			Methods:  r.Methods,
			Priority: r.Priority,
			Targets:  targets,
		})
	}
	return current
}

func createBackendPool(urls []string) (*Pool, error) {
	var backends []*Backend
	for _, b := range urls {
		target, err := url.Parse(b)
		if err != nil {
			return nil, fmt.Errorf("invalid backend URL %s: %w", b, err)
		}

		rp := httputil.NewSingleHostReverseProxy(target)

		// Custom Director to ensure headers are set correctly
		originalDirector := rp.Director
		rp.Director = func(req *http.Request) {
			originalDirector(req)
			req.Header.Set("X-Forwarded-Host", req.Host)
			req.Header.Set("X-Proxy-By", "NLB-Plus")
		}

		backends = append(backends, &Backend{
			URL:   target,
			Alive: true,
			Proxy: rp,
		})
	}
	return &Pool{backends: backends}, nil
}

// Start starts the proxy server
func (p *Proxy) Start(addr string) error {
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Main proxy handler
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		atomic.AddUint64(&p.TotalRequests, 1)
		atomic.AddInt32(&p.ActiveConnections, 1)
		defer atomic.AddInt32(&p.ActiveConnections, -1)

		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		p.mu.RLock()
		routes := p.routes
		defaultPool := p.defaultPool
		p.mu.RUnlock()

		var matchedBackend *Backend

		// 1. Try to match a specific route
		for _, route := range routes {
			if route.Matches(r) {
				matchedBackend = route.Pool.GetNext()
				break
			}
		}

		// 2. Fallback to default pool
		if matchedBackend == nil && defaultPool != nil {
			matchedBackend = defaultPool.GetNext()
		}

		if matchedBackend != nil {
			matchedBackend.Proxy.ServeHTTP(sw, r)
		} else {
			sw.status = http.StatusServiceUnavailable
			http.Error(sw, "No healthy backends available", sw.status)
		}

		// Logging
		log := AccessLog{
			Timestamp:  start,
			Method:     r.Method,
			Path:       r.URL.Path,
			Status:     sw.status,
			DurationMs: time.Since(start).Milliseconds(),
			ClientIP:   r.RemoteAddr,
		}
		if matchedBackend != nil {
			log.Backend = matchedBackend.URL.String()
		}

		// Non-blocking send to LogChan
		select {
		case p.LogChan <- log:
		default:
			// Channel full, drop log to avoid blocking proxy
		}
	})

	p.server = &http.Server{
		Addr:    addr,
		Handler: otelhttp.NewHandler(mux, "Proxy"),
	}

	// Start health check worker
	go p.startHealthCheckWorker()

	fmt.Printf("🚀 L7 Proxy started on %s\n", addr)
	return p.server.ListenAndServe()
}

func (p *Proxy) startHealthCheckWorker() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		p.mu.RLock()
		// Get all unique backends across all pools
		uniqueBackends := make(map[*Backend]bool)
		if p.defaultPool != nil {
			for _, b := range p.defaultPool.backends {
				uniqueBackends[b] = true
			}
		}
		for _, r := range p.routes {
			if r.Pool != nil {
				for _, b := range r.Pool.backends {
					uniqueBackends[b] = true
				}
			}
		}
		p.mu.RUnlock()

		for b := range uniqueBackends {
			alive := checkBackend(b.URL)
			if alive != b.Alive {
				b.Alive = alive
				status := "UP"
				if !alive {
					status = "DOWN"
				}
				fmt.Printf("🩺 Health Check: %s is %s\n", b.URL.String(), status)
			}
		}
	}
}

func checkBackend(target *url.URL) bool {
	client := http.Client{
		Timeout: 2 * time.Second,
	}
	resp, err := client.Head(target.String())
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode >= 200 && resp.StatusCode < 500
}

// Shutdown gracefully shuts down the proxy
func (p *Proxy) Shutdown(ctx context.Context) error {
	if p.server != nil {
		fmt.Println("🛑 Shutting down L7 Proxy...")
		return p.server.Shutdown(ctx)
	}
	return nil
}
