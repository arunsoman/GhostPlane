# GhostPlane (NLB+) Project Roadmap

This roadmap outlines the planned evolution of GhostPlane across multiple sprints, focusing on bridging feature gaps and enhancing system resilience.

## Sprint 1: Foundation & Critical Fixes
**Duration**: 2 weeks | **Priority**: P0

### 1. Health Check Backend Integration
- **Status**: Critical | **Effort**: 5 points
- **Description**: Fix the disconnect between UI and backend for health check configuration.
- **Acceptance Criteria**:
  - Backend `ConfigRoute` struct updated with all health check fields.
  - Health check settings properly serialized/deserialized.
  - Backend applies user-configured intervals and thresholds.
  - Unit tests covering health check configuration flow.
- **UX**:
  - **Before**: Users configure settings that are silently ignored.
  - **After**: Settings are saved, validated, and immediately applied.
- **Technical**:
  - Update `pkg/proxy/proxy.go` `ConfigRoute` struct.
  - Modify health checker initialization to use config values.

### 2. Basic Routing Rules
- **Status**: High | **Effort**: 8 points
- **Description**: Implement header, query param, and host-based routing.
- **Acceptance Criteria**:
  - Visual rule builder with real-time preview.
  - Support AND/OR logic between conditions.
  - Route matching test tool in UI.

### 3. Load Balancing Algorithms
- **Status**: High | **Effort**: 5 points
- **Description**: Implement multiple LB algorithms (Round Robin, Least Connections, Random, IP Hash, Weighted).

---

## Sprint 2: Traffic Management
**Duration**: 2 weeks | **Priority**: P1

### 4. Traffic Splitting & Canary
- **Status**: Medium | **Effort**: 8 points
- **Description**: Enable A/B testing and gradual rollouts with visual sliders.

### 5. Session Affinity / Sticky Sessions
- **Status**: Medium | **Effort**: 5 points
- **Description**: Ensure requests from the same client go to the same backend using Cookies or IP Hashing.

### 6. Timeouts & Retry Policies
- **Status**: Medium | **Effort**: 5 points
- **Description**: Per-route timeout and retry configuration.

---

## Sprint 3: Resilience & Security
**Duration**: 2 weeks | **Priority**: P1

### 7. Circuit Breaker
- **Status**: Medium | **Effort**: 8 points
- **Description**: Prevent cascading failures with Open/Half-Open/Closed states.

### 8. Rate Limiting
- **Status**: Medium | **Effort**: 5 points
- **Description**: Per-route rate limiting by IP, User-ID, or Custom Headers.

### 9. Authentication & Authorization
- **Status**: Low | **Effort**: 8 points
- **Description**: Per-route JWT, API Key, or OAuth2 validation.

---

## Sprint 4: Observability & UX Polish
**Duration**: 2 weeks | **Priority**: P2

### 10. Response Caching
- **Status**: Low | **Effort**: 5 points
- **Description**: Cache responses to reduce backend load with TTL and custom keys.

### 11. Metadata & Traceability
- **Status**: Low | **Effort**: 3 points
- **Description**: Track route source, version history, and audit logs.

### 12. Header Manipulation
- **Status**: Low | **Effort**: 5 points
- **Description**: Add, remove, or modify request/response headers dynamically.

### 13. Route Testing & Validation
- **Status**: Medium | **Effort**: 5 points
- **Description**: Test routes and detect conflicts before deploying.

### 14. UX Enhancements
- **Status**: Medium | **Effort**: 8 points
- **Description**: Multi-step wizard, smart defaults, and import/export capabilities.
