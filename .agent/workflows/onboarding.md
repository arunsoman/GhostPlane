---
description: Onboarding flow for NLB+ including kernel audit and node initialization
---

The NLB+ onboarding workflow ensures the host environment is capable of running eBPF-accelerated networking before the control plane is activated.

## Phase 1: Capability Audit
// turbo
1. The UI calls `/api/v1/setup/check` when the user enters the `/setup` route.
2. The backend (`pkg/setup/capability.go`) probes the host for:
   - Kernel version compatibility (e.g., > 5.10 recommended).
   - eBPF privileges (`CAP_SYS_ADMIN` or root).
   - XDP/TC support heuristic.
   - BTF support for CO-RE (Compile Once, Run Everywhere).
   - Deployment environment (Native vs. Dockerized).
3. The UI displays the audit results with a "Pass/Warning/Fail" status for each item.

## Phase 2: Node Identification
1. The user provides a unique `Cluster Node Name`.
2. This name is used for telemetry naming and routing identity across the mesh.

## Phase 3: Plane Activation
1. The user confirms the configuration.
2. The UI calls `/api/v1/setup/initialize` via POST.
3. The backend:
   - Persists the node configuration to the internal SQLite store (`pkg/db`).
   - Marks the setup as complete in the persistent settings.
   - (Future) Signals the eBPF manager to load data plane maps.
4. The user is redirected to the main Dashboard.

## UI Components
- `ui/app/setup/page.tsx`: The multi-step wizard implementation.
- `ui/components/StatusItem`: Reusable status indicator for audit results.
