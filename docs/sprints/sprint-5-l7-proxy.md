# Sprint 5: Layer 7 Load Balancing (Application Proxy)

**Goal**: Transform the basic reverse proxy into a fully configurable, rule-based Application Load Balancer with UI management.

## 1. Backend (`pkg/proxy` & `pkg/api`)

### Features
*   [ ] **Dynamic Configuration**: Replace hardcoded backends with a thread-safe `RouteTable` in `Proxy`.
*   [ ] **Path-Based Routing**: Support matching `/api/*` -> Backend A, `/static/*` -> Backend B.
*   [ ] **Health Checks**: Background worker to ping backends and mark `Alive` status.
*   [ ] **API Handler**: Implement `POST /api/v1/config` to accept full JSON config and atomically swap the proxy rules.

### Implementation Details
*   **File**: `pkg/proxy/proxy.go`
    *   Add `RouteTable` struct (Mutex protected).
    *   Update `ServeHTTP` to match request path against `RouteTable` before falling back to default.
*   **File**: `pkg/api/server.go`
    *   Update `handleConfig`: Parse JSON -> Validate -> Call `proxy.UpdateRoutes()`.

## 2. Frontend (`ui`)

### Architecture Overview
The UI follows a modular, component-based architecture with clear separation of concerns:
*   **State Management**: React Context for global proxy configuration state
*   **Data Flow**: Unidirectional data flow with explicit API boundary
*   **Component Hierarchy**: Container/Presentational pattern for testability
*   **Routing**: React Router for multi-view navigation

### Core Components

#### 2.1 Route Management (`ui/components/proxy/`)

##### **RouteTable Component** (`route-table.tsx`)
The main orchestrator component for route visualization and management.

**Props**:
```typescript
interface RouteTableProps {
  routes: Route[];
  onEdit: (route: Route) => void;
  onDelete: (routeId: string) => void;
  onReorder: (routes: Route[]) => void;
  loading?: boolean;
}
```

**Features**:
*   Sortable table with drag-and-drop reordering (priority matters for path matching)
*   Inline status indicators (health check results)
*   Bulk actions (enable/disable, delete multiple)
*   Column sorting (by path, target, priority, status)
*   Search/filter capabilities
*   Pagination for large route sets
*   Real-time updates via WebSocket or polling

**Visual Elements**:
*   Color-coded status badges (green=healthy, yellow=degraded, red=down, gray=disabled)
*   Request count sparklines (mini charts showing traffic over time)
*   Response time indicators (average latency badge)
*   Actions dropdown (Edit, Duplicate, Delete, Test)

**Implementation Details**:
```typescript
// Route data structure
interface Route {
  id: string;
  priority: number;
  path: string; // Glob pattern like /api/v1/*
  method?: string; // Optional: GET, POST, etc.
  target: string;
  weight?: number; // For weighted load balancing
  enabled: boolean;
  healthCheck?: HealthCheckConfig;
  metadata: {
    createdAt: string;
    updatedAt: string;
    requestCount: number;
    errorRate: number;
  };
}
```

##### **RouteEditor Component** (`route-editor.tsx`)
Modal or slide-out panel for creating and editing individual routes.

**Props**:
```typescript
interface RouteEditorProps {
  route?: Route; // undefined for new route
  open: boolean;
  onClose: () => void;
  onSave: (route: Route) => Promise<void>;
}
```

**Form Fields**:
*   **Path Pattern** (text input with validation)
    *   Real-time validation against glob syntax
    *   Preview matching examples
    *   Conflict detection (warns if overlaps with existing routes)
*   **HTTP Method** (dropdown: ANY, GET, POST, PUT, DELETE, PATCH)
*   **Target Backend** (combobox with autocomplete)
    *   URL validation
    *   Quick test button (send probe request)
    *   Recent backends dropdown
*   **Priority** (number input or drag-to-reorder in context)
*   **Weight** (slider 1-100 for weighted load balancing)
*   **Advanced Settings** (collapsible section):
    *   Timeout overrides
    *   Retry policy
    *   Circuit breaker settings
    *   Custom headers injection/removal
    *   Request/response transformations

**Validation**:
*   Client-side: Real-time path syntax validation
*   Server-side: Uniqueness check, reachability test
*   Error display: Inline field errors and summary banner

##### **BackendPool Component** (`backend-pool.tsx`)
Manages the pool of available backends that routes can target.

**Features**:
*   List view of all registered backends
*   Health status dashboard per backend
*   Add/Edit/Delete backends
*   Bulk health check trigger
*   Connection testing tool
*   Performance metrics (response time distribution)

**UI Elements**:
*   Grid or list view toggle
*   Status timeline (health check history graph)
*   Quick actions (Disable, Test Connection, View Logs)

##### **HealthCheckConfig Component** (`health-check-config.tsx`)
Embedded or standalone component for configuring health checks.

**Configuration Options**:
*   **Endpoint**: Path to health check (e.g., `/health`, `/ready`)
*   **Interval**: Seconds between checks (slider: 5-300s)
*   **Timeout**: Request timeout (slider: 1-30s)
*   **Healthy Threshold**: Consecutive successes before marking healthy
*   **Unhealthy Threshold**: Consecutive failures before marking unhealthy
*   **Expected Status Codes**: Comma-separated list (default: 200-299)
*   **Expected Response Body**: Optional regex match

#### 2.2 Monitoring & Visualization (`ui/components/monitoring/`)

##### **TrafficDashboard Component** (`traffic-dashboard.tsx`)
Real-time visualization of proxy traffic and performance.

**Panels**:
*   **Request Rate Graph**: Line chart showing requests/second over time
*   **Response Time Distribution**: Histogram of latency percentiles
*   **Status Code Breakdown**: Pie chart (2xx, 3xx, 4xx, 5xx)
*   **Top Routes**: Bar chart of most-trafficked paths
*   **Error Rate Alert**: Threshold-based warning banner

**Time Controls**:
*   Range selector: Last 5m, 15m, 1h, 6h, 24h, Custom
*   Auto-refresh toggle
*   Refresh rate selector (5s, 15s, 30s, 1m)

**Implementation**:
*   Use Recharts or D3.js for visualizations
*   WebSocket connection for live updates
*   Efficient data aggregation (only send deltas)

##### **LogViewer Component** (`log-viewer.tsx`)
Searchable, filterable access log viewer.

**Features**:
*   Virtual scrolling for performance with large logs
*   Real-time log streaming
*   Filters: Status code, path pattern, backend, time range
*   Search: Full-text search across log entries
*   Color-coded severity (info, warn, error)
*   Export to CSV/JSON
*   Log entry expansion (show full headers, body)

**Log Entry Structure**:
```typescript
interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  backend: string;
  clientIP: string;
  userAgent?: string;
  error?: string;
}
```

#### 2.3 Configuration Management (`ui/components/config/`)

##### **ConfigImportExport Component** (`config-import-export.tsx`)
Tools for managing proxy configuration as code.

**Features**:
*   **Export**: Download current config as JSON/YAML
*   **Import**: Upload and validate config file
*   **Version History**: List of previous configurations with rollback
*   **Diff Viewer**: Compare current vs. proposed config
*   **Dry Run**: Validate config without applying
*   **Templates**: Pre-built config templates (API gateway, static site, microservices)

##### **GlobalSettings Component** (`global-settings.tsx`)
Proxy-wide configuration options.

**Settings Categories**:
*   **Default Timeouts**: Read, write, idle timeouts
*   **Connection Pooling**: Max idle connections, keep-alive
*   **Rate Limiting**: Global and per-route limits
*   **SSL/TLS**: Certificate management, cipher suites
*   **Logging**: Log level, format, output destinations
*   **CORS**: Global CORS policy
*   **Compression**: Enable gzip/brotli, compression level

#### 2.4 Layout & Navigation (`ui/components/layout/`)

##### **ProxyLayout Component** (`proxy-layout.tsx`)
Main layout wrapper for proxy management views.

**Structure**:
```
┌─────────────────────────────────────┐
│ Header (App name, user menu)       │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │  Content Area            │
│          │                          │
│ - Routes │  <Outlet />              │
│ - Traffic│                          │
│ - Health │                          │
│ - Logs   │                          │
│ - Config │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

**Sidebar Navigation Items**:
*   **Routes** → RouteTable view
*   **Traffic** → TrafficDashboard
*   **Health** → HealthDashboard
*   **Logs** → LogViewer
*   **Backends** → BackendPool
*   **Settings** → GlobalSettings

**Header Elements**:
*   Breadcrumbs for navigation context
*   Global search
*   Notification bell (alerts, errors)
*   User menu (profile, logout)

##### **StatusBar Component** (`status-bar.tsx`)
Always-visible status indicator at top/bottom of page.

**Displays**:
*   Proxy status (Running, Stopped, Error)
*   Active routes count
*   Healthy backends count
*   Current request rate
*   Last config update time
*   Quick action: Emergency stop button

### State Management

#### Context Providers (`ui/context/`)

##### **ProxyConfigContext** (`proxy-config-context.tsx`)
Global state for proxy configuration and routes.

```typescript
interface ProxyConfigContextValue {
  routes: Route[];
  backends: Backend[];
  globalSettings: GlobalSettings;
  loading: boolean;
  error: Error | null;
  
  // Actions
  fetchConfig: () => Promise<void>;
  updateRoute: (route: Route) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  reorderRoutes: (routes: Route[]) => Promise<void>;
  updateGlobalSettings: (settings: GlobalSettings) => Promise<void>;
  exportConfig: () => Promise<string>;
  importConfig: (config: string) => Promise<void>;
}
```

##### **MonitoringContext** (`monitoring-context.tsx`)
Real-time monitoring data and WebSocket connection management.

```typescript
interface MonitoringContextValue {
  metrics: ProxyMetrics;
  logs: LogEntry[];
  connected: boolean;
  
  // Actions
  subscribe: (metric: string) => void;
  unsubscribe: (metric: string) => void;
  clearLogs: () => void;
}
```

### API Integration (`ui/services/`)

#### **ProxyAPIService** (`proxy-api.ts`)
Centralized API client for all proxy-related endpoints.

**Methods**:
```typescript
class ProxyAPIService {
  // Configuration
  async getConfig(): Promise<ProxyConfig>;
  async updateConfig(config: ProxyConfig): Promise<void>;
  async validateConfig(config: ProxyConfig): Promise<ValidationResult>;
  
  // Routes
  async getRoutes(): Promise<Route[]>;
  async createRoute(route: Route): Promise<Route>;
  async updateRoute(id: string, route: Route): Promise<Route>;
  async deleteRoute(id: string): Promise<void>;
  async reorderRoutes(routeIds: string[]): Promise<void>;
  
  // Backends
  async getBackends(): Promise<Backend[]>;
  async testBackend(url: string): Promise<HealthStatus>;
  async triggerHealthCheck(backendId: string): Promise<void>;
  
  // Monitoring
  async getMetrics(timeRange: TimeRange): Promise<Metrics>;
  async getLogs(filters: LogFilters): Promise<LogEntry[]>;
  async streamLogs(): WebSocket;
  
  // Config Management
  async exportConfig(): Promise<Blob>;
  async importConfig(file: File): Promise<ValidationResult>;
  async getConfigHistory(): Promise<ConfigVersion[]>;
  async rollbackConfig(versionId: string): Promise<void>;
}
```

#### **WebSocketService** (`websocket.ts`)
Manages WebSocket connections for real-time updates.

**Features**:
*   Auto-reconnection with exponential backoff
*   Subscription management
*   Message queuing during disconnection
*   Heartbeat/ping-pong

### Utilities (`ui/utils/`)

#### **Validation Utilities** (`validation.ts`)
```typescript
// Path pattern validation
validateGlobPattern(pattern: string): ValidationResult;

// URL validation
validateBackendURL(url: string): ValidationResult;

// Config schema validation
validateProxyConfig(config: unknown): ProxyConfig;

// Conflict detection
detectRouteConflicts(routes: Route[]): Conflict[];
```

#### **Formatting Utilities** (`formatting.ts`)
```typescript
// Format duration (ms -> human readable)
formatDuration(ms: number): string;

// Format request rate
formatRate(requestsPerSecond: number): string;

// Format bytes
formatBytes(bytes: number): string;

// Format timestamp
formatTimestamp(date: Date, relative?: boolean): string;
```

### Testing Strategy

#### Unit Tests
*   **Component Tests** (`*.test.tsx`):
    *   RouteTable: Rendering, sorting, filtering
    *   RouteEditor: Form validation, submission
    *   TrafficDashboard: Data visualization accuracy
*   **Hook Tests**:
    *   useProxyConfig: State updates, error handling
    *   useMonitoring: WebSocket connection management
*   **Utility Tests**:
    *   Validation functions with edge cases
    *   Formatting functions with various inputs

#### Integration Tests
*   **API Integration** (`*.integration.test.tsx`):
    *   RouteTable + API: Fetch and display routes
    *   RouteEditor + API: Create/update/delete routes
    *   ConfigImportExport + API: Export, modify, import workflow
*   **Context Integration**:
    *   ProxyConfigContext: Multiple components sharing state
    *   MonitoringContext: Real-time updates flowing to components

#### E2E Tests
*   **User Workflows** (Playwright/Cypress):
    *   Add a new route -> Verify it appears in table -> Edit it -> Delete it
    *   Import config file -> Review changes -> Apply -> Verify routes updated
    *   Monitor traffic dashboard -> Filter logs by route -> Export logs
    *   Health check failure -> Route automatically disabled -> Re-enable manually

### Accessibility (a11y)

*   **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape, Arrow keys)
*   **Screen Readers**: ARIA labels, live regions for dynamic content
*   **Focus Management**: Focus trap in modals, focus restoration
*   **Color Contrast**: WCAG AA compliant (4.5:1 for normal text)
*   **Error Announcements**: Screen reader announcements for errors
*   **Skip Links**: Skip to main content, skip to navigation

### Responsive Design

*   **Breakpoints**:
    *   Mobile: < 640px (stacked layout, simplified tables)
    *   Tablet: 640px - 1024px (collapsible sidebar)
    *   Desktop: > 1024px (full layout)
*   **Mobile Considerations**:
    *   Bottom navigation for key actions
    *   Swipe gestures for route actions
    *   Simplified charts (fewer data points)
    *   Touch-friendly hit targets (min 44x44px)

### Performance Optimizations

*   **Code Splitting**: Lazy load monitoring components
*   **Memoization**: React.memo for pure components
*   **Virtual Scrolling**: For long route lists and logs
*   **Debouncing**: Search inputs, live config validation
*   **Caching**: API responses with SWR or React Query
*   **Bundle Size**: Tree-shaking, dynamic imports

### Error Handling

*   **API Errors**: Toast notifications with retry action
*   **Validation Errors**: Inline field errors with helpful messages
*   **Network Errors**: Offline indicator, queue actions
*   **Unexpected Errors**: Error boundary with fallback UI
*   **User Guidance**: Contextual help tooltips, empty states with CTAs

### Documentation

*   **Component Storybook**: Visual documentation of all components
*   **API Documentation**: JSDoc comments for all public APIs
*   **User Guide**: In-app help panel with common workflows
*   **Release Notes**: Changelog component for new features

## 3. Testing

### Backend Testing
*   **Integration**: `TestProxyConfiguration` - verify changing config redirects traffic immediately.
*   **Unit**: `TestRouteMatching` - verify glob patterns match correctly.
*   **Load**: `TestConcurrentRequests` - verify thread-safe route updates.

### Frontend Testing
*   **Unit**: Component rendering, state management, utility functions.
*   **Integration**: API service interactions, context providers.
*   **E2E**: Complete user workflows from route creation to monitoring.
*   **Visual Regression**: Screenshot comparisons for UI consistency.
*   **Performance**: Lighthouse scores, bundle size tracking.
