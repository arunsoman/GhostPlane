# Sprint 13: Template Intelligence

## Overview
GhostPlane's "Template Gallery" provides one-click deployment for common, high-impact networking and security scenarios. This sprint focuses on building the reference architecture for 10 real-life templates and the UI engine to deploy them.

# Sprint 13: Template Intelligence - Detailed Implementation Plan

## Sprint Overview
**Duration**: Week 25-26 (2 weeks)  
**Team Focus**: Full-stack (Backend 3, Frontend 3, DevOps 1, QA 1)  
**Priority**: High - Critical for user adoption and reducing time-to-value  
**Dependencies**: Sprints 1-12 (Core platform must be functional)

---

## 🎯 Sprint Goals

### Primary Objectives
1. Build template engine for one-click deployment scenarios
2. Create 10 production-ready reference templates
3. Implement interactive Solutions Gallery UI
4. Enable template customization and validation
5. Integrate traffic simulation for template verification

### Success Metrics
- All 10 templates deploy successfully in < 30 seconds
- Template customization wizard completes in < 2 minutes
- 90%+ user satisfaction on template deployment UX
- Zero configuration errors from template deployment
- Traffic simulator validates 100% of deployed templates

---

## 📋 Detailed Task Breakdown

## Phase 1: Template Engine Architecture (Days 1-4)

### Task 1.1: Template Schema Definition
**Owner**: Backend Lead  
**Duration**: 1 day  
**Priority**: P0

**Deliverables**:
- [ ] Define JSON/YAML schema for template metadata
- [ ] Create template structure specification
- [ ] Implement schema validation library
- [ ] Document template authoring guidelines

**Template Schema Structure**:
```yaml
# Example: templates/api-gateway.yaml
metadata:
  id: "api-gateway-v1"
  name: "High-Traffic API Gateway"
  category: "api-management"
  difficulty: "intermediate"
  description: "Production-ready API gateway with WAF and rate limiting"
  icon: "🚀"
  tags: ["api", "waf", "rate-limiting", "l7"]
  author: "GhostPlane Team"
  version: "1.0.0"
  
architecture:
  layers: ["l7", "waf", "auth"]
  components:
    - "HTTP/2 Proxy"
    - "JWT Validator"
    - "Rate Limiter"
    - "WAF Engine"
  
  diagram: |
    Client → Rate Limiter → JWT Auth → WAF → Backend Pool
  
parameters:
  - name: "backend_ips"
    type: "ip_list"
    required: true
    description: "Backend server IP addresses"
    default: []
    validation: "ipv4"
    
  - name: "rate_limit"
    type: "integer"
    required: false
    default: 1000
    min: 100
    max: 100000
    description: "Requests per second per IP"
    
  - name: "jwt_secret"
    type: "string"
    required: true
    secret: true
    description: "JWT signing secret"
    validation: "min_length:32"

configuration:
  l7_proxy:
    listeners:
      - port: 443
        protocol: "https"
        tls:
          cert_path: "/etc/ghostplane/certs/server.crt"
          key_path: "/etc/ghostplane/certs/server.key"
          
    routes:
      - path: "/api/*"
        backend_pool: "api-servers"
        timeout: "30s"
        retries: 3
        
    middleware:
      - type: "rate_limit"
        config:
          requests_per_second: "{{ .rate_limit }}"
          burst: 100
          
      - type: "jwt_auth"
        config:
          secret: "{{ .jwt_secret }}"
          header: "Authorization"
          
      - type: "waf"
        config:
          ruleset: "owasp-crs"
          blocking_mode: true
          
  backend_pools:
    - name: "api-servers"
      servers: "{{ .backend_ips }}"
      health_check:
        path: "/health"
        interval: "5s"
        timeout: "2s"
        healthy_threshold: 2
        unhealthy_threshold: 3

verification:
  test_requests:
    - method: "GET"
      path: "/api/users"
      headers:
        Authorization: "Bearer eyJ..."
      expected_status: 200
      
    - method: "POST"
      path: "/api/users"
      body: '{"name": "test"}'
      expected_status: 401  # No JWT
      
  metrics_to_check:
    - "rate_limit_triggered > 0"
    - "waf_blocks == 0"
    - "backend_healthy_count == len(backend_ips)"
```

**Implementation Files**:
- `pkg/templates/schema.go` - Schema validation
- `pkg/templates/types.go` - Go type definitions
- `templates/*.yaml` - Individual template files

---

### Task 1.2: Template Repository Structure
**Owner**: Backend Engineer 1  
**Duration**: 1 day  
**Priority**: P0

**Deliverables**:
- [ ] Create template file organization structure
- [ ] Implement template loader with hot-reload
- [ ] Build template versioning system
- [ ] Add template dependency resolution

**Directory Structure**:
```
templates/
├── api-management/
│   ├── api-gateway.yaml
│   └── graphql-gateway.yaml
├── deployment/
│   ├── blue-green.yaml
│   └── canary.yaml
├── security/
│   ├── ddos-scrubbing.yaml
│   └── waf-hardening.yaml
├── database/
│   └── read-replica-proxy.yaml
├── multimedia/
│   └── udp-streaming.yaml
├── microservices/
│   └── service-mesh.yaml
├── multi-cloud/
│   └── global-ingress.yaml
├── cdn/
│   └── static-asset-edge.yaml
└── _library/
    ├── common-waf-rules.yaml
    ├── health-check-defaults.yaml
    └── tls-profiles.yaml
```

**Code Implementation**:
```go
// pkg/templates/repository.go
package templates

type Repository struct {
    basePath string
    templates map[string]*Template
    mu sync.RWMutex
}

func NewRepository(basePath string) (*Repository, error) {
    repo := &Repository{
        basePath: basePath,
        templates: make(map[string]*Template),
    }
    
    if err := repo.loadAll(); err != nil {
        return nil, err
    }
    
    repo.watchForChanges()
    return repo, nil
}

func (r *Repository) Get(id string) (*Template, error) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    
    template, exists := r.templates[id]
    if !exists {
        return nil, ErrTemplateNotFound
    }
    
    return template, nil
}
```

---

### Task 1.3: Template Rendering Engine
**Owner**: Backend Engineer 2  
**Duration**: 2 days  
**Priority**: P0

**Deliverables**:
- [ ] Implement Go template rendering with validation
- [ ] Build parameter substitution engine
- [ ] Create template merge logic for inheritances
- [ ] Add dry-run mode for template preview

**Code Implementation**:
```go
// pkg/templates/renderer.go
package templates

import (
    "bytes"
    "text/template"
)

type Renderer struct {
    funcMap template.FuncMap
}

func NewRenderer() *Renderer {
    return &Renderer{
        funcMap: template.FuncMap{
            "default": defaultValue,
            "required": requireValue,
            "validate": validateValue,
            "range_ip": generateIPRange,
        },
    }
}

func (r *Renderer) Render(tmpl *Template, params map[string]interface{}) (*Config, error) {
    // Validate all required parameters
    if err := r.validateParams(tmpl, params); err != nil {
        return nil, fmt.Errorf("parameter validation failed: %w", err)
    }
    
    // Render template with parameters
    rendered, err := r.renderYAML(tmpl.Configuration, params)
    if err != nil {
        return nil, err
    }
    
    // Parse rendered YAML into Config
    config, err := ParseConfig(rendered)
    if err != nil {
        return nil, err
    }
    
    // Apply post-processing
    if err := r.postProcess(config, tmpl); err != nil {
        return nil, err
    }
    
    return config, nil
}

func (r *Renderer) DryRun(tmpl *Template, params map[string]interface{}) (*PreviewResult, error) {
    config, err := r.Render(tmpl, params)
    if err != nil {
        return nil, err
    }
    
    return &PreviewResult{
        Config: config,
        Warnings: r.analyzeConfig(config),
        EstimatedResources: r.estimateResources(config),
    }, nil
}
```

---

### Task 1.4: REST API Endpoints
**Owner**: Backend Engineer 3  
**Duration**: 2 days  
**Priority**: P0

**Deliverables**:
- [ ] Create `/api/v1/templates` endpoints
- [ ] Implement template parameter validation API
- [ ] Build template deployment API
- [ ] Add template status tracking

**API Specification**:
```go
// API Endpoints

// GET /api/v1/templates
// Returns list of available templates with metadata
type ListTemplatesResponse struct {
    Templates []TemplateSummary `json:"templates"`
    Categories []string `json:"categories"`
}

// GET /api/v1/templates/:id
// Returns full template details
type GetTemplateResponse struct {
    Template *Template `json:"template"`
    Examples []ParameterExample `json:"examples"`
}

// POST /api/v1/templates/:id/validate
// Validates parameters before deployment
type ValidateRequest struct {
    Parameters map[string]interface{} `json:"parameters"`
}

type ValidateResponse struct {
    Valid bool `json:"valid"`
    Errors []ValidationError `json:"errors,omitempty"`
    Preview *PreviewResult `json:"preview,omitempty"`
}

// POST /api/v1/templates/:id/deploy
// Deploys template with parameters
type DeployRequest struct {
    Parameters map[string]interface{} `json:"parameters"`
    DryRun bool `json:"dry_run"`
}

type DeployResponse struct {
    DeploymentID string `json:"deployment_id"`
    Status string `json:"status"`
    Config *Config `json:"config"`
    VerificationTests []TestResult `json:"verification_tests,omitempty"`
}

// GET /api/v1/deployments/:id/status
// Check deployment status
type DeploymentStatus struct {
    ID string `json:"id"`
    TemplateID string `json:"template_id"`
    Status string `json:"status"` // pending, deploying, active, failed
    Progress int `json:"progress"` // 0-100
    Errors []string `json:"errors,omitempty"`
    CreatedAt time.Time `json:"created_at"`
    CompletedAt *time.Time `json:"completed_at,omitempty"`
}
```

**Implementation**:
```go
// pkg/api/templates.go
package api

func (s *Server) RegisterTemplateRoutes(r *gin.RouterGroup) {
    templates := r.Group("/templates")
    {
        templates.GET("", s.listTemplates)
        templates.GET("/:id", s.getTemplate)
        templates.POST("/:id/validate", s.validateTemplate)
        templates.POST("/:id/deploy", s.deployTemplate)
    }
    
    deployments := r.Group("/deployments")
    {
        deployments.GET("/:id/status", s.getDeploymentStatus)
        deployments.DELETE("/:id", s.deleteDeployment)
    }
}

func (s *Server) deployTemplate(c *gin.Context) {
    var req DeployRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    templateID := c.Param("id")
    template, err := s.templates.Get(templateID)
    if err != nil {
        c.JSON(404, gin.H{"error": "template not found"})
        return
    }
    
    // Render template
    config, err := s.renderer.Render(template, req.Parameters)
    if err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    // Create deployment
    deployment := s.deployer.Create(templateID, config)
    
    if !req.DryRun {
        // Apply configuration asynchronously
        go s.deployer.Apply(deployment)
    }
    
    c.JSON(200, DeployResponse{
        DeploymentID: deployment.ID,
        Status: deployment.Status,
        Config: config,
    })
}
```

---

## Phase 2: Template Implementations (Days 5-7)

### Task 2.1: Core Templates (1-5)
**Owner**: Backend Engineer 1 & 2  
**Duration**: 2 days  
**Priority**: P0

**Templates to Implement**:

#### Template 1: High-Traffic API Gateway
```yaml
# templates/api-management/api-gateway.yaml
metadata:
  id: "api-gateway-v1"
  name: "High-Traffic API Gateway"
  category: "api-management"
  description: "Production-ready API gateway with JWT auth, rate limiting, and WAF"
  icon: "🚀"
  difficulty: "intermediate"

parameters:
  - name: "backend_ips"
    type: "ip_list"
    required: true
  - name: "rate_limit_rps"
    type: "integer"
    default: 1000
  - name: "jwt_secret"
    type: "string"
    required: true
    secret: true

configuration:
  # Full config as shown in Task 1.1
```

#### Template 2: Blue-Green Deployment
```yaml
# templates/deployment/blue-green.yaml
metadata:
  id: "blue-green-v1"
  name: "Blue-Green Deployment"
  category: "deployment"
  description: "Zero-downtime deployments with instant traffic switching"
  icon: "🔵🟢"

parameters:
  - name: "blue_backends"
    type: "ip_list"
    required: true
    description: "Production backend servers"
  - name: "green_backends"
    type: "ip_list"
    required: true
    description: "Staging/new version backend servers"
  - name: "active_environment"
    type: "enum"
    options: ["blue", "green"]
    default: "blue"
  - name: "switch_method"
    type: "enum"
    options: ["instant", "gradual"]
    default: "instant"
  - name: "gradual_percentage"
    type: "integer"
    default: 10
    min: 1
    max: 100

configuration:
  l4_balancing:
    algorithm: "weighted_round_robin"
    pools:
      - name: "blue"
        weight: "{{ if eq .active_environment 'blue' }}100{{ else }}0{{ end }}"
        servers: "{{ .blue_backends }}"
      - name: "green"
        weight: "{{ if eq .active_environment 'green' }}100{{ else }}0{{ end }}"
        servers: "{{ .green_backends }}"
        
  automation:
    - trigger: "health_check_all_green_healthy"
      action: "enable_gradual_switch"
      config:
        increment: "{{ .gradual_percentage }}"
        interval: "30s"
```

#### Template 3: DDoS Scrubbing Center
```yaml
# templates/security/ddos-scrubbing.yaml
metadata:
  id: "ddos-scrubbing-v1"
  name: "DDoS Scrubbing Center"
  category: "security"
  description: "High-volume attack mitigation with XDP/eBPF"
  icon: "🛡️"

parameters:
  - name: "protected_ips"
    type: "ip_list"
    required: true
  - name: "syn_threshold"
    type: "integer"
    default: 1000
    description: "SYN packets per second before triggering protection"
  - name: "auto_blacklist"
    type: "boolean"
    default: true
  - name: "whitelist_ips"
    type: "ip_list"
    required: false

configuration:
  xdp_filters:
    - type: "syn_flood_protection"
      config:
        threshold: "{{ .syn_threshold }}"
        cookie_mode: true
        
    - type: "rate_limit_per_ip"
      config:
        packets_per_second: 10000
        burst: 50000
        
    - type: "auto_blacklist"
      enabled: "{{ .auto_blacklist }}"
      config:
        threshold: 50000
        duration: "300s"
        whitelist: "{{ .whitelist_ips }}"
        
  monitoring:
    metrics:
      - "xdp_drop_count"
      - "syn_cookies_sent"
      - "blacklisted_ips"
    alerts:
      - condition: "xdp_drop_count > 100000"
        severity: "critical"
```

#### Template 4: Canary Release (10%)
```yaml
# templates/deployment/canary.yaml
metadata:
  id: "canary-release-v1"
  name: "Canary Release (10%)"
  category: "deployment"
  description: "Test new features on a subset of users"
  icon: "🐤"

parameters:
  - name: "stable_backends"
    type: "ip_list"
    required: true
  - name: "canary_backends"
    type: "ip_list"
    required: true
  - name: "canary_percentage"
    type: "integer"
    default: 10
    min: 1
    max: 50
  - name: "routing_strategy"
    type: "enum"
    options: ["random", "header", "cookie"]
    default: "random"
  - name: "canary_header"
    type: "string"
    default: "X-Canary-User"

configuration:
  l7_routing:
    - condition: "{{ if eq .routing_strategy 'header' }}header['{{ .canary_header }}'] == 'true'{{ else }}random() < {{ .canary_percentage }}{{ end }}"
      backend_pool: "canary"
    - condition: "default"
      backend_pool: "stable"
      
  backend_pools:
    - name: "stable"
      weight: "{{ sub 100 .canary_percentage }}"
      servers: "{{ .stable_backends }}"
    - name: "canary"
      weight: "{{ .canary_percentage }}"
      servers: "{{ .canary_backends }}"
      
  observability:
    comparative_metrics:
      - "error_rate_diff"
      - "latency_p99_diff"
      - "success_rate_diff"
```

#### Template 5: UDP Streaming Optimized
```yaml
# templates/multimedia/udp-streaming.yaml
metadata:
  id: "udp-streaming-v1"
  name: "UDP Streaming Optimized"
  category: "multimedia"
  description: "Low-latency gaming/VoIP with DSR"
  icon: "🎮"

parameters:
  - name: "game_servers"
    type: "ip_list"
    required: true
  - name: "port"
    type: "integer"
    default: 7777
  - name: "enable_dsr"
    type: "boolean"
    default: true

configuration:
  l4_balancing:
    protocol: "udp"
    port: "{{ .port }}"
    algorithm: "maglev"
    dsr_enabled: "{{ .enable_dsr }}"
    
  backend_pools:
    - name: "game-servers"
      servers: "{{ .game_servers }}"
      health_check:
        type: "udp_ping"
        interval: "1s"
        
  performance:
    zero_copy: true
    numa_aware: true
    cpu_affinity: true
```

---

### Task 2.2: Advanced Templates (6-10)
**Owner**: Backend Engineer 2 & 3  
**Duration**: 1.5 days  
**Priority**: P1

**Templates to Implement**:

#### Template 6: Legacy WAF Hardening
```yaml
# templates/security/waf-hardening.yaml
metadata:
  id: "waf-hardening-v1"
  name: "Legacy WAF Hardening"
  category: "security"
  description: "Protect legacy apps with strict WAF rules"
  icon: "🔒"

parameters:
  - name: "legacy_backends"
    type: "ip_list"
    required: true
  - name: "allowed_methods"
    type: "string_list"
    default: ["GET", "POST"]
  - name: "block_unknown_extensions"
    type: "boolean"
    default: true

configuration:
  waf:
    mode: "blocking"
    rulesets:
      - "owasp-crs-strict"
      - "legacy-protocol-protection"
    custom_rules:
      - "block_methods NOT IN {{ .allowed_methods }}"
      - "block_extension NOT IN ['.php', '.html', '.css', '.js']"
```

#### Template 7: Microservices Service Mesh
```yaml
# templates/microservices/service-mesh.yaml
metadata:
  id: "service-mesh-v1"
  name: "Microservices Service Mesh"
  category: "microservices"
  description: "Internal traffic management with tracing"
  icon: "🕸️"

parameters:
  - name: "services"
    type: "service_list"
    required: true
    # Example: [{"name": "auth", "port": 8080, "backends": ["10.0.1.1", "10.0.1.2"]}]

configuration:
  l7_routing:
    tracing:
      enabled: true
      sampler: "probabilistic:0.1"
      propagation: "b3"
    retry_policy:
      attempts: 3
      per_try_timeout: "2s"
      retry_on: ["5xx", "timeout"]
    circuit_breaker:
      error_threshold: 50
      timeout: "30s"
```

#### Template 8: Database Read-Replica Proxy
```yaml
# templates/database/read-replica-proxy.yaml
metadata:
  id: "db-read-replica-v1"
  name: "Database Read-Replica Proxy"
  category: "database"
  description: "Scale database reads across replicas"
  icon: "🗄️"

parameters:
  - name: "db_type"
    type: "enum"
    options: ["postgresql", "mysql", "mongodb"]
    required: true
  - name: "read_replicas"
    type: "ip_list"
    required: true
  - name: "master_ip"
    type: "ip"
    required: false

configuration:
  l4_balancing:
    port: "{{ if eq .db_type 'postgresql' }}5432{{ else if eq .db_type 'mysql' }}3306{{ else }}27017{{ end }}"
    pools:
      - name: "read-replicas"
        servers: "{{ .read_replicas }}"
        algorithm: "least_connections"
```

#### Template 9: Global Multi-Cloud Ingress
```yaml
# templates/multi-cloud/global-ingress.yaml
metadata:
  id: "global-ingress-v1"
  name: "Global Multi-Cloud Ingress"
  category: "multi-cloud"
  description: "HA across AWS/GCP/Azure"
  icon: "🌍"

parameters:
  - name: "regions"
    type: "region_list"
    required: true
    # Example: [{"name": "us-east", "provider": "aws", "endpoints": ["1.2.3.4"]}, ...]

configuration:
  health_checks:
    interval: "2s"
    timeout: "1s"
    healthy_threshold: 2
    unhealthy_threshold: 2
  failover:
    strategy: "priority"
    priority_order: "{{ .regions | map 'name' }}"
```

#### Template 10: Static Asset Edge Proxy
```yaml
# templates/cdn/static-asset-edge.yaml
metadata:
  id: "static-asset-edge-v1"
  name: "Static Asset Edge Proxy"
  category: "cdn"
  description: "High-concurrency website delivery with caching"
  icon: "⚡"

parameters:
  - name: "origin_servers"
    type: "ip_list"
    required: true
  - name: "cache_ttl"
    type: "integer"
    default: 3600

configuration:
  l7_proxy:
    compression:
      enabled: true
      algorithms: ["gzip", "brotli"]
    cache:
      enabled: true
      ttl: "{{ .cache_ttl }}s"
      key: "uri"
    static_file_handling:
      extensions: [".js", ".css", ".png", ".jpg", ".woff2"]
```

---

## Phase 3: Solutions Gallery UI (Days 8-10)

### Task 3.1: Template Gallery Page
**Owner**: Frontend Engineer 1  
**Duration**: 2 days  
**Priority**: P0

**Deliverables**:
- [ ] Create `ui/app/templates/page.tsx` gallery view
- [ ] Build responsive template card grid
- [ ] Implement category filtering
- [ ] Add search functionality

---

### Task 3.3: Architecture Diagram Visualization
**Owner**: Frontend Engineer 3  
**Duration**: 1.5 days  
**Priority**: P1

**Deliverables**:
- [ ] Build interactive architecture diagrams using ReactFlow
- [ ] Create component library for network elements
- [ ] Implement real-time flow animations
- [ ] Add tooltips and element highlighting

**Component Implementation**:
```typescript
// ui/components/templates/ArchitectureDiagram.tsx
'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';

interface ArchitectureDiagramProps {
  template: {
    id: string;
    name: string;
    architecture: {
      layers: string[];
      components: string[];
      diagram: string;
    };
  };
}

export function ArchitectureDiagram({ template }: ArchitectureDiagramProps) {
  // Generate nodes based on template
  const initialNodes: Node[] = useMemo(() => {
    const nodes = [];
    
    // Example for API Gateway template
    if (template.id === 'api-gateway-v1') {
      nodes.push(
        {
          id: 'client',
          type: 'input',
          data: { label: '🌐 Client' },
          position: { x: 250, y: 0 },
          style: { background: '#3b82f6', color: 'white', border: '2px solid #2563eb' },
        },
        {
          id: 'rate-limiter',
          data: { label: '⏱️ Rate Limiter\n1000 RPS' },
          position: { x: 250, y: 100 },
          style: { background: '#f59e0b', color: 'white' },
        },
        {
          id: 'jwt-auth',
          data: { label: '🔐 JWT Validator' },
          position: { x: 250, y: 200 },
          style: { background: '#8b5cf6', color: 'white' },
        },
        {
          id: 'waf',
          data: { label: '🛡️ WAF Engine\nOWASP CRS' },
          position: { x: 250, y: 300 },
          style: { background: '#ef4444', color: 'white' },
        },
        {
          id: 'backend-pool',
          type: 'output',
          data: { label: '⚙️ Backend Pool' },
          position: { x: 250, y: 400 },
          style: { background: '#10b981', color: 'white', border: '2px solid #059669' },
        }
      );
    } else if (template.id === 'blue-green-v1') {
      nodes.push(
        {
          id: 'load-balancer',
          type: 'input',
          data: { label: '⚖️ Load Balancer' },
          position: { x: 250, y: 0 },
          style: { background: '#3b82f6', color: 'white' },
        },
        {
          id: 'blue-pool',
          type: 'output',
          data: { label: '🔵 Blue Environment\n(Production)' },
          position: { x: 100, y: 150 },
          style: { background: '#2563eb', color: 'white', borderWidth: 3 },
        },
        {
          id: 'green-pool',
          type: 'output',
          data: { label: '🟢 Green Environment\n(Staging)' },
          position: { x: 400, y: 150 },
          style: { background: '#16a34a', color: 'white', borderWidth: 1 },
        }
      );
    } else if (template.id === 'ddos-scrubbing-v1') {
      nodes.push(
        {
          id: 'internet',
          type: 'input',
          data: { label: '🌍 Internet Traffic' },
          position: { x: 250, y: 0 },
          style: { background: '#6b7280', color: 'white' },
        },
        {
          id: 'xdp-filter',
          data: { label: '⚡ XDP Filter\n(Kernel Level)' },
          position: { x: 250, y: 100 },
          style: { background: '#f59e0b', color: 'white' },
        },
        {
          id: 'syn-protection',
          data: { label: '🔒 SYN Flood Protection' },
          position: { x: 100, y: 200 },
          style: { background: '#ef4444', color: 'white' },
        },
        {
          id: 'rate-limit',
          data: { label: '⏱️ Rate Limiter' },
          position: { x: 250, y: 200 },
          style: { background: '#f59e0b', color: 'white' },
        },
        {
          id: 'blacklist',
          data: { label: '🚫 Auto Blacklist' },
          position: { x: 400, y: 200 },
          style: { background: '#7c3aed', color: 'white' },
        },
        {
          id: 'clean-traffic',
          type: 'output',
          data: { label: '✅ Clean Traffic → Backend' },
          position: { x: 250, y: 350 },
          style: { background: '#10b981', color: 'white' },
        },
        {
          id: 'dropped',
          type: 'output',
          data: { label: '❌ Dropped Packets' },
          position: { x: 500, y: 100 },
          style: { background: '#dc2626', color: 'white' },
        }
      );
    }
    
    return nodes;
  }, [template.id]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges = [];
    
    if (template.id === 'api-gateway-v1') {
      edges.push(
        { id: 'e1', source: 'client', target: 'rate-limiter', animated: true },
        { id: 'e2', source: 'rate-limiter', target: 'jwt-auth', animated: true },
        { id: 'e3', source: 'jwt-auth', target: 'waf', animated: true },
        { id: 'e4', source: 'waf', target: 'backend-pool', animated: true, style: { stroke: '#10b981', strokeWidth: 3 } }
      );
    } else if (template.id === 'blue-green-v1') {
      edges.push(
        { 
          id: 'e1', 
          source: 'load-balancer', 
          target: 'blue-pool', 
          animated: true,
          label: '100%',
          style: { stroke: '#2563eb', strokeWidth: 4 }
        },
        { 
          id: 'e2', 
          source: 'load-balancer', 
          target: 'green-pool',
          label: '0%',
          style: { stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5,5' }
        }
      );
    } else if (template.id === 'ddos-scrubbing-v1') {
      edges.push(
        { id: 'e1', source: 'internet', target: 'xdp-filter', animated: true },
        { id: 'e2', source: 'xdp-filter', target: 'syn-protection' },
        { id: 'e3', source: 'xdp-filter', target: 'rate-limit' },
        { id: 'e4', source: 'xdp-filter', target: 'blacklist' },
        { id: 'e5', source: 'syn-protection', target: 'clean-traffic', style: { stroke: '#10b981' } },
        { id: 'e6', source: 'rate-limit', target: 'clean-traffic', style: { stroke: '#10b981' } },
        { id: 'e7', source: 'blacklist', target: 'clean-traffic', style: { stroke: '#10b981' } },
        { id: 'e8', source: 'xdp-filter', target: 'dropped', style: { stroke: '#dc2626', strokeDasharray: '5,5' }, label: 'Malicious' }
      );
    }
    
    return edges;
  }, [template.id]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Architecture Flow</h3>
      <div className="h-[500px] border-2 border-gray-200 rounded-lg bg-gray-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span className="text-sm">Entry Point</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-sm">Processing Layer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span className="text-sm">Backend/Output</span>
        </div>
      </div>
    </Card>
  );
}
```

---

### Task 3.4: Deployment Wizard Component
**Owner**: Frontend Engineer 1 & 2  
**Duration**: 2 days  
**Priority**: P0

**Deliverables**:
- [ ] Build multi-step wizard with progress indicator
- [ ] Create dynamic form generation from template parameters
- [ ] Implement real-time validation
- [ ] Add configuration preview before deployment

**Component Implementation**:
```typescript
// ui/components/templates/DeploymentWizard.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface DeploymentWizardProps {
  template: any;
  onCancel: () => void;
  onComplete: (deploymentId: string) => void;
}

export function DeploymentWizard({ template, onCancel, onComplete }: DeploymentWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [validation, setValidation] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 'kernel-check', title: 'System Check', icon: '🔍' },
    { id: 'configure', title: 'Configure Parameters', icon: '⚙️' },
    { id: 'review', title: 'Review & Deploy', icon: '🚀' },
  ];

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramName]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[paramName];
      return newErrors;
    });
  };

  const validateStep = async () => {
    if (currentStep === 1) {
      setIsValidating(true);
      try {
        const response = await fetch(`/api/v1/templates/${template.id}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parameters }),
        });
        
        const result = await response.json();
        
        if (result.valid) {
          setValidation(result.preview);
          setCurrentStep(2);
        } else {
          const newErrors: Record<string, string> = {};
          result.errors.forEach((err: any) => {
            newErrors[err.parameter] = err.message;
          });
          setErrors(newErrors);
        }
      } catch (error) {
        console.error('Validation failed:', error);
      } finally {
        setIsValidating(false);
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const response = await fetch(`/api/v1/templates/${template.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters, dry_run: false }),
      });
      
      const result = await response.json();
      onComplete(result.deployment_id);
    } catch (error) {
      console.error('Deployment failed:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-xl
                      ${idx < currentStep ? 'bg-green-500 text-white' : ''}
                      ${idx === currentStep ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                      ${idx > currentStep ? 'bg-gray-200 text-gray-500' : ''}
                    `}
                  >
                    {idx < currentStep ? <Check className="h-6 w-6" /> : step.icon}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{step.title}</p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8">
          {currentStep === 0 && <KernelCheckStep onNext={validateStep} />}
          
          {currentStep === 1 && (
            <ConfigureStep
              template={template}
              parameters={parameters}
              errors={errors}
              onChange={handleParameterChange}
              onNext={validateStep}
              onBack={() => setCurrentStep(0)}
              isValidating={isValidating}
            />
          )}
          
          {currentStep === 2 && (
            <ReviewStep
              template={template}
              parameters={parameters}
              validation={validation}
              onDeploy={handleDeploy}
              onBack={() => setCurrentStep(1)}
              isDeploying={isDeploying}
            />
          )}
        </Card>

        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={onCancel}>
            Cancel Deployment
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step 1: Kernel Check
function KernelCheckStep({ onNext }: { onNext: () => void }) {
  const [checks, setChecks] = useState([
    { name: 'Kernel Version (>= 5.x)', status: 'checking' },
    { name: 'eBPF Support', status: 'checking' },
    { name: 'XDP Support', status: 'checking' },
    { name: 'Network Capabilities', status: 'checking' },
  ]);

  useState(() => {
    // Simulate kernel checks
    setTimeout(() => {
      setChecks(prev => prev.map((check, idx) => ({
        ...check,
        status: idx < 3 ? 'passed' : 'passed'
      })));
    }, 1500);
  });

  const allPassed = checks.every(c => c.status === 'passed');

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">System Compatibility Check</h2>
      
      <div className="space-y-4 mb-8">
        {checks.map((check) => (
          <div key={check.name} className="flex items-center justify-between p-4 border rounded-lg">
            <span className="font-medium">{check.name}</span>
            {check.status === 'checking' && (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}
            {check.status === 'passed' && (
              <Check className="h-5 w-5 text-green-600" />
            )}
            {check.status === 'failed' && (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
        ))}
      </div>

      {allPassed && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            All system checks passed! Your system is compatible with this template.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={onNext}
        disabled={!allPassed}
        className="w-full"
        size="lg"
      >
        Continue to Configuration
      </Button>
    </div>
  );
}

// Step 2: Configure Parameters
function ConfigureStep({ 
  template, 
  parameters, 
  errors, 
  onChange, 
  onNext, 
  onBack,
  isValidating 
}: any) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{template.name} Configuration</h2>
      <p className="text-gray-600 mb-6">
        Customize the template parameters for your deployment
      </p>

      <div className="space-y-6 mb-8">
        {template.parameters.map((param: any) => (
          <div key={param.name}>
            <Label htmlFor={param.name} className="text-base font-medium mb-2 block">
              {param.name}
              {param.required && <Badge variant="destructive" className="ml-2">Required</Badge>}
            </Label>
            <p className="text-sm text-gray-600 mb-2">{param.description}</p>
            
            {param.type === 'ip_list' && (
              <Input
                id={param.name}
                placeholder="e.g., 10.0.1.1, 10.0.1.2, 10.0.1.3"
                value={parameters[param.name] || ''}
                onChange={(e) => onChange(param.name, e.target.value.split(',').map(s => s.trim()))}
                className={errors[param.name] ? 'border-red-500' : ''}
              />
            )}
            
            {param.type === 'integer' && (
              <Input
                id={param.name}
                type="number"
                placeholder={param.default?.toString()}
                value={parameters[param.name] || param.default || ''}
                onChange={(e) => onChange(param.name, parseInt(e.target.value))}
                min={param.min}
                max={param.max}
                className={errors[param.name] ? 'border-red-500' : ''}
              />
            )}
            
            {param.type === 'string' && (
              <Input
                id={param.name}
                type={param.secret ? 'password' : 'text'}
                placeholder={param.default}
                value={parameters[param.name] || ''}
                onChange={(e) => onChange(param.name, e.target.value)}
                className={errors[param.name] ? 'border-red-500' : ''}
              />
            )}
            
            {param.type === 'boolean' && (
              <div className="flex items-center gap-2">
                <input
                  id={param.name}
                  type="checkbox"
                  checked={parameters[param.name] ?? param.default}
                  onChange={(e) => onChange(param.name, e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor={param.name} className="font-normal">Enable</Label>
              </div>
            )}

            {param.type === 'enum' && (
              <select
                id={param.name}
                value={parameters[param.name] || param.default}
                onChange={(e) => onChange(param.name, e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                {param.options.map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            
            {errors[param.name] && (
              <p className="text-sm text-red-600 mt-1">{errors[param.name]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} disabled={isValidating} className="flex-1">
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            'Review Configuration'
          )}
        </Button>
      </div>
    </div>
  );
}

// Step 3: Review & Deploy
function ReviewStep({ template, parameters, validation, onDeploy, onBack, isDeploying }: any) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Review Your Configuration</h2>

      <div className="space-y-6 mb-8">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2">Template</h3>
          <p>{template.name}</p>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Parameters</h3>
          <div className="space-y-2">
            {Object.entries(parameters).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{key}</span>
                <span className="font-mono text-sm">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {validation && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Estimated Resources</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {validation.estimated_resources?.cpu || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">CPU Cores</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {validation.estimated_resources?.memory || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">Memory (GB)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {validation.estimated_resources?.bandwidth || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">Bandwidth (Gbps)</p>
              </div>
            </div>
          </Card>
        )}

        {validation?.warnings && validation.warnings.length > 0 && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Warnings:</strong>
              <ul className="list-disc list-inside mt-2">
                {validation.warnings.map((warning: string, idx: number) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} disabled={isDeploying} className="flex-1">
          Back to Edit
        </Button>
        <Button 
          onClick={onDeploy} 
          disabled={isDeploying} 
          className="flex-1 bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {isDeploying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deploying...
            </>
          ) : (
            '🚀 Deploy Now'
          )}
        </Button>
      </div>
    </div>
  );
}
```

---

## Phase 4: Traffic Simulator & Verification (Days 11-12)

### Task 4.1: Traffic Generator Engine
**Owner**: Backend Engineer 3, QA Engineer  
**Duration**: 1 day  
**Priority**: P1

**Deliverables**:
- [ ] Build HTTP/TCP/UDP traffic generator
- [ ] Implement test request scenarios
- [ ] Create verification rule engine
- [ ] Add performance metrics collection

**Implementation**:
```go
// pkg/testing/traffic_simulator.go
package testing

import (
    "context"
    "fmt"
    "net/http"
    "sync"
    "time"
)

type TrafficSimulator struct {
    client *http.Client
    metrics *MetricsCollector
}

type TestScenario struct {
    Name string
    Requests []TestRequest
    ExpectedResults []ExpectedResult
    Duration time.Duration
    Concurrency int
}

type TestRequest struct {
    Method string
    Path string
    Headers map[string]string
    Body string
    ExpectedStatus int
}

type TestResult struct {
    ScenarioName string
    TotalRequests int
    SuccessfulRequests int
    FailedRequests int
    AverageLatency time.Duration
    P95Latency time.Duration
    P99Latency time.Duration
    ErrorsByType map[string]int
    Passed bool
    Failures []string
}

func NewTrafficSimulator() *TrafficSimulator {
    return &TrafficSimulator{
        client: &http.Client{
            Timeout: 10 * time.Second,
        },
        metrics: NewMetricsCollector(),
    }
}

func (ts *TrafficSimulator) RunScenario(ctx context.Context, scenario TestScenario, targetURL string) (*TestResult, error) {
    result := &TestResult{
        ScenarioName: scenario.Name,
        ErrorsByType: make(map[string]int),
    }
    
    // Create worker pool
    var wg sync.WaitGroup
    requestChan := make(chan TestRequest, scenario.Concurrency*10)
    resultChan := make(chan *RequestResult, scenario.Concurrency*10)
    
    // Start workers
    for i := 0; i < scenario.Concurrency; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for req := range requestChan {
                res := ts.executeRequest(ctx, targetURL, req)
                resultChan <- res
            }
        }()
    }
    
    // Send requests
    go func() {
        startTime := time.Now()
        requestCount := 0
        
        for time.Since(startTime) < scenario.Duration {
            for _, req := range scenario.Requests {
                requestChan <- req
                requestCount++
            }
        }
        close(requestChan)
    }()
    
    // Collect results
    go func() {
        wg.Wait()
        close(resultChan)
    }()
    
    latencies := []time.Duration{}
    for res := range resultChan {
        result.TotalRequests++
        latencies = append(latencies, res.Latency)
        
        if res.Error != nil {
            result.FailedRequests++
            result.ErrorsByType[res.ErrorType]++
            continue
        }
        
        if res.StatusCode != res.ExpectedStatus {
            result.FailedRequests++
            result.Failures = append(result.Failures, 
                fmt.Sprintf("Expected status %d, got %d for %s", 
                    res.ExpectedStatus, res.StatusCode, res.Path))
            continue
        }
        
        result.SuccessfulRequests++
    }
    
    // Calculate statistics
    if len(latencies) > 0 {
        result.AverageLatency = calculateAverage(latencies)
        result.P95Latency = calculatePercentile(latencies, 0.95)
        result.P99Latency = calculatePercentile(latencies, 0.99)
    }
    
    // Determine if test passed
    result.Passed = result.FailedRequests == 0
    
    return result, nil
}

func (ts *TrafficSimulator) executeRequest(ctx context.Context, baseURL string, testReq TestRequest) *RequestResult {
    req, err := http.NewRequestWithContext(ctx, testReq.Method, baseURL+testReq.Path, nil)
    if err != nil {
        return &RequestResult{
            Error: err,
            ErrorType: "request_creation",
        }
    }
    
    // Add headers
    for key, value := range testReq.Headers {
        req.Header.Set(key, value)
    }
    
    start := time.Now()
    resp, err := ts.client.Do(req)
    latency := time.Since(start)
    
    result := &RequestResult{
        Path: testReq.Path,
        Latency: latency,
        ExpectedStatus: testReq.ExpectedStatus,
    }
    
    if err != nil {
        result.Error = err
        result.ErrorType = "network_error"
        return result
    }
    defer resp.Body.Close()
    
    result.StatusCode = resp.StatusCode
    return result
}

type RequestResult struct {
    Path string
    StatusCode int
    ExpectedStatus int
    Latency time.Duration
    Error error
    ErrorType string
}

// Template-specific test scenarios
func GetTemplateTestScenario(templateID string, params map[string]interface{}) TestScenario {
    switch templateID {
    case "api-gateway-v1":
        return TestScenario{
            Name: "API Gateway Validation",
            Duration: 30 * time.Second,
            Concurrency: 10,
            Requests: []TestRequest{
                {
                    Method: "GET",
                    Path: "/api/users",
                    Headers: map[string]string{
                        "Authorization": "Bearer valid-token",
                    },
                    ExpectedStatus: 200,
                },
                {
                    Method: "GET",
                    Path: "/api/users",
                    Headers: map[string]string{},
                    ExpectedStatus: 401, // Should fail without JWT
                },
                {
                    Method: "GET",
                    Path: "/api/users?id=1' OR '1'='1",
                    Headers: map[string]string{
                        "Authorization": "Bearer valid-token",
                    },
                    ExpectedStatus: 403, // WAF should block SQLi
                },
            },
        }
        
    case "blue-green-v1":
        return TestScenario{
            Name: "Blue-Green Traffic Distribution",
            Duration: 20 * time.Second,
            Concurrency: 5,
            Requests: []TestRequest{
                {
                    Method: "GET",
                    Path: "/health",
                    ExpectedStatus: 200,
                },
            },
        }
        
    case "ddos-scrubbing-v1":
        return TestScenario{
            Name: "DDoS Protection Validation",
            Duration: 10 * time.Second,
            Concurrency: 100, // High concurrency to test rate limiting
            Requests: []TestRequest{
                {
                    Method: "GET",
                    Path: "/",
                    ExpectedStatus: 200,
                },
            },
        }
        
    default:
        return TestScenario{
            Name: "Basic Health Check",
            Duration: 10 * time.Second,
            Concurrency: 1,
            Requests: []TestRequest{
                {
                    Method: "GET",
                    Path: "/health",
                    ExpectedStatus: 200,
                },
            },
        }
    }
}

func calculateAverage(latencies []time.Duration) time.Duration {
    var total time.Duration
    for _, l := range latencies {
        total += l
    }
    return total / time.Duration(len(latencies))
}

func calculatePercentile(latencies []time.Duration, percentile float64) time.Duration {
    // Sort latencies
    sorted := make([]time.Duration, len(latencies))
    copy(sorted, latencies)
    
    // Simple bubble sort for small datasets
    for i := 0; i < len(sorted); i++ {
        for j := i + 1; j < len(sorted); j++ {
            if sorted[i] > sorted[j] {
                sorted[i], sorted[j] = sorted[j], sorted[i]
            }
        }
    }
    
    index := int(float64(len(sorted)) * percentile)
    if index >= len(sorted) {
        index = len(sorted) - 1
    }
    
    return sorted[index]
}
```

---

### Task 4.2: Verification Dashboard UI
**Owner**: Frontend Engineer 3  
**Duration**: 1 day  
**Priority**: P1

**Deliverables**:
- [ ] Create real-time test execution UI
- [ ] Build results visualization
- [ ] Implement traffic metrics charts
- [ ] Add test report export

**Component Implementation**:
```typescript
// ui/components/templates/TrafficSimulator.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';

interface TrafficSimulatorProps {
  deploymentId: string;
  templateId: string;
}

export function TrafficSimulator({ deploymentId, templateId }: TrafficSimulatorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [liveMetrics, setLiveMetrics] = useState<any[]>([]);

  const runSimulation = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);
    setLiveMetrics([]);

    try {
      // Start simulation
      const response = await fetch(`/api/v1/deployments/${deploymentId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId }),
      });

      const { test_id } = await response.json();

      // Poll for progress
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`/api/v1/deployments/${deploymentId}/test/${test_id}`);
        const status = await statusRes.json();

        setProgress(status.progress);
        
        if (status.live_metrics) {
          setLiveMetrics(prev => [...prev, status.live_metrics]);
        }

        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setResults(status.results);
          setIsRunning(false);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setIsRunning(false);
        }
      }, 500);
    } catch (error) {
      console.error('Simulation failed:', error);
      setIsRunning(false);
    }
  };

  const exportReport = () => {
    const report = JSON.stringify(results, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-test-${deploymentId}.json`;
    a.click();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Traffic Verification</h3>
          <p className="text-gray-600 text-sm">
            Test your deployment with realistic traffic patterns
          </p>
        </div>
        
        {!isRunning && !results && (
          <Button onClick={runSimulation} size="lg" className="bg-green-600 hover:bg-green-700">
            <Play className="mr-2 h-5 w-5" />
            Run Test
          </Button>
        )}
        
        {results && (
          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Running simulation...</span>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Live Metrics Chart */}
      {isRunning && liveMetrics.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Live Traffic Metrics</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={liveMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="requests_per_second" stroke="#3b82f6" name="RPS" />
              <Line type="monotone" dataKey="avg_latency" stroke="#10b981" name="Latency (ms)" />
              <Line type="monotone" dataKey="error_rate" stroke="#ef4444" name="Error Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Overall Status */}
          <Alert className={results.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            {results.passed ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>✅ All tests passed!</strong> Your deployment is functioning correctly.
                </AlertDescription>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>❌ Some tests failed.</strong> Review the failures below.
                </AlertDescription>
              </>
            )}
          </Alert>

          {/* Metrics Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{results.total_requests}</p>
              <p className="text-sm text-gray-600">Total Requests</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{results.successful_requests}</p>
              <p className="text-sm text-gray-600">Successful</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{results.failed_requests}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">
                {results.average_latency ? `${results.average_latency.toFixed(2)}ms` : 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Avg Latency</p>
            </Card>
          </div>

          {/* Latency Distribution */}
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Latency Distribution</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average</span>
                <span className="font-mono font-semibold">{results.average_latency?.toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">P95</span>
                <span className="font-mono font-semibold">{results.p95_latency?.toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">P99</span>
                <span className="font-mono font-semibold">{results.p99_latency?.toFixed(2)}ms</span>
              </div>
            </div>
          </Card>

          {/* Errors Breakdown */}
          {Object.keys(results.errors_by_type || {}).length > 0 && (
            <Card className="p-6">
              <h4 className="font-semibold mb-4">Errors by Type</h4>
              <div className="space-y-2">
                {Object.entries(results.errors_by_type).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-gray-600">{type}</span>
                    <span className="font-semibold text-red-600">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Specific Failures */}
          {results.failures && results.failures.length > 0 && (
            <Card className="p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Test Failures
              </h4>
              <div className="space-y-2">
                {results.failures.map((failure: string, idx: number) => (
                  <Alert key={idx} className="bg-yellow-50 border-yellow-200">
                    <AlertDescription className="text-yellow-800 text-sm">
                      {failure}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </Card>
          )}

          {/* Run Another Test */}
          <div className="text-center">
            <Button onClick={runSimulation} variant="outline">
              Run Test Again
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
```

---

## Phase 5: Integration & Testing (Days 13-14)

### Task 5.1: End-to-End Integration Testing
**Owner**: QA Engineer, Full Team  
**Duration**: 1 day  
**Priority**: P0

**Deliverables**:
- [ ] Create E2E test suite for complete template workflow
- [ ] Test all 10 templates with various parameter combinations
- [ ] Verify API endpoints and error handling
- [ ] Performance testing for template deployment time

**Test Scenarios**:
```typescript
// tests/e2e/template-deployment.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Template Gallery E2E', () => {
  test('should display all templates in gallery', async ({ page }) => {
    await page.goto('/templates');
    
    // Wait for templates to load
    await page.waitForSelector('[data-testid="template-card"]');
    
    // Should show 10 templates
    const cards = await page.locator('[data-testid="template-card"]').count();
    expect(cards).toBe(10);
  });

  test('should filter templates by category', async ({ page }) => {
    await page.goto('/templates');
    
    // Click security category
    await page.click('[data-testid="filter-security"]');
    
    // Should show only security templates
    const cards = await page.locator('[data-testid="template-card"]').count();
    expect(cards).toBeGreaterThan(0);
    expect(cards).toBeLessThan(10);
  });

  test('should search templates', async ({ page }) => {
    await page.goto('/templates');
    
    // Search for "API"
    await page.fill('[data-testid="search-input"]', 'API');
    
    // Should show API-related templates
    const cards = await page.locator('[data-testid="template-card"]');
    const firstCard = cards.first();
    await expect(firstCard).toContainText('API');
  });
});

test.describe('API Gateway Template Deployment', () => {
  test('should deploy API gateway template successfully', async ({ page }) => {
    await page.goto('/templates/api-gateway-v1');
    
    // Start deployment
    await page.click('button:has-text("Deploy Now")');
    
    // Step 1: Kernel check (should auto-pass)
    await expect(page.locator('text=All system checks passed')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Continue")');
    
    // Step 2: Configure parameters
    await page.fill('[name="backend_ips"]', '10.0.1.1, 10.0.1.2, 10.0.1.3');
    await page.fill('[name="rate_limit_rps"]', '1000');
    await page.fill('[name="jwt_secret"]', 'super-secret-key-at-least-32-chars-long');
    
    await page.click('button:has-text("Review Configuration")');
    
    // Step 3: Review and deploy
    await expect(page.locator('text=Review Your Configuration')).toBeVisible();
    await page.click('button:has-text("Deploy Now")');
    
    // Should redirect to deployment status
    await expect(page).toHaveURL(/\/deployments\/.+/);
    
    // Wait for deployment to complete
    await expect(page.locator('text=Deployment Active')).toBeVisible({ timeout: 30000 });
  });

  test('should validate required parameters', async ({ page }) => {
    await page.goto('/templates/api-gateway-v1');
    await page.click('button:has-text("Deploy Now")');
    
    // Skip to configuration
    await page.click('button:has-text("Continue")');
    
    // Try to continue without filling required fields
    await page.click('button:has-text("Review Configuration")');
    
    // Should show validation errors
    await expect(page.locator('text=This field is required')).toBeVisible();
  });

  test('should show parameter validation errors', async ({ page }) => {
    await page.goto('/templates/api-gateway-v1');
    await page.click('button:has-text("Deploy Now")');
    await page.click('button:has-text("Continue")');
    
    // Enter invalid IP
    await page.fill('[name="backend_ips"]', 'invalid-ip');
    await page.fill('[name="jwt_secret"]', 'short'); // Too short
    
    await page.click('button:has-text("Review Configuration")');
    
    // Should show validation errors
    await expect(page.locator('text=Invalid IP address')).toBeVisible();
    await expect(page.locator('text=minimum length')).toBeVisible();
  });
});

test.describe('Traffic Simulator', () => {
  test('should run traffic simulation successfully', async ({ page }) => {
    // Assuming we have a deployed template
    await page.goto('/deployments/test-deployment-id');
    
    // Click run test button
    await page.click('button:has-text("Run Test")');
    
    // Wait for simulation to complete
    await expect(page.locator('text=All tests passed')).toBeVisible({ timeout: 60000 });
    
    // Should show metrics
    await expect(page.locator('text=Total Requests')).toBeVisible();
    await expect(page.locator('text=Avg Latency')).toBeVisible();
  });

  test('should export test results', async ({ page }) => {
    await page.goto('/deployments/test-deployment-id');
    
    // Assuming test has been run
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export Report")')
    ]);
    
    expect(download.suggestedFilename()).toContain('traffic-test');
  });
});
```

**Backend Integration Tests**:
```go
// pkg/templates/integration_test.go
package templates_test

import (
    "context"
    "testing"
    "time"
    
    "github.com/ghostplane/nlb-plus/pkg/templates"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestTemplateDeploymentFlow(t *testing.T) {
    ctx := context.Background()
    
    // Initialize template repository
    repo, err := templates.NewRepository("../../templates")
    require.NoError(t, err)
    
    renderer := templates.NewRenderer()
    deployer := templates.NewDeployer()
    
    t.Run("API Gateway Template", func(t *testing.T) {
        // Load template
        tmpl, err := repo.Get("api-gateway-v1")
        require.NoError(t, err)
        assert.Equal(t, "High-Traffic API Gateway", tmpl.Name)
        
        // Prepare parameters
        params := map[string]interface{}{
            "backend_ips": []string{"10.0.1.1", "10.0.1.2", "10.0.1.3"},
            "rate_limit_rps": 1000,
            "jwt_secret": "test-secret-key-with-minimum-length",
        }
        
        // Render configuration
        config, err := renderer.Render(tmpl, params)
        require.NoError(t, err)
        assert.NotNil(t, config)
        
        // Validate rendered config
        assert.Equal(t, 3, len(config.BackendPools[0].Servers))
        assert.Equal(t, 1000, config.L7Proxy.Middleware[0].Config["requests_per_second"])
        
        // Deploy (dry-run)
        deployment, err := deployer.Deploy(ctx, config, true)
        require.NoError(t, err)
        assert.Equal(t, "dry-run", deployment.Status)
    })
    
    t.Run("Blue-Green Template", func(t *testing.T) {
        tmpl, err := repo.Get("blue-green-v1")
        require.NoError(t, err)
        
        params := map[string]interface{}{
            "blue_backends": []string{"10.0.2.1", "10.0.2.2"},
            "green_backends": []string{"10.0.3.1", "10.0.3.2"},
            "active_environment": "blue",
        }
        
        config, err := renderer.Render(tmpl, params)
        require.NoError(t, err)
        
        // Blue should have 100% weight
        bluePool := findPool(config.L4Balancing.Pools, "blue")
        greenPool := findPool(config.L4Balancing.Pools, "green")
        
        assert.Equal(t, 100, bluePool.Weight)
        assert.Equal(t, 0, greenPool.Weight)
    })
    
    t.Run("DDoS Scrubbing Template", func(t *testing.T) {
        tmpl, err := repo.Get("ddos-scrubbing-v1")
        require.NoError(t, err)
        
        params := map[string]interface{}{
            "protected_ips": []string{"203.0.113.1"},
            "syn_threshold": 1000,
            "auto_blacklist": true,
        }
        
        config, err := renderer.Render(tmpl, params)
        require.NoError(t, err)
        
        // Should have XDP filters configured
        assert.NotNil(t, config.XDPFilters)
        assert.True(t, len(config.XDPFilters) > 0)
    })
}

func TestParameterValidation(t *testing.T) {
    repo, _ := templates.NewRepository("../../templates")
    renderer := templates.NewRenderer()
    
    t.Run("Missing Required Parameter", func(t *testing.T) {
        tmpl, _ := repo.Get("api-gateway-v1")
        
        params := map[string]interface{}{
            // Missing backend_ips
            "rate_limit_rps": 1000,
        }
        
        _, err := renderer.Render(tmpl, params)
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "backend_ips")
    })
    
    t.Run("Invalid IP Format", func(t *testing.T) {
        tmpl, _ := repo.Get("api-gateway-v1")
        
        params := map[string]interface{}{
            "backend_ips": []string{"not-an-ip"},
            "jwt_secret": "valid-secret-key",
        }
        
        _, err := renderer.Render(tmpl, params)
        assert.Error(t, err)
    })
    
    t.Run("Out of Range Value", func(t *testing.T) {
        tmpl, _ := repo.Get("api-gateway-v1")
        
        params := map[string]interface{}{
            "backend_ips": []string{"10.0.1.1"},
            "rate_limit_rps": 1000000, // Exceeds max
            "jwt_secret": "valid-secret-key",
        }
        
        _, err := renderer.Render(tmpl, params)
        assert.Error(t, err)
    })
}

func TestTrafficSimulation(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test in short mode")
    }
    
    ctx := context.Background()
    simulator := templates.NewTrafficSimulator()
    
    t.Run("API Gateway Simulation", func(t *testing.T) {
        scenario := templates.GetTemplateTestScenario("api-gateway-v1", nil)
        
        // This would require a running instance
        // For now, we'll just validate the scenario
        assert.Equal(t, "API Gateway Validation", scenario.Name)
        assert.True(t, len(scenario.Requests) > 0)
        assert.Equal(t, 30*time.Second, scenario.Duration)
    })
}

func findPool(pools []templates.BackendPool, name string) *templates.BackendPool {
    for _, pool := range pools {
        if pool.Name == name {
            return &pool
        }
    }
    return nil
}
```

---

### Task 5.2: Documentation & Polish
**Owner**: Technical Writer, Frontend Team  
**Duration**: 1 day  
**Priority**: P1

**Deliverables**:
- [ ] Create template documentation for each of the 10 templates
- [ ] Write deployment guides with screenshots
- [ ] Add inline help tooltips in UI
- [ ] Create video walkthrough

**Documentation Structure**:
```markdown
# Template Gallery Documentation

## Overview
The Template Gallery provides one-click deployment for common networking and security scenarios. Each template is production-tested and includes best practices for specific use cases.

## Available Templates

### 1. High-Traffic API Gateway
**Use Case**: Public-facing REST/GraphQL APIs requiring authentication, rate limiting, and security

**What it includes**:
- Layer 7 HTTP/2 proxy
- JWT token validation
- Per-IP rate limiting (configurable RPS)
- WAF with OWASP Core Rule Set
- SQL injection and XSS protection

**When to use**:
- You're building a microservices API
- Need to protect against common web attacks
- Require authentication at the edge
- Want to enforce rate limits per client

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| backend_ips | IP List | Yes | Backend API server addresses |
| rate_limit_rps | Integer | No | Requests per second per IP (default: 1000) |
| jwt_secret | String | Yes | JWT signing secret (min 32 chars) |

**Example Configuration**:
```yaml
backend_ips:
  - 10.0.1.10
  - 10.0.1.11
  - 10.0.1.12
rate_limit_rps: 500
jwt_secret: "your-super-secret-jwt-key-here-minimum-32-characters"
```

**Expected Performance**:
- Throughput: 50,000+ RPS
- Latency: <2ms P99 overhead
- CPU: ~2 cores at 50K RPS

**Verification**:
The traffic simulator will test:
✓ Valid JWT tokens are accepted
✓ Invalid tokens are rejected (401)
✓ SQL injection attempts are blocked (403)
✓ Rate limits are enforced

---

### 2. Blue-Green Deployment
**Use Case**: Zero-downtime application updates with instant rollback capability

**What it includes**:
- Weighted traffic distribution
- Health check monitoring
- Instant traffic switching
- Gradual rollout support

**When to use**:
- Deploying new application versions
- Need ability to rollback instantly
- Want to validate new code before full release
- Minimize deployment risk

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blue_backends | IP List | Yes | Current production servers |
| green_backends | IP List | Yes | New version servers |
| active_environment | Enum | No | Which environment receives traffic (default: blue) |
| switch_method | Enum | No | instant or gradual (default: instant) |

**Deployment Flow**:
1. Deploy new version to green environment
2. Run health checks on green backends
3. Switch 10% traffic to green (if gradual)
4. Monitor error rates and latency
5. Complete switch or rollback

**Example Configuration**:
```yaml
blue_backends:
  - 10.0.1.10  # Production v1.0
  - 10.0.1.11
green_backends:
  - 10.0.2.10  # Staging v2.0
  - 10.0.2.11
active_environment: blue
switch_method: gradual
gradual_percentage: 
'use client';

import { useState, useEffect } from 'react';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplateFilters } from '@/components/templates/TemplateFilters';
import { SearchBar } from '@/components/ui/SearchBar';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/v1/templates')
      .then(res => res.json())
      .then(data => {
        setTemplates(data.templates);
        setFilteredTemplates(data.templates);
      });
  }, []);

  useEffect(() => {
    let filtered = templates;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredTemplates(filtered);
  }, [selectedCategory, searchQuery, templates]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Template Gallery</h1>
        <p className="text-gray-600">Deploy production-ready configurations in seconds</p>
      </div>

      <div className="flex gap-6 mb-8">
        <TemplateFilters
          categories={['all', 'api-management', 'deployment', 'security', 'database', 'multimedia', 'microservices', 'multi-cloud', 'cdn']}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search templates..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
          />
        ))}
      </div>
    </div>
  );
}
```

```typescript
// ui/components/templates/TemplateCard.tsx
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    difficulty: string;
    tags: string[];
  };
}

export function TemplateCard({ template }: TemplateCardProps) {
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
      <Link href={`/templates/${template.id}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{template.icon}</div>
          <Badge className={difficultyColors[template.difficulty]}>
            {template.difficulty}
          </Badge>
        </div>

        <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
          {template.name}
        </h3>

        <p className="text-gray-600 mb-4 text-sm line-clamp-2">
          {template.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {template.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center text-blue-600 font-medium">
          <span>Deploy template</span>
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
    </Card>
  );
}
```

---

### Task 3.2: Template Detail & Configuration Wizard
**Owner**: Frontend Engineer 2  
**Duration**: 2 days  
**Priority**: P0

**Deliverables**:
- [ ] Create template detail page with architecture diagram
- [ ] Build multi-step deployment wizard
- [ ] Implement parameter input forms with validation
- [ ] Add configuration preview

**Component Implementation**:
```typescript
// ui/app/templates/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ArchitectureDiagram } from '@/components/templates/ArchitectureDiagram';
import { DeploymentWizard } from '@/components/templates/DeploymentWizard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Rocket } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/templates/${params.id}`)
      .then(res => res.json())
      .then(data => setTemplate(data.template));
  }, [params.id]);

  if (!template) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (showWizard) {
    return (
      <DeploymentWizard
        template={template}
        onCancel={() => setShowWizard(false)}
        onComplete={(deploymentId) => router.push(`/deployments/${deploymentId}`)}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Gallery
      </Button>

      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-6xl">{template.icon}</div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
              <p className="text-gray-600">{template.description}</p>
            </div>
          </div>
          
          <Button
            size="lg"
            onClick={() => setShowWizard(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Rocket className="mr-2 h-5 w-5" />
            Deploy Now
          </Button>
        </div>

        {/* Metadata */}
        <div className="flex gap-4 mb-8">
          <Badge variant="outline">Category: {template.category}</Badge>
          <Badge variant="outline">Difficulty: {template.difficulty}</Badge>
          <Badge variant="outline">Version: {template.version}</Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">What This Template Does</h3>
                <p className="text-gray-700">{template.longDescription}</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {template.architecture.components.map((component, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>{component}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Use Cases</h3>
                <div className="grid grid-cols-2 gap-4">
                  {template.useCases?.map((useCase, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-1">{useCase.title}</h4>
                      <p className="text-sm text-gray-600">{useCase.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="architecture" className="mt-6">
            <ArchitectureDiagram template={template} />
          </TabsContent>

          <TabsContent value="parameters" className="mt-6">
            <div className="space-y-4">
              {template.parameters.map((param) => (
                <div key={param.name} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{param.name}</h4>
                      <p className="text-sm text-gray-600">{param.description}</p>
                    </div>
                    {param.required && (
                      <Badge variant="destructive">Required</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-mono">{param.type}</span>
                    </div>
                    {param.default !== undefined && (
                      <div>
                        <span className="text-gray-500">Default:</span>
                        <span className="ml-2 font-mono">{JSON.stringify(param.default)}</span>
                      </div>
                    )}
                    {param.validation && (
                      <div>
                        <span className="text-gray-500">Validation:</span>
                        <span className="ml-2 font-mono text-xs">{param.validation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="examples" className="mt-6">
            <div className="space-y-6">
              {template.examples?.map((example, idx) => (
                <div key={idx} className="border rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-3">{example.title}</h4>
                  <p className="text-gray-600 mb-4">{example.scenario}</p>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                    <code>{JSON.stringify(example.parameters, null, 2)}</code>
                  </pre>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
## 🎨 UI/UX Flow
1. **Browse**: User explores the categorized gallery.
2. **Review**: Visual diagram (Mermaid/ReactFlow) showing the data flow.
3. **Configure**: Simple form to map template backends to real IPs.
4. **Deploy**: XDP maps and Proxy routes updated in <100ms.
5. **Verify**: Automatic redirect to a live metrics dashboard.
