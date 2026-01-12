# GhostPlane (NLB+) Feature Reference Flows

This document provides detailed step-by-step flows for key features, outlining the interactions between the User, UI, and System/Backend.

## 1. Health Check Configuration Flow
**Focus**: Resolving the UI-Backend disconnect.

| Step | Actor | Action | UI Feedback | System/Backend Task |
| :--- | :--- | :--- | :--- | :--- |
| 1 | User | Opens route editor | Modal displays (Health Check collapsed) | - |
| 2 | User | Expands "Advanced Settings" | Panel expands with animation | Pre-fills with defaults (10s interval, 2s timeout) |
| 3 | User | Modifies interval to 5s | Warning: "Low interval may cause high CPU" | Validates (interval >= 5, timeout < interval) |
| 4 | User | Clicks "Save Route" | Shows loading spinner | Serializes config with health check fields |
| 5 | Backend | Receives POST /api/routes | - | Deserializes into `ConfigRoute` with ALL fields |
| 6 | Backend | Initializes health checker | - | Uses config interval (5s) instead of hardcoded 10s |
| 7 | System | Starts health checking | Modal closes, list refreshes | Every 5s: GET target/health, track failures |
| 8 | User | Views route list |Indicator: 🟢 Healthy (2/2 up) | Real-time status based on actual checks |

---

## 2. Advanced Routing Rules Flow
**Focus**: Header, query param, and host-based routing.

| Step | Actor | Action | UI Feedback | System/Backend Task |
| :--- | :--- | :--- | :--- | :--- |
| 1 | User | Clicks "Advanced Rules" tab | Shows empty state instructions | - |
| 2 | User | Clicks "+ Add Condition" | Dropdown appears (Header/Query/Host/Cookie) | - |
| 3 | User | Selects "Header" | Input fields: [Name] [Operator] [Value] | Pre-fills common headers (X-User-Type, etc.) |
| 4 | User | Enters condition | Live preview: "Header X-User-Type: premium -> Match" | Validates header name syntax |
| 5 | User | Adds second condition | Logic toggle: Match ALL (AND) / ANY (OR) | - |
| 6 | User | Toggles to "Match ANY" | Preview: "Matches if EITHER condition is true" | Updates `rule.matchLogic = "OR"` |
| 7 | User | Clicks "Test This Route" | Test modal opens with request builder | - |
| 8 | User | Enters sample request | Result: ✓ MATCHES (Condition 2 matches) | Simulates engine without saving |
| 9 | User | Saves route | Success message with logic link | Compiles rules into efficient matcher |

---

## 3. Load Balancing Configuration Flow
**Focus**: Algorithm selection and weighting.

| Step | Actor | Action | UI Feedback | System/Backend Task |
| :--- | :--- | :--- | :--- | :--- |
| 1 | User | Adds 3 backend targets | Target list shows RR as default | Initializes equal distribution (33.3%) |
| 2 | User | Opens algorithm dropdown | List of algorithms (RR, LC, Hash, Weighted, Rad) | - |
| 3 | User | Hovers / Selects "Least Conn" | Tooltip explanation appears | - |
| 4 | User | Selects "Weighted" | Weight sliders appear per target | - |
| 5 | User | Sets custom weights | Pie chart updates (e.g., 57%, 29%, 14%) | Calculates percentages (weight/sum) |
| 6 | User | Saves route | Confirmation of distribution percentages | Stores algorithm + weights in config |
| 7 | System | Request arrives | - | Weighted random selection |
| 8 | User | Views metrics | Shows actual distribution (e.g., 56.8%) | Tracks request counts per target |

---

## 4. Traffic Splitting / Canary Flow
**Focus**: Gradual rollouts and A/B testing.

| Step | Actor | Action | UI Feedback | System/Backend Task |
| :--- | :--- | :--- | :--- | :--- |
| 1 | User | Enables "Traffic Splitting" | UI transforms into split groups | Removes default LB selector |
| 2 | User | Views initial state | "Production Group - 100%" | - |
| 3 | User | Adds Split Group | "Group 2 - 0%" with empty targets | Auto-adjusts (90% / 10%) |
| 4 | User | Renames / Adds target | Remaining % shown prominently | - |
| 5 | User | Drags slider to 20% | Auto-adjusts Prod to 80% | Validates sum = 100% |
| 6 | User | Clicks "Preview Distribution" | Shows sample visualization (e.g., 80/20) | - |
| 7 | User | Saves route | Message: "Canary deployment active" | Stores splits with percentages |
| 8 | System | Request arrives | - | Hash request ID -> Route to group |
| 9 | User | Checks metrics | Dashboard shows separate stats per group | Aggregates per split group |

---

## 5. Circuit Breaker Flow
**Focus**: Preventing cascading failures.

| Step | Actor | Action | UI Feedback | System/Backend Task |
| :--- | :--- | :--- | :--- | :--- |
| 1 | User | Enables Circuit Breaker | State diagram: Closed -> Open -> Half-Open | Initializes state machine |
| 2 | User | Sets thresholds/durations | Explanation of behavior per settings | - |
| 3 | System | Backend begins failing | - | Tracks consecutive failures |
| 4 | System | Threshold reached | - | trips to OPEN state, starts timer |
| 5 | System | Request arrives (OPEN) | - | Returns 503 (immediate failure) |
| 6 | User | Views dashboard | Target status: 🔴 OPEN | - |
| 7 | System | Timer elapses | - | Transitions to HALF-OPEN |
| 8 | System | Sends test requests | - | Monitors success rate of test batch |
| 9 | System | Tests succeed | - | Closes circuit, resumes normal routing |
| 10 | User | Receives notification | Alert: "Target X has recovered" | Clears incident metrics |

---

## 6. Rate Limiting Flow
**Focus**: Protecting backends from overload.

| Step | Actor | Action | UI Feedback | System/Backend Task |
| :--- | :--- | :--- | :--- | :--- |
| 1 | User | Enables Rate Limiting | Config options: Limit, Period, Burst, Key | - |
| 2 | User | Sets 100 req/min, Burst 20 | Calculator shows total reqs per day | - |
| 3 | User | Customizes response | JSON editor with syntax validation | Validates JSON |
| 4 | System | Request arrives | - | Creates/Updates token bucket for key (IP) |
| 5 | System | Under limit | - | Consumes token, routes request |
| 6 | System | Exceeds tokens (uses burst) | - | Consumes burst tokens |
| 7 | System | Empty bucket | - | Returns 429 with custom JSON |
| 8 | Client | Receives 429 | - | Includes `Retry-After` header |
| 9 | User | Views dashboard | Top IPs rate-limited, % of dropped reqs | Aggregates bucket stats |
