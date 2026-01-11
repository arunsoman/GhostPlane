# Sprint 13: Template Intelligence

## Overview
GhostPlane's "Template Gallery" provides one-click deployment for common, high-impact networking and security scenarios. This sprint focuses on building the reference architecture for 10 real-life templates and the UI engine to deploy them.

## 🚀 The 10 Core Templates

### 1. High-Traffic API Gateway
- **Scenario**: Public-facing REST/GraphQL API.
- **Layers**: L7 Proxy + WAF + Auth.
- **Features**: Rate limiting (1000 RPS), JWT validation, SQLi/XSS filtering.

### 2. Blue-Green Deployment
- **Scenario**: Zero-downtime application updates.
- **Layers**: L4 (eBPF) + L7.
- **Features**: Weighted traffic shifting between `production` and `staging` pools.

### 3. DDoS Scrubbing Center
- **Scenario**: Mitigating high-volume infrastructure attacks.
- **Layers**: L4 (XDP/eBPF).
- **Features**: SYN flood protection, automated IP blacklisting, 10Gbps+ packet dropping.

### 4. Canary Release (10%)
- **Scenario**: Testing new features on a subset of users.
- **Layers**: L7 Proxy.
- **Features**: Header-based routing or 10% probability routing to a canary cluster.

### 5. UDP Streaming Optimized
- **Scenario**: Latency-sensitive gaming or VoIP traffic.
- **Layers**: L4 (eBPF).
- **Features**: Direct Server Return (DSR) support for minimal latency.

### 6. Legacy WAF Hardening
- **Scenario**: Protecting old applications that cannot be patched.
- **Layers**: WAF + L7 Proxy.
- **Features**: Strict security ruleset and legacy protocol translation.

### 7. Microservices Service Mesh
- **Scenario**: Internal east-west traffic management.
- **Layers**: L7 Proxy + Telemetry.
- **Features**: Tracing header injection, retry logic, and circuit breaking.

### 8. Database Read-Replica Proxy
- **Scenario**: Scaling database reads.
- **Layers**: L4 Load Balancing.
- **Features**: Distributing traffic across multiple read-only DB replicas on port 5432/3306.

### 9. Global Multi-Cloud Ingress
- **Scenario**: High-availability across AWS/GCP/Azure.
- **Layers**: L7 Proxy + Health Checks.
- **Features**: Aggressive health checks and automatic region failover.

### 10. Static Asset Edge Proxy
- **Scenario**: High-concurrency website delivery.
- **Layers**: L7 Proxy + Caching.
- **Features**: Gzip/Brotli compression and TTL-based asset caching.

---

## 🛠️ Implementation Roadmap

### Phase 1: Template Engine (Backend)
- Define templates in `pkg/config/templates/`.
- Create `/api/v1/templates` for the UI to fetch available "recipes".
- Implement `ApplyTemplate` logic in `pkg/proxy` and `pkg/ebpf`.

### Phase 2: Solutions Gallery (UI)
- **View**: `ui/app/templates/page.tsx`.
- **Component**: `TemplateGallery` (Grid of cards).
- **Interaction**: Deployment wizard for IP/Port customization.

### Phase 3: Traffic Simulator (Verification)
- Integrated "Test Traffic" button for each template.
- Generates mock requests to verify the configuration is active and functional.

## 🎨 UI/UX Flow
1. **Browse**: User explores the categorized gallery.
2. **Review**: Visual diagram (Mermaid/ReactFlow) showing the data flow.
3. **Configure**: Simple form to map template backends to real IPs.
4. **Deploy**: XDP maps and Proxy routes updated in <100ms.
5. **Verify**: Automatic redirect to a live metrics dashboard.
