# ADR-002: Implementation Strategy - API-First with UI Prototyping

## Status
Accepted

## Context
We need to decide the build order for NLB+: Backend-first, UI-first, or a hybrid approach. This decision impacts:
- Time to first demo
- Ability to validate USP features (Copilot, Security Dashboard)
- Developer workflow and parallelization
- Risk of building the wrong thing

## Decision
We will use a **Hybrid "API-First with UI Prototyping"** approach, building in 3 parallel tracks:

### Track 1: Core Backend (Foundation) - Week 1-2
1. eBPF Data Plane (L4 load balancing)
2. L7 Proxy (HTTP/HTTPS reverse proxy)
3. OpenTelemetry (Tracing and metrics)

**Deliverable:** Working load balancer (CLI/config-driven)

### Track 2: API Layer + Copilot Backend - Week 2-3
1. Management API (REST endpoints)
2. Copilot Agent (LangGraph + tools)
3. Audit Logger

**Deliverable:** APIs + Copilot CLI

### Track 3: UI (Iterative) - Week 2-4
1. Design System implementation
2. Core dashboards (Topology, Metrics, Logs)
3. USP features (Copilot Chat, Migration Wizard, Security Dashboard)

**Deliverable:** Premium UI connected to live backend

## Rationale

### Why NOT Pure UI-First?
- ❌ Copilot needs real data (metrics, logs) to demonstrate value
- ❌ Can't validate "AI-powered RCA" with mock data
- ❌ Topology graph requires actual traffic flow
- ❌ Our USP is the *intelligent behavior*, not just the interface

### Why NOT Pure Backend-First?
- ❌ Our differentiation is the *experience* (Copilot UX, visual topology)
- ❌ Hard to validate UX decisions without seeing them
- ❌ Risk building APIs that don't match UI needs
- ❌ Delays feedback on the "Premium" aesthetic

### Why Hybrid API-First?
- ✅ Backend provides real data for Copilot to analyze
- ✅ APIs define the contract early (OpenAPI spec)
- ✅ UI can iterate quickly once APIs exist
- ✅ Matches TAT philosophy (test backend thoroughly)
- ✅ Enables parallel work (backend team + frontend team)

## Implementation Timeline

### Sprint 1: Backend Foundation (Days 1-7)
- Day 1-2: eBPF XDP program + loader
- Day 3-4: L7 Proxy (HTTP reverse proxy)
- Day 5-6: OpenTelemetry integration
- Day 7: Testing + CLI demo

### Sprint 2: API + Copilot (Days 8-14)
- Day 8-9: Management API (config, metrics endpoints)
- Day 10-11: Copilot tools (metrics.py, logs.py, rca.py)
- Day 12-13: LangGraph agent integration
- Day 14: API testing + Copilot CLI demo

### Sprint 3: UI Core (Days 15-21)
- Day 15-16: Next.js setup + Design System
- Day 17-18: Main Dashboard + Topology Graph
- Day 19-20: Metrics/Logs pages
- Day 21: Integration testing

### Sprint 4: USP Features (Days 22-28)
- Day 22-23: Copilot Chat UI
- Day 24-25: Migration Wizard
- Day 26-27: Security Dashboard
- Day 28: E2E testing + Demo prep

## Success Criteria

| Track | Week 1 Demo | Week 2 Demo | Week 4 Demo |
| :--- | :--- | :--- | :--- |
| **Backend** | Load balance HTTP traffic | Auto-scale backends | eBPF DDoS mitigation |
| **API + Copilot** | - | CLI: "Why is /api slow?" | Full RCA with fixes |
| **UI** | - | Dashboard shows metrics | Copilot chat + topology |

## Consequences

### Positive
- Real data available for Copilot from Day 7
- APIs stabilize early, reducing UI rework
- Can demo "intelligent" features (not just UI mockups)
- Backend is thoroughly tested before UI integration

### Negative
- No visual progress for first week (backend-only)
- Requires coordination between backend/frontend teams
- UI developers must wait for APIs (mitigated by OpenAPI spec)

## Alternatives Considered

### Alternative 1: Pure Backend-First
Build entire backend, then UI.
- **Rejected**: Delays UX validation, risks building wrong APIs

### Alternative 2: Pure UI-First
Build UI with mocks, then connect backend.
- **Rejected**: Can't validate Copilot intelligence with fake data

### Alternative 3: Vertical Slices
Build one feature end-to-end, then next feature.
- **Rejected**: Our features are highly interconnected (Copilot needs metrics, topology needs traces)
