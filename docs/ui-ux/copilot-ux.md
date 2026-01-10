# Copilot UI/UX Specification

This document defines the user experience for the **Network Copilot** - our flagship USP feature.

## 1. Copilot Presence & Discoverability

### 1.1 Global Access
*   **Floating Action Button (FAB)**: Bottom-right corner, gradient violet-to-cyan.
    *   Icon: Sparkle ✨
    *   Tooltip: "Ask Copilot" (Cmd/Ctrl+K shortcut)
*   **Contextual Triggers**: Appear inline when hovering over:
    *   Red metrics (errors, latency spikes)
    *   Yellow warnings (degraded health)
    *   Config sections (with "Explain this" option)

### 1.2 Chat Interface States

#### State: Idle
*   Placeholder: "Ask me anything about your network..."
*   Suggested prompts (rotating):
    *   "Why is /api/checkout slow?"
    *   "Show me recent security threats"
    *   "Generate a canary deployment config"

#### State: Thinking
*   Animated gradient border pulse
*   Streaming "thoughts" in muted text:
    ```
    [Checking metrics for /api/checkout...]
    [Querying logs from last 5 minutes...]
    [Correlating with backend health checks...]
    ```

#### State: Response
*   Markdown-rendered answer with:
    *   **Code blocks**: Syntax-highlighted YAML/JSON
    *   **Action buttons**: "Apply Config", "Show Diff", "Rollback"
    *   **Confidence badge**: 🟢 High (>90%) | 🟡 Medium (70-90%) | 🔴 Low (<70%)

## 2. The "Reasoning Trail" Component

A collapsible accordion showing the Copilot's chain-of-thought.

### Visual Structure
```
┌─ Reasoning Trail ────────────────────────────────┐
│ ▼ Step 1: Analyzed Metrics                      │
│   • Latency P99: 2.3s (↑150% from baseline)     │
│   • Error Rate: 0.02% (normal)                   │
│                                                   │
│ ▼ Step 2: Checked Logs                          │
│   • Found 45 "Connection timeout" errors         │
│   • All from backend pod-3                       │
│                                                   │
│ ▼ Step 3: Root Cause                            │
│   • Pod-3 CPU: 98% (OOM imminent)                │
│   • Recommendation: Scale or restart             │
└───────────────────────────────────────────────────┘
```

### Interaction
*   **Default**: Collapsed (shows only final answer)
*   **Expand**: Click "Show Reasoning" to see full trail
*   **Audit**: Each step links to the actual data source (metric query, log line)

## 3. "Apply Fix" Workflow

When Copilot suggests a config change:

### Step 1: Preview
*   **Diff View**: Side-by-side comparison (Current vs Proposed)
*   **Impact Analysis**: 
    ```
    Expected Changes:
    • Routes affected: 3
    • Estimated downtime: 0s (hot reload)
    • Rollback available: Yes
    ```

### Step 2: Confirmation Modal
*   **Title**: "Apply Copilot Suggestion?"
*   **Warning** (if high-risk): ⚠️ "This will modify production routing"
*   **Buttons**:
    *   "Apply" (Primary, Violet)
    *   "Apply in Shadow Mode" (Secondary, test first)
    *   "Cancel" (Ghost)

### Step 3: Execution Feedback
*   **Progress**: Linear progress bar with status text
    ```
    Validating config... ✓
    Updating control plane... ⏳
    Reloading proxies... 
    ```
*   **Success**: Green toast notification with "View Audit Log" link
*   **Failure**: Red alert with "Rollback" button

## 4. Confidence Indicators

Visual representation of AI certainty:

| Confidence | Badge | Color | Meaning |
| :--- | :--- | :--- | :--- |
| **High (>90%)** | 🟢 High | Emerald | Safe to auto-apply |
| **Medium (70-90%)** | 🟡 Medium | Amber | Review recommended |
| **Low (<70%)** | 🔴 Low | Rose | Manual verification required |

## 5. Error Handling & Fallbacks

### When Copilot Can't Answer
*   **Message**: "I couldn't find a definitive answer, but here's what I found..."
*   **Partial Results**: Show metrics/logs that were queried
*   **Escalation**: "Would you like me to create a support ticket?"

### When LLM is Unavailable
*   **Fallback UI**: Copilot button shows "Offline" state
*   **Alternative**: Direct links to Metrics/Logs dashboards
