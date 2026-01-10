# Component Specifications

Specs for custom, high-complexity UI components.

## 1. Copilot Chat Widget (`<CopilotChat />`)

A persistent, context-aware chat interface.

### Features
*   **Streaming Markdown**: Renders tokens as they arrive.
*   **Reasoning Accordion**: Collapsible section showing `[thought] Checking metrics...` logs.
*   **Code Blocks**: Syntax-highlighted YAML/JSON with "Copy" and "Diff" buttons.
*   **Action Chips**: Suggested next steps buttons (e.g., "Apply Config", "Rollback").

### Props
```typescript
interface CopilotChatProps {
  context: "global" | "service" | "incident";
  contextId?: string; // e.g., service_name
  initialPrompt?: string;
}
```

## 2. Topology Graph (`<NetworkGraph />`)

Interactive force-directed graph using React Flow.

### Visual States
*   **Node Types**: `Gateway`, `Service`, `Database`, `External`.
*   **Edge Styles**:
    *   Solid Gray: Normal traffic.
    *   Animated Green dots: Active high throughput.
    *   Pulsing Red: Error rate > threshold.
    *   Dashed: Shadow traffic.

### Interactions
*   **Node Hover**: Tooltip with quick stats (RPS, Latency).
*   **Node Select**: Updates global filter context.
*   **Background Click**: Resets filters.

## 3. Diff Viewer (`<ConfigDiff />`)

Visual comparison for Migration and Config changes.

### features
*   **Side-by-Side**: Standard split view.
*   **Syntax Highlighting**: YAML/JSON/Nginx-conf.
*   **Intelligent Folding**: Collapse unchanged sections.
*   **Annotation**: Copilot comments inline (e.g., "⚠️ This change removes SSL termination").

## 4. WAF Rule Editor (`<WAFEditor />`)

Visual builder for security rules.

### Layout
*   **Top**: Rule metadata (Name, Severity, Action).
*   **Middle**: Condition Builder (AND/OR logic).
    *   `Source IP` `in` `Countries(US, CA)`
    *   `Header[User-Agent]` `matches` `BotRegex`
*   **Bottom**: "Impact Preview" (Histogram of matching requests from last hour).
