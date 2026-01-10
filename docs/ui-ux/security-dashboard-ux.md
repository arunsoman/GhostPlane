# Security Dashboard UI/UX Specification

This document defines the user experience for the **Unified Security Plane** - our core USP feature.

## 1. Security Dashboard Layout

### Top Bar: Threat Level Indicator
*   **Visual**: Horizontal bar with gradient fill
    *   🟢 Green: No active threats
    *   🟡 Amber: Elevated (potential attacks detected)
    *   🔴 Red: Critical (active DDoS or intrusion)
*   **Metric**: "Threat Score: 23/100" (ML-generated)

### Main Grid (3 Columns)
```
┌─────────────┬─────────────┬─────────────┐
│ Live Threat │   Attack    │   WAF       │
│    Feed     │ Topology    │   Rules     │
│             │             │             │
│ (Scrolling  │ (Network    │ (Editable   │
│  Events)    │  Graph)     │  Table)     │
└─────────────┴─────────────┴─────────────┘
```

## 2. Live Threat Feed Component

### Event Card Structure
```
┌─ [BLOCKED] DDoS Attempt ──────────────────┐
│ 🔴 Critical                    2m ago      │
│                                            │
│ Source: 203.0.113.45 (Russia)              │
│ Target: /api/login                         │
│ Pattern: SYN Flood (15k req/s)             │
│                                            │
│ Action: Auto-blocked for 1h                │
│ Confidence: 🟢 98%                         │
│                                            │
│ [View Details] [Whitelist IP]              │
└────────────────────────────────────────────┘
```

### Real-time Updates
*   **Animation**: New events slide in from top with subtle glow
*   **Sound** (optional): Soft "ping" for Critical events
*   **Grouping**: Collapse similar events (e.g., "45 more from same IP")

## 3. Attack Topology Visualization

### Purpose
Show the *flow* of an attack through the network.

### Visual Elements
*   **Attacker Nodes**: Red pulsing circles (size = request volume)
*   **Gateway Node**: Hexagon (center)
*   **Legitimate Traffic**: Thin gray lines
*   **Attack Traffic**: Thick red animated lines with particles

### Interaction
*   **Hover Attacker Node**: Tooltip shows IP, Country, Attack Type
*   **Click Attacker Node**: Opens "Block IP" modal with CIDR options
*   **Time Slider**: Replay attack progression over last hour

## 4. Context-Aware WAF Feedback

### The Problem
Traditional WAFs block SQL in all contexts. We're smarter.

### Visual Indicator
When a WAF rule is triggered but *allowed* due to context:

```
┌─ [ALLOWED] SQL Detected ──────────────────┐
│ 🟡 Info                        Just now    │
│                                            │
│ Pattern: SELECT * FROM users               │
│ Context: Code Editor (Monaco)             │
│ Reason: Legitimate dev tool usage         │
│                                            │
│ [View Request] [Adjust Rule]               │
└────────────────────────────────────────────┘
```

### Context Detection UI
In WAF Rule Editor, show:
*   **Application Type**: Dropdown (API, Web App, Dev Tool, Admin Panel)
*   **Context Exceptions**: Checkboxes
    *   ☑ Allow SQL in code editors
    *   ☑ Allow `<script>` in HTML sanitizer demos
    *   ☐ Allow admin paths from public IPs

## 5. DDoS vs Flash Crowd Differentiation

### The Challenge
Show *why* the AI classified traffic as attack vs legitimate spike.

### Comparison Card
```
┌─ Traffic Spike Analysis ──────────────────┐
│ 🟢 Classified as: Flash Crowd             │
│                                            │
│ Evidence:                                  │
│ ✓ Gradual ramp-up (not instant)           │
│ ✓ Diverse source IPs (87 countries)       │
│ ✓ Normal User-Agent distribution          │
│ ✓ Session cookies present                 │
│                                            │
│ If this were a DDoS:                       │
│ ✗ Would see: Botnet IPs, no cookies       │
│                                            │
│ [Override: Mark as Attack]                 │
└────────────────────────────────────────────┘
```

## 6. WAF Rule Impact Preview

### Feature
Before saving a new WAF rule, show its impact on *past traffic*.

### UI Flow
1.  User types regex: `(?i)(union|select)`
2.  **Real-time Query**: Runs against last 1 hour of logs
3.  **Results Display**:
    ```
    Impact Preview (Last 1 Hour):
    • Requests matched: 1,247
    • Legitimate blocked: 145 (11.6%) ⚠️
    • Attacks blocked: 1,102 (88.4%) ✓
    
    Top False Positives:
    • /api/search?q=select+product
    • /docs/sql-tutorial
    ```
4.  **Recommendation**: "Consider adding exception for `/docs/*`"

## 7. Accessibility & Keyboard Navigation

### Critical Paths
*   **Threat Feed**: Arrow keys to navigate events, Enter to expand
*   **Block IP**: Ctrl+B shortcut when event is focused
*   **WAF Editor**: Tab through condition builder, Ctrl+S to save

### Screen Reader Support
*   Announce new threats: "Critical threat detected from IP 203.0.113.45"
*   Describe topology: "Network graph showing 3 active attacks"
