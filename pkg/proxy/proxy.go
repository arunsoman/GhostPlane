package proxy

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"path"
	"sort"
	"strings"
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

// statusResponseWriter is a wrapper for http.ResponseWriter to capture status code and body
type statusResponseWriter struct {
	http.ResponseWriter
	header  http.Header
	status  int
	body    bytes.Buffer
	capture bool
}

func (w *statusResponseWriter) Header() http.Header {
	return w.header
}

func (w *statusResponseWriter) Write(b []byte) (int, error) {
	if w.capture {
		w.body.Write(b)
	}
	return w.ResponseWriter.Write(b)
}

func (w *statusResponseWriter) WriteHeader(statusCode int) {
	w.status = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

// Backend represents a single target server
type Backend struct {
	URL    *url.URL
	Alive  bool
	Proxy  *httputil.ReverseProxy
	Weight int // Added for weighted LB
}

// Pool represents a group of backends
type Pool struct {
	backends []*Backend
	current  uint64
}

// Route represents a routing rule
type Route struct {
	Path           string
	Methods        []string // Empty means all methods
	Priority       int
	Pool           *Pool
	CanaryPool     *Pool
	Source         *RouteSource
	HealthCheck    *HealthCheckConfig
	Rules          *RoutingRule
	Algorithm      string
	Weights        map[string]int // This field is for ConfigRoute, not Route directly. Route uses Pool.Weight
	Canary         *CanaryConfig
	Affinity       *AffinityConfig
	Resilience     *ResilienceConfig
	CircuitBreaker *CircuitBreakerConfig
	RateLimit      *RateLimitConfig
	Auth           *AuthConfig
	Cache          *CacheConfig
	Headers        *HeadersConfig
	cancel         context.CancelFunc
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

	// 3. Advanced Rules match
	if r.Rules != nil && len(r.Rules.Conditions) > 0 {
		return r.Rules.Evaluate(req)
	}

	return false
}

// Authenticate checks if a request has valid credentials
func (r *Route) Authenticate(req *http.Request) bool {
	if r.Auth == nil || r.Auth.Type == "none" {
		return true
	}

	switch r.Auth.Type {
	case "api_key":
		key := req.Header.Get("X-API-Key")
		if key == "" {
			key = req.URL.Query().Get("api_key")
		}
		if key == "" {
			return false
		}
		// Check if key exists in Auth.Keys (key is the value, value is name/desc)
		for k := range r.Auth.Keys {
			if k == key {
				return true
			}
		}
	case "basic":
		user, pass, ok := req.BasicAuth()
		if !ok {
			return false
		}
		if expectedPass, ok := r.Auth.Keys[user]; ok && expectedPass == pass {
			return true
		}
	}

	return false
}

// Evaluate checks if the request satisfies the routing rules
func (rr *RoutingRule) Evaluate(req *http.Request) bool {
	if len(rr.Conditions) == 0 {
		return true
	}

	isOR := strings.ToUpper(rr.MatchLogic) == "OR"

	for _, cond := range rr.Conditions {
		matched := cond.Match(req)
		if isOR && matched {
			return true
		}
		if !isOR && !matched {
			return false
		}
	}

	return !isOR // For AND, if we reached here, all matched. For OR, if we reached here, none matched.
}

// Match performs the actual condition check
func (c *Condition) Match(req *http.Request) bool {
	var val string
	exists := false

	switch c.Type {
	case "header":
		val = req.Header.Get(c.Key)
		exists = val != ""
	case "query":
		val = req.URL.Query().Get(c.Key)
		exists = val != ""
	case "host":
		val = req.Host
		exists = true
	}

	switch c.Operator {
	case "equals":
		return val == c.Value
	case "contains":
		return strings.Contains(val, c.Value)
	case "exists":
		return exists
	case "not-exists":
		return !exists
	case "regex":
		// Simple regex for now, should probably pre-compile
		matched, _ := path.Match(c.Value, val)
		return matched
	default:
		return false
	}
}

// GetNextWithAlgorithm returns the next available backend using the specified algorithm and respecting affinity
func (p *Pool) GetNextWithAlgorithm(algo string, affinity *AffinityConfig, req *http.Request) *Backend {
	n := uint64(len(p.backends))
	if n == 0 {
		return nil
	}

	aliveBackends := make([]*Backend, 0)
	for _, b := range p.backends {
		if b.Alive {
			aliveBackends = append(aliveBackends, b)
		}
	}

	if len(aliveBackends) == 0 {
		aliveBackends = p.backends
	}

	// Session Affinity
	if affinity != nil && affinity.Type != "none" {
		var key string
		if affinity.Type == "client_ip" {
			key = strings.Split(req.RemoteAddr, ":")[0]
		} else if affinity.Type == "cookie" && affinity.CookieName != "" {
			if c, err := req.Cookie(affinity.CookieName); err == nil {
				key = c.Value
			}
		}

		if key != "" {
			// Hash key to backend index
			var hash uint32
			for i := 0; i < len(key); i++ {
				hash = hash*31 + uint32(key[i])
			}
			return aliveBackends[uint64(hash)%uint64(len(aliveBackends))]
		}
	}

	// Algorithms
	switch strings.ToLower(algo) {
	case "random":
		idx := time.Now().UnixNano() % int64(len(aliveBackends))
		return aliveBackends[idx]
	case "weighted":
		// Simplified weighted: total weight sum and pick
		totalWeight := 0
		for _, b := range aliveBackends {
			weight := b.Weight
			if weight <= 0 {
				weight = 100
			}
			totalWeight += weight
		}
		if totalWeight <= 0 {
			return aliveBackends[0]
		}
		r := time.Now().UnixNano() % int64(totalWeight)
		current := 0
		for _, b := range aliveBackends {
			weight := b.Weight
			if weight <= 0 {
				weight = 100
			}
			current += weight
			if r < int64(current) {
				return b
			}
		}
		return aliveBackends[0]
	default: // round_robin
		next := atomic.AddUint64(&p.current, 1)
		return aliveBackends[(next-1)%uint64(len(aliveBackends))]
	}
}

// GetNext returns the next available backend using round-robin (legacy support)
func (p *Pool) GetNext() *Backend {
	return p.GetNextWithAlgorithm("round_robin", nil, nil)
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
	healthCancels     []context.CancelFunc
	healthMu          sync.Mutex
	// Sprint 3 State
	rateLimitMu      sync.Mutex
	rateLimitBuckets map[string]*tokenBucket
	cbMu             sync.Mutex
	circuitStates    map[string]*cbState
	cacheMu          sync.Mutex
	cacheStore       map[string]cacheEntry
}

type tokenBucket struct {
	tokens float64
	last   time.Time
}

type cbState struct {
	failures  int
	lastError time.Time
	status    string // "closed", "open", "half-open"
}

type cacheEntry struct {
	response   []byte
	headers    http.Header
	expiration time.Time
}

// New creates a new proxy instance with backend URLs
func New(defaultBackends []string) (*Proxy, error) {
	pool, err := createBackendPool(defaultBackends)
	if err != nil {
		return nil, err
	}

	return &Proxy{
		defaultPool:      pool,
		LogChan:          make(chan AccessLog, 1000),
		rateLimitBuckets: make(map[string]*tokenBucket),
		circuitStates:    make(map[string]*cbState),
		cacheStore:       make(map[string]cacheEntry),
	}, nil
}

// ConfigRoute represents a route configuration from API
type ConfigRoute struct {
	Path           string                `json:"path"`
	Methods        []string              `json:"methods"`
	Priority       int                   `json:"priority"`
	Targets        []string              `json:"targets"`
	Source         *RouteSource          `json:"source,omitempty"`
	HealthCheck    *HealthCheckConfig    `json:"health_check,omitempty"`
	Rules          *RoutingRule          `json:"rules,omitempty"`
	Algorithm      string                `json:"algorithm,omitempty"`
	Weights        map[string]int        `json:"weights,omitempty"`
	Canary         *CanaryConfig         `json:"canary,omitempty"`
	Affinity       *AffinityConfig       `json:"affinity,omitempty"`
	Resilience     *ResilienceConfig     `json:"resilience,omitempty"`
	CircuitBreaker *CircuitBreakerConfig `json:"circuit_breaker,omitempty"`
	RateLimit      *RateLimitConfig      `json:"rate_limit,omitempty"`
	Auth           *AuthConfig           `json:"auth,omitempty"`
	Cache          *CacheConfig          `json:"cache,omitempty"`
	Headers        *HeadersConfig        `json:"headers,omitempty"`
}

type CanaryConfig struct {
	Weight  int      `json:"weight"` // 0-100
	Targets []string `json:"targets"`
}

type AffinityConfig struct {
	Type       string `json:"type"` // "none", "cookie", "client_ip"
	CookieName string `json:"cookie_name,omitempty"`
}

type ResilienceConfig struct {
	TimeoutMS  int   `json:"timeout_ms"`
	MaxRetries int   `json:"max_retries"`
	RetryOn    []int `json:"retry_on,omitempty"`
}

type CircuitBreakerConfig struct {
	ErrorThreshold   int `json:"error_threshold"`   // Number of failures to trip
	SuccessThreshold int `json:"success_threshold"` // Number of successes to reset
	TimeoutMS        int `json:"timeout_ms"`        // Time to stay open
}

type RateLimitConfig struct {
	RequestsPerSecond float64 `json:"requests_per_second"`
	Burst             int     `json:"burst"`
}

type AuthConfig struct {
	Type string            `json:"type"` // "none", "api_key", "basic"
	Keys map[string]string `json:"keys,omitempty"`
}

type CacheConfig struct {
	Enabled bool `json:"enabled"`
	TTL     int  `json:"ttl_seconds"`
}

type HeadersConfig struct {
	AddRequest     map[string]string `json:"add_request,omitempty"`
	RemoveRequest  []string          `json:"remove_request,omitempty"`
	AddResponse    map[string]string `json:"add_response,omitempty"`
	RemoveResponse []string          `json:"remove_response,omitempty"`
}

// RoutingRule defines advanced matching conditions
type RoutingRule struct {
	Conditions []Condition `json:"conditions"`
	MatchLogic string      `json:"match_logic"` // "AND" or "OR"
}

// Condition represents a single matching requirement
type Condition struct {
	Type     string `json:"type"`     // "header", "query", "host"
	Key      string `json:"key"`      // e.g. "X-User-Type"
	Operator string `json:"operator"` // "equals", "contains", "regex", "exists", "not-exists"
	Value    string `json:"value"`
}

// HealthCheckConfig defines per-route health check settings
type HealthCheckConfig struct {
	Path               string `json:"path"`
	Interval           int    `json:"interval"`
	Timeout            int    `json:"timeout"`
	HealthyThreshold   int    `json:"healthy_threshold"`
	UnhealthyThreshold int    `json:"unhealthy_threshold"`
}

// RouteSource identifies the origin of a route
type RouteSource struct {
	Type         string `json:"type"` // "manual" or "template"
	TemplateID   string `json:"template_id,omitempty"`
	DeploymentID string `json:"deployment_id,omitempty"`
}

// UpdateRoutes atomically updates the routing table
func (p *Proxy) UpdateRoutes(configRoutes []ConfigRoute) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	var newRoutes []Route
	for _, cr := range configRoutes {
		pool, err := createBackendPoolWithWeights(cr.Targets, cr.Weights)
		if err != nil {
			return err
		}
		var canaryPool *Pool
		if cr.Canary != nil && len(cr.Canary.Targets) > 0 {
			canaryPool, err = createBackendPool(cr.Canary.Targets)
			if err != nil {
				return err
			}
		}

		newRoutes = append(newRoutes, Route{
			Path:           cr.Path,
			Methods:        cr.Methods,
			Priority:       cr.Priority,
			Pool:           pool,
			CanaryPool:     canaryPool,
			Source:         cr.Source,
			HealthCheck:    cr.HealthCheck,
			Rules:          cr.Rules,
			Algorithm:      cr.Algorithm,
			Canary:         cr.Canary,
			Affinity:       cr.Affinity,
			Resilience:     cr.Resilience,
			CircuitBreaker: cr.CircuitBreaker,
			RateLimit:      cr.RateLimit,
			Auth:           cr.Auth,
			Cache:          cr.Cache,
			Headers:        cr.Headers,
		})
	}

	// Sort routes by priority (ascending)
	sort.Slice(newRoutes, func(i, j int) bool {
		return newRoutes[i].Priority < newRoutes[j].Priority
	})

	p.routes = newRoutes
	fmt.Printf("🔄 Updated L7 Routes: %d rules active\n", len(newRoutes))

	// Restart health checks
	p.restartHealthChecks()
	return nil
}

func (p *Proxy) restartHealthChecks() {
	p.healthMu.Lock()
	defer p.healthMu.Unlock()

	// Stop existing checks
	for _, cancel := range p.healthCancels {
		cancel()
	}
	p.healthCancels = nil

	// Start new checks for each route that has health check config
	for _, r := range p.routes {
		if r.HealthCheck == nil {
			continue
		}

		ctx, cancel := context.WithCancel(context.Background())
		p.healthCancels = append(p.healthCancels, cancel)
		go p.runRouteHealthCheck(ctx, r)
	}

	// Also handle default pool if any
	if p.defaultPool != nil {
		ctx, cancel := context.WithCancel(context.Background())
		p.healthCancels = append(p.healthCancels, cancel)
		go p.runDefaultHealthCheck(ctx)
	}
}

func (p *Proxy) runRouteHealthCheck(ctx context.Context, r Route) {
	config := r.HealthCheck
	interval := time.Duration(config.Interval) * time.Second
	if interval < 1*time.Second {
		interval = 10 * time.Second
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for _, b := range r.Pool.backends {
				// Use the route-specific health check path if it's an absolute URL or just a path
				checkURL := *b.URL
				if config.Path != "" {
					if strings.HasPrefix(config.Path, "http") {
						u, err := url.Parse(config.Path)
						if err == nil {
							checkURL = *u
						}
					} else {
						checkURL.Path = config.Path
					}
				}

				alive := checkBackend(&checkURL, config.Timeout)
				if alive != b.Alive {
					b.Alive = alive
					status := "UP"
					if !alive {
						status = "DOWN"
					}
					fmt.Printf("🩺 Health Check (%s): %s is %s\n", r.Path, b.URL.String(), status)
				}
			}
		}
	}
}

func (p *Proxy) runDefaultHealthCheck(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.mu.RLock()
			pool := p.defaultPool
			p.mu.RUnlock()

			if pool == nil {
				return
			}

			for _, b := range pool.backends {
				alive := checkBackend(b.URL, 2)
				if alive != b.Alive {
					b.Alive = alive
					fmt.Printf("🩺 Default Health Check: %s is %v\n", b.URL.String(), alive)
				}
			}
		}
	}
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
			Path:           r.Path,
			Methods:        r.Methods,
			Priority:       r.Priority,
			Targets:        targets,
			Source:         r.Source,
			HealthCheck:    r.HealthCheck,
			Rules:          r.Rules,
			Algorithm:      r.Algorithm,
			Weights:        getWeightsFromPool(r.Pool),
			Canary:         r.Canary,
			Affinity:       r.Affinity,
			Resilience:     r.Resilience,
			CircuitBreaker: r.CircuitBreaker,
			RateLimit:      r.RateLimit,
			Auth:           r.Auth,
			Cache:          r.Cache,
			Headers:        r.Headers,
		})
	}
	return current
}

func getWeightsFromPool(p *Pool) map[string]int {
	if p == nil {
		return nil
	}
	weights := make(map[string]int)
	for _, b := range p.backends {
		weights[b.URL.String()] = b.Weight
	}
	return weights
}

func createBackendPool(urls []string) (*Pool, error) {
	return createBackendPoolWithWeights(urls, nil)
}

func createBackendPoolWithWeights(urls []string, weights map[string]int) (*Pool, error) {
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

		weight := 100
		if weights != nil {
			if w, ok := weights[b]; ok {
				weight = w
			}
		}

		backends = append(backends, &Backend{
			URL:    target,
			Alive:  true,
			Proxy:  rp,
			Weight: weight,
		})
	}
	return &Pool{backends: backends}, nil
}

func (p *Proxy) applyRequestHeaders(r *http.Request, config *HeadersConfig) {
	for k, v := range config.AddRequest {
		r.Header.Set(k, v)
	}
	for _, k := range config.RemoveRequest {
		r.Header.Del(k)
	}
}

func (p *Proxy) applyResponseHeaders(w http.ResponseWriter, config *HeadersConfig) {
	for k, v := range config.AddResponse {
		w.Header().Set(k, v)
	}
	for _, k := range config.RemoveResponse {
		w.Header().Del(k)
	}
}

func (p *Proxy) getCachedResponse(url string) (cacheEntry, bool) {
	p.cacheMu.Lock()
	defer p.cacheMu.Unlock()

	entry, ok := p.cacheStore[url]
	if !ok {
		return cacheEntry{}, false
	}

	if time.Now().After(entry.expiration) {
		delete(p.cacheStore, url)
		return cacheEntry{}, false
	}

	return entry, true
}

func (p *Proxy) setCachedResponse(url string, body []byte, headers http.Header, ttl int) {
	p.cacheMu.Lock()
	defer p.cacheMu.Unlock()

	p.cacheStore[url] = cacheEntry{
		response:   body,
		headers:    headers,
		expiration: time.Now().Add(time.Duration(ttl) * time.Second),
	}
}

// Start starts the proxy server
func (p *Proxy) Start(addr string) error {
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	mux.Handle("/", p)

	p.server = &http.Server{
		Addr:    addr,
		Handler: otelhttp.NewHandler(mux, "Proxy"),
	}

	// Start health check worker
	go p.startHealthCheckWorker()

	fmt.Printf("🚀 L7 Proxy started on %s\n", addr)
	return p.server.ListenAndServe()
}

func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	atomic.AddUint64(&p.TotalRequests, 1)
	atomic.AddInt32(&p.ActiveConnections, 1)
	defer atomic.AddInt32(&p.ActiveConnections, -1)

	sw := &statusResponseWriter{ResponseWriter: w, header: w.Header(), status: http.StatusOK, capture: false}

	p.mu.RLock()
	routes := p.routes
	defaultPool := p.defaultPool
	p.mu.RUnlock()

	var matchedBackend *Backend
	var activeRoute *Route

	// 1. Match Route
	for _, route := range routes {
		if route.Matches(r) {
			activeRoute = &route

			// A. Auth
			if !route.Authenticate(r) {
				sw.status = http.StatusUnauthorized
				http.Error(sw, "Unauthorized", sw.status)
				return
			}

			// B. Rate Limit
			if route.RateLimit != nil {
				if !p.isRateAllowed(route.Path, route.RateLimit) {
					sw.status = http.StatusTooManyRequests
					http.Error(sw, "Rate limit exceeded", sw.status)
					return
				}
			}

			// C. Circuit Breaker
			if route.CircuitBreaker != nil {
				if !p.isCircuitClosed(route.Path, route.CircuitBreaker) {
					sw.status = http.StatusServiceUnavailable
					http.Error(sw, "Circuit breaker tripped", sw.status)
					return
				}
			}

			// D. Headers (Request)
			if route.Headers != nil {
				p.applyRequestHeaders(r, route.Headers)
			}

			// E. Caching (Read)
			if route.Cache != nil && route.Cache.Enabled {
				if entry, ok := p.getCachedResponse(r.URL.String()); ok {
					for k, v := range entry.headers {
						sw.Header()[k] = v
					}
					sw.Header().Set("X-GP-Cache", "HIT")
					sw.Write(entry.response)
					return
				}
				sw.Header().Set("X-GP-Cache", "MISS")
				sw.capture = true
			}

			pool := route.Pool
			if route.Canary != nil && route.CanaryPool != nil {
				roll := time.Now().UnixNano() % 100
				if roll < int64(route.Canary.Weight) {
					pool = route.CanaryPool
				}
			}

			matchedBackend = pool.GetNextWithAlgorithm(route.Algorithm, route.Affinity, r)
			break
		}
	}

	if matchedBackend == nil && defaultPool != nil {
		matchedBackend = defaultPool.GetNext()
	}

	if matchedBackend != nil {
		maxRetries := 0
		timeout := 30 * time.Second
		if activeRoute != nil && activeRoute.Resilience != nil {
			maxRetries = activeRoute.Resilience.MaxRetries
			if activeRoute.Resilience.TimeoutMS > 0 {
				timeout = time.Duration(activeRoute.Resilience.TimeoutMS) * time.Millisecond
			}
		}

		for i := 0; i <= maxRetries; i++ {
			ctx, cancel := context.WithTimeout(r.Context(), timeout)
			reqWithCtx := r.WithContext(ctx)

			matchedBackend.Proxy.ServeHTTP(sw, reqWithCtx)
			cancel()

			if sw.status < 500 {
				if activeRoute != nil && activeRoute.CircuitBreaker != nil {
					p.recordSuccess(activeRoute.Path, activeRoute.CircuitBreaker)
				}
				break
			}

			if activeRoute != nil && activeRoute.CircuitBreaker != nil {
				p.recordFailure(activeRoute.Path, activeRoute.CircuitBreaker)
			}

			if i < maxRetries {
				fmt.Printf("🔄 Retrying %s (attempt %d/%d)\n", matchedBackend.URL.String(), i+1, maxRetries)
			}
		}
	} else {
		sw.status = http.StatusServiceUnavailable
		http.Error(sw, "No healthy backends available", sw.status)
	}

	// F. Headers (Response)
	if activeRoute != nil && activeRoute.Headers != nil {
		p.applyResponseHeaders(sw, activeRoute.Headers)
	}

	// G. Caching (Write)
	if activeRoute != nil && activeRoute.Cache != nil && activeRoute.Cache.Enabled && sw.status == http.StatusOK {
		p.setCachedResponse(r.URL.String(), sw.body.Bytes(), sw.Header(), activeRoute.Cache.TTL)
	}

	// Logging
	p.LogChan <- AccessLog{
		Timestamp:  start,
		Method:     r.Method,
		Path:       r.URL.Path,
		Status:     sw.status,
		DurationMs: time.Since(start).Milliseconds(),
		ClientIP:   r.RemoteAddr,
		Backend: func() string {
			if matchedBackend != nil {
				return matchedBackend.URL.String()
			}
			return ""
		}(),
	}
}


func (p *Proxy) startHealthCheckWorker() {
	p.restartHealthChecks()
}

func checkBackend(target *url.URL, timeoutSec int) bool {
	if timeoutSec <= 0 {
		timeoutSec = 2
	}
	client := http.Client{
		Timeout: time.Duration(timeoutSec) * time.Second,
	}
	resp, err := client.Head(target.String())
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode >= 200 && resp.StatusCode < 500
}

func (p *Proxy) isRateAllowed(path string, config *RateLimitConfig) bool {
	p.rateLimitMu.Lock()
	defer p.rateLimitMu.Unlock()

	bucket, ok := p.rateLimitBuckets[path]
	if !ok {
		bucket = &tokenBucket{tokens: float64(config.Burst), last: time.Now()}
		p.rateLimitBuckets[path] = bucket
	}

	now := time.Now()
	elapsed := now.Sub(bucket.last).Seconds()
	bucket.tokens += elapsed * config.RequestsPerSecond
	if bucket.tokens > float64(config.Burst) {
		bucket.tokens = float64(config.Burst)
	}
	bucket.last = now

	if bucket.tokens >= 1 {
		bucket.tokens--
		return true
	}
	return false
}

func (p *Proxy) isCircuitClosed(path string, config *CircuitBreakerConfig) bool {
	p.cbMu.Lock()
	defer p.cbMu.Unlock()

	state, ok := p.circuitStates[path]
	if !ok {
		state = &cbState{status: "closed"}
		p.circuitStates[path] = state
	}

	if state.status == "open" {
		if time.Since(state.lastError) > time.Duration(config.TimeoutMS)*time.Millisecond {
			state.status = "half-open"
			return true
		}
		return false
	}

	return true
}

func (p *Proxy) recordFailure(path string, config *CircuitBreakerConfig) {
	p.cbMu.Lock()
	defer p.cbMu.Unlock()

	state, ok := p.circuitStates[path]
	if !ok {
		return
	}

	state.failures++
	state.lastError = time.Now()
	if state.failures >= config.ErrorThreshold {
		state.status = "open"
		fmt.Printf("🚨 Circuit Breaker TRIPPED for %s\n", path)
	}
}

func (p *Proxy) recordSuccess(path string, config *CircuitBreakerConfig) {
	p.cbMu.Lock()
	defer p.cbMu.Unlock()

	state, ok := p.circuitStates[path]
	if !ok {
		return
	}

	if state.status == "half-open" {
		state.failures = 0
		state.status = "closed"
		fmt.Printf("✅ Circuit Breaker RESET for %s\n", path)
	} else if state.status == "closed" {
		state.failures = 0
	}
}

// Shutdown gracefully shuts down the proxy
func (p *Proxy) Shutdown(ctx context.Context) error {
	if p.server != nil {
		fmt.Println("🛑 Shutting down L7 Proxy...")
		return p.server.Shutdown(ctx)
	}
	return nil
}
