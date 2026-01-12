# ADR 003: Template Deployment Visibility & Notification Strategy

## Status
Accepted

## Context
When a user deploys a template (e.g., "Blue-Green Deployment"), the changes must be immediately reflected across the entire system:
1.  **L7 Proxy**: Must start routing traffic based on new rules.
2.  **L4 eBPF**: Must open new ports or apply firewall rules.
3.  **Dashboard**: Must show the deployment as "Active" and display the new routes.

We needed a strategy to ensure these components are synchronized and the UI is updated in real-time.

## Decision
We have decided to verify and propagate deployment changes using an **Event-Driven Architecture** powered by **Server-Sent Events (SSE)**.

### 1. Direct Integration
The `TemplateHandler` will directly manipulate the runtime components (`Proxy`, `eBPF Loader`, `Store`) instead of just returning a rendered configuration. This ensures that a successful HTTP 200 response from the deploy endpoint guarantees the system state has changed.

### 2. Real-Time Notification (SSE)
We will leverage the existing `/api/v1/stream` endpoint to broadcast deployment events.

*   **Why SSE?**
    *   **Low Latency**: UI updates are push-based and immediate.
    *   **Efficiency**: Eliminates the overhead of polling.
    *   **Simplicity**: We already have an SSE implementation for logs/metrics.
*   **Event Structure**:
    ```json
    event: deployment
    data: {
      "id": "deploy-123",
      "template_id": "blue-green",
      "status": "active",
      "timestamp": 1234567890
    }
    ```

## Consequences
*   **Positive**: Users see instant feedback. System state is always consistent.
*   **Negative**: Slight increase in coupling between `TemplateHandler` and core components.
