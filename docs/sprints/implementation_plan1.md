# Implementation Plan - Sprint 3: UI Core

Implementation of the NLB+ Management Dashboard using Next.js and React. This sprint focuses on the core UI, real-time metrics, and the Network Copilot interface.

## User Review Required

> [!IMPORTANT]
> We are using **Vanilla CSS** for styling to maintain maximum control, as per the web application development guidelines.
> Coverage requirement is **100%** for all new React components and hooks.

## Proposed Changes

### [UI Dashboard]

#### [MODIFY] [layout.tsx](file:///home/arun/GhostVM/nlb/ui/app/layout.tsx)
- Define global styles and fonts (Inter/Outfit).
- Implement a responsive sidebar and top navigation bar.

#### [NEW] [Dashboard Page](file:///home/arun/GhostVM/nlb/ui/app/page.tsx)
- Main landing page with a bird's-eye view of the system.
- Summary cards for Active Connections, RPS, and Error Rate.

#### [NEW] [Metrics Components](file:///home/arun/GhostVM/nlb/ui/components/MetricsChart.tsx)
- Visualization of real-time latency and traffic trends.
- Fetching data from `/api/metrics`.

#### [NEW] [Copilot Interface](file:///home/arun/GhostVM/nlb/ui/components/CopilotChat.tsx)
- Slide-over or dedicated page for interacting with the Network Copilot.
- Integrated with the LangGraph backend.

## Verification Plan

### Automated Tests
- **Unit Tests**: `npm test` using Jest and React Testing Library.
- **Coverage**: `npm run test:coverage` to ensure 100% line coverage.
- **Mocking**: Use MSW (Mock Service Worker) to mock the Go API during UI tests.

### Manual Verification
- Verify responsiveness on mobile, tablet, and desktop.
- Check accessibility (ARIA labels, keyboard navigation).
- Verify real-time updates of metrics.
