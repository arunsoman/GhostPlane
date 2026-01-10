# UX Patterns & Flows

This document defines the interaction models for key NLB+ workflows.

## 1. Copilot-First Interaction
**Philosophy**: AI is not a sidebar; it is an integrated operator.

### Pattern: "Contextual Assist"
*   **Trigger**: User hovers over a red metric (e.g., 500 error spike).
*   **Action**: A small "Sparkle" button appears: "Analyze Root Cause".
*   **Flow**:
    1.  Click "Analyze".
    2.  Drawer slides open from right (Glassmorphism).
    3.  Streaming text shows "Checking logs... Found correlation...".
    4.  Result displayed with "Apply Fix" button.

## 2. The "Traceability" Drill-Down
**Philosophy**: Never hit a dead end. Every data point links to its source.

### Pattern: "Metrics to Logs to Traces"
*   **View**: Service Dashboard -> Latency Chart.
*   **Interaction**: Click a spike on the chart.
*   **Transition**: Navigate to **Traces View**, pre-filtered for that timeframe and service.
*   **Detail**: Selecting a Trace ID opens the **Waterfall View**, revealing exactly which span caused the delay.

## 3. Migration Mode (Shadow Traffic)
**Philosophy**: Fearless changes.

### Pattern: "The Split View"
*   **Context**: Testing a new imported Nginx config vs old config.
*   **Layout**: Vertical Split Screen.
    *   **Left**: Current Config (Live).
    *   **Right**: Candidate Config (Shadow).
*   **Visuals**:
    *   Center column shows "Diff" metrics (e.g., "Error Rate: +0.01%").
    *   Green/Red indicators highlight regressions.
*   **Action**: "Promote Candidate" button (converts Shadow to Live).

## 4. Visual Topology Navigation
**Philosophy**: Structure over tables.

### Pattern: "Graph-Based Filtering"
*   **Context**: Global Dashboard.
*   **Layout**: Interactive node graph.
*   **Interaction**:
    1.  Click "Gateway" node -> Side panel shows Aggregated Throughput.
    2.  Double-click "Gateway" -> Zooms into "Route" view.
    3.  Click "Service A" node -> Filters the entire dashboard (Logs/Metrics) to "Service A" context.

## 5. Security & WAF Rules
**Philosophy**: Transparency in blocking.

### Pattern: "Rule Simulation"
*   **Context**: Creating a new WAF rule.
*   **Interaction**:
    1.  Type Regex/Pattern.
    2.  Real-time query runs against *past 1 hour of traffic*.
    3.  Feedback: "This rule would have blocked 145 legitimate requests".
    4.  User adjusts rule until false positives drop to zero.
