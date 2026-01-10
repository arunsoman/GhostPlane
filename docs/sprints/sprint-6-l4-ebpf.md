# Sprint 6: Layer 4 Load Balancing (eBPF/XDP)

**Goal**: Implement high-performance non-terminating load balancing using XDP, managed via the UI.

## 1. Backend (`pkg/ebpf` & `C`)

### Features
*   [ ] **Dynamic Map Management**: Ensure `loader.go` can add/remove IPs from the `backend_pool` BPF map at runtime.
*   [ ] **Stats Collection**: Read `xdp_stats_map` (drop/pass counters) periodically.
*   [ ] **API Integration**: Extend `POST /api/v1/config` to also handle `l4_backends` list.

### Implementation Details
*   **File**: `pkg/ebpf/loader.go`
    *   Implement `AddBackend(ip)` and `RemoveBackend(ip)` using `ebpf.Map` APIs.
    *   Implement `GetStats()` -> returns `{ drops, packets, bytes }`.
*   **File**: `pkg/ebpf/programs/xdp_lb.c` (Existing)
    *   Verify map definitions match Go struct alignment.

## 2. Frontend (`ui`)

### Architecture Overview
The eBPF/XDP UI layer provides real-time visualization and management of kernel-level packet processing with emphasis on:
*   **Performance Metrics**: Sub-millisecond latency visualization
*   **Kernel Safety**: Validation layers to prevent kernel crashes
*   **Network Topology**: Visual representation of packet flow
*   **Live Monitoring**: Real-time statistics from eBPF maps
*   **Capacity Planning**: Predictive analytics for scaling decisions

### Core Components

#### 2.1 Network Topology & Visualization (`ui/components/ebpf/`)

##### **PacketFlowVisualizer Component** (`packet-flow.tsx`)
Interactive Sankey diagram showing packet flow from NIC through XDP to various outcomes.

**Props**:
```typescript
interface PacketFlowVisualizerProps {
  stats: XDPStats;
  backends: L4Backend[];
  timeRange: TimeRange;
  refreshInterval?: number; // milliseconds
  onNodeClick?: (node: FlowNode) => void;
}
```

**Data Structure**:
```typescript
interface XDPStats {
  timestamp: number;
  nic: {
    interface: string; // e.g., "eth0"
    rxPackets: number;
    rxBytes: number;
    rxRate: number; // packets/sec
  };
  xdp: {
    processed: number;
    dropped: number;
    passed: number;
    redirected: number;
    aborted: number; // XDP_ABORTED errors
    txBounced: number; // XDP_TX packets
  };
  perBackend: Map<string, BackendStats>; // IP -> stats
  errors: XDPError[];
}

interface BackendStats {
  ip: string;
  packets: number;
  bytes: number;
  connections: number;
  lastSeen: number;
}
```

**Visualization Features**:
*   **Flow Animation**: Animated particles flowing from NIC → XDP → Destinations
*   **Width Proportional to Traffic**: Thicker flows = more packets
*   **Color Coding**:
    *   Green: XDP_PASS (forwarded to kernel)
    *   Blue: XDP_REDIRECT (sent to backend)
    *   Red: XDP_DROP (filtered/rate-limited)
    *   Yellow: XDP_TX (bounced back)
    *   Gray: XDP_ABORTED (errors)
*   **Hover Tooltips**: Detailed packet counts, percentages, rates
*   **Click Actions**: Node click → Drill down into backend details
*   **Zoom & Pan**: For complex topologies with many backends

**Layout Structure**:
```
[NIC: eth0]
   │ 10M pps
   ├─────────────────────┐
   │                     │
[XDP Program]       [XDP Program Stats]
   │ 9.8M passed      - CPU: 5%
   │ 150K dropped     - Memory: 2MB
   │ 50K redirected   - Program: xdp_lb_v1
   │                  - Attached: 2h 34m
   │
   ├──────┬──────┬──────┬──────
   │      │      │      │
Backend Backend Backend Kernel
10.0.1.1 10.0.1.2 10.0.1.3 Stack
```

**Implementation Details**:
*   Use `react-flow` or `d3-sankey` for diagram rendering
*   WebGL acceleration for smooth animations with high packet rates
*   Adaptive sampling: Show all flows at low rates, aggregate at high rates
*   Performance optimization: Canvas rendering for > 100 backends

##### **NetworkTopologyMap Component** (`network-topology-map.tsx`)
Graph-based visualization of network infrastructure and backend relationships.

**Features**:
*   **Node Types**:
    *   NIC nodes (network interfaces)
    *   XDP program nodes (attached to NICs)
    *   Backend pool nodes (logical grouping)
    *   Individual backend nodes (servers)
*   **Edge Types**:
    *   Physical connections (NIC to network)
    *   Logical routing (XDP to backends via Maglev)
    *   Health check paths (monitor to backends)
*   **Layout Algorithms**:
    *   Hierarchical (default): NIC → XDP → Pools → Backends
    *   Force-directed: Show natural clustering
    *   Circular: Equal weight distribution
*   **Interactive Features**:
    *   Drag nodes to rearrange
    *   Multi-select for bulk operations
    *   Mini-map for navigation in large topologies
    *   Search and highlight
*   **Overlays**:
    *   Heat map: Color nodes by utilization
    *   Flow map: Animated traffic flows
    *   Alert overlay: Highlight failing nodes

##### **XDPProgramManager Component** (`xdp-program-manager.tsx`)
Interface for loading, unloading, and managing XDP programs on network interfaces.

**Props**:
```typescript
interface XDPProgramManagerProps {
  programs: XDPProgram[];
  interfaces: NetworkInterface[];
  onAttach: (program: string, iface: string, mode: XDPMode) => Promise<void>;
  onDetach: (iface: string) => Promise<void>;
  onReload: (iface: string) => Promise<void>;
}
```

**Data Structures**:
```typescript
interface XDPProgram {
  id: string;
  name: string;
  version: string;
  source: string; // C source file path
  compiled: boolean;
  bytecode?: Uint8Array;
  metadata: {
    author: string;
    description: string;
    createdAt: string;
    maps: BPFMapInfo[];
  };
}

interface NetworkInterface {
  name: string; // eth0, ens3, etc.
  index: number;
  mtu: number;
  state: 'up' | 'down' | 'unknown';
  attachedProgram?: {
    id: string;
    mode: 'SKB' | 'DRV' | 'HW'; // XDP modes
    attachedAt: string;
  };
  capabilities: {
    xdpSupported: boolean;
    xdpDriverMode: boolean;
    xdpHardwareMode: boolean;
  };
  stats: {
    rxPackets: number;
    txPackets: number;
    rxBytes: number;
    txBytes: number;
    errors: number;
    dropped: number;
  };
}
```

**UI Features**:
*   **Program Library**: Card view of available XDP programs
*   **Compilation Status**: Visual indicators (compiled, needs rebuild, failed)
*   **Attachment Wizard**:
    *   Step 1: Select program
    *   Step 2: Select interface
    *   Step 3: Choose mode (SKB/DRV/HW) with capability warnings
    *   Step 4: Confirm and attach
*   **Safety Checks**:
    *   Verify program compiled successfully
    *   Check interface supports chosen mode
    *   Warn about production traffic impact
    *   Require confirmation for destructive actions
*   **Hot Reload**: Replace running program without dropping packets
*   **Rollback**: One-click revert to previous program version

#### 2.2 Backend Management (`ui/components/ebpf/`)

##### **L4BackendList Component** (`l4-backend-list.tsx`)
Comprehensive management interface for Layer 4 backends.

**Props**:
```typescript
interface L4BackendListProps {
  backends: L4Backend[];
  maglev: MaglevConfig;
  onAdd: (backend: L4Backend) => Promise<void>;
  onRemove: (ip: string) => Promise<void>;
  onUpdate: (ip: string, backend: Partial<L4Backend>) => Promise<void>;
  onTestConnection: (ip: string) => Promise<ConnectionTestResult>;
}
```

**Data Structures**:
```typescript
interface L4Backend {
  ip: string;
  port?: number; // Optional for port-specific routing
  weight: number; // Maglev weight (1-100)
  enabled: boolean;
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    lastCheck: string;
    consecutiveFailures: number;
    latency?: number; // milliseconds
    errorRate?: number; // percentage
  };
  metadata: {
    addedAt: string;
    updatedAt: string;
    label?: string;
    tags: string[];
    datacenter?: string;
    rack?: string;
  };
  stats: {
    totalConnections: number;
    activeConnections: number;
    packetsProcessed: number;
    bytesProcessed: number;
    errors: number;
  };
  maglevPosition: number[]; // Positions in Maglev lookup table
}

interface MaglevConfig {
  tableSize: number; // e.g., 65537
  hashFunctions: number;
  replicationFactor: number;
  currentDistribution: Map<string, number>; // IP -> slot count
}
```

**Visual Components**:

1. **Backend Cards** (Grid View):
   *   IP address (large, prominent)
   *   Status badge with color coding
   *   Real-time packet counter (animated)
   *   Connection gauge (current/max)
   *   Quick actions (disable, test, remove)
   *   Weight slider (adjustable)

2. **Backend Table** (List View):
   *   Sortable columns: IP, Status, Weight, Connections, Traffic, Latency
   *   Inline editing for weight and labels
   *   Bulk selection for multi-backend operations
   *   Expandable rows showing detailed stats
   *   Column customization (show/hide)

3. **Status Indicators**:
   *   **Healthy**: Green circle, "✓ Healthy"
   *   **Degraded**: Yellow triangle, "⚠ Degraded (High latency)"
   *   **Unhealthy**: Red X, "✗ Unhealthy (Connection failed)"
   *   **Unknown**: Gray question mark, "? Unknown (Checking...)"

**Functional Features**:
*   **Add Backend Modal**:
    *   IP input with CIDR validation
    *   Optional port specification
    *   Weight slider (1-100) with distribution preview
    *   Tag management (datacenter, environment, etc.)
    *   Connection test before adding
    *   Maglev impact preview (shows redistribution)
*   **Bulk Operations**:
    *   Multi-select with Shift+Click
    *   Bulk disable/enable
    *   Bulk weight adjustment
    *   Bulk tagging
    *   Bulk removal with confirmation
*   **Search & Filter**:
    *   Search by IP, label, or tags
    *   Filter by status (healthy, unhealthy, etc.)
    *   Filter by datacenter/rack
    *   Filter by traffic volume
*   **Export/Import**:
    *   Export backend list to JSON/CSV
    *   Import backends from file
    *   Validation before import

##### **MaglevDistributionVisualizer Component** (`maglev-distribution.tsx`)
Visual representation of Maglev consistent hashing distribution.

**Visualization Types**:

1. **Ring Chart**: Circular representation of lookup table
   *   Each segment represents a backend
   *   Segment size proportional to slot count
   *   Hover shows exact slot positions
   *   Click to highlight backend's slots

2. **Heatmap**: Grid view of lookup table
   *   Each cell is a table slot
   *   Color intensity shows backend assignment
   *   Patterns reveal distribution quality
   *   Zoom to inspect specific regions

3. **Distribution Histogram**:
   *   X-axis: Backends
   *   Y-axis: Slot count
   *   Ideal line (uniform distribution)
   *   Actual distribution bars
   *   Deviation percentage

**Interactive Features**:
*   **Simulation Mode**: Preview distribution changes before applying
*   **What-If Analysis**: Add/remove backends temporarily to see impact
*   **Fairness Metrics**:
    *   Standard deviation from ideal
    *   Min/max slot count ratio
    *   Distribution entropy
*   **Disruption Analysis**: Show % of connections that would be remapped
*   **Export**: Download distribution as image or data file

#### 2.3 Performance Monitoring (`ui/components/ebpf/`)

##### **XDPMetricsDashboard Component** (`xdp-metrics-dashboard.tsx`)
Comprehensive real-time performance monitoring for XDP programs.

**Metric Categories**:

1. **Throughput Metrics**:
   *   Packets per second (PPS)
   *   Bits per second (BPS)
   *   Connections per second (CPS)
   *   Graphs: Line charts with min/avg/max/p95/p99

2. **Latency Metrics**:
   *   XDP processing time (nanoseconds)
   *   Per-backend latency distribution
   *   Histogram of latency buckets
   *   Graphs: Heatmap over time

3. **Action Counters**:
   *   XDP_DROP: Filtered packets
   *   XDP_PASS: Forwarded to kernel
   *   XDP_REDIRECT: Sent to backends
   *   XDP_TX: Bounced back
   *   XDP_ABORTED: Error cases
   *   Graphs: Stacked area chart

4. **Error Metrics**:
   *   Malformed packets
   *   BPF map lookup failures
   *   Backend unreachable
   *   Program errors
   *   Graphs: Event timeline

5. **Resource Utilization**:
   *   CPU usage per XDP program
   *   Memory usage of BPF maps
   *   NIC queue utilization
   *   Graphs: Multi-line chart

**Dashboard Layout**:
```
┌─────────────────────────────────────────────┐
│ Overview Cards (PPS, BPS, CPS, Latency)    │
├─────────────────────┬───────────────────────┤
│ Throughput Graph    │ Action Distribution   │
│ (Time Series)       │ (Donut Chart)         │
├─────────────────────┼───────────────────────┤
│ Latency Heatmap     │ Error Timeline        │
│ (Color Grid)        │ (Event Log)           │
├─────────────────────┴───────────────────────┤
│ Per-Backend Performance Table               │
│ IP | PPS | Latency | Errors | Status        │
└─────────────────────────────────────────────┘
```

**Advanced Features**:
*   **Anomaly Detection**: Highlight unusual patterns
*   **Threshold Alerts**: Configure alerts for metric thresholds
*   **Baseline Comparison**: Compare current vs. historical baseline
*   **Correlation Analysis**: Show metric correlations
*   **Export Reports**: Generate PDF/PNG reports
*   **Custom Dashboards**: Drag-and-drop dashboard builder

##### **BPFMapExplorer Component** (`bpf-map-explorer.tsx`)
Low-level interface for inspecting and debugging BPF maps.

**Props**:
```typescript
interface BPFMapExplorerProps {
  maps: BPFMap[];
  onRefresh: (mapId: string) => Promise<void>;
  onUpdateEntry: (mapId: string, key: any, value: any) => Promise<void>;
  onDeleteEntry: (mapId: string, key: any) => Promise<void>;
}
```

**Data Structure**:
```typescript
interface BPFMap {
  id: string;
  name: string; // e.g., "backend_pool", "xdp_stats_map"
  type: 'hash' | 'array' | 'lru_hash' | 'percpu_hash';
  keySize: number;
  valueSize: number;
  maxEntries: number;
  currentEntries: number;
  flags: string[];
  pinPath?: string; // If pinned to filesystem
  entries: BPFMapEntry[];
}

interface BPFMapEntry {
  key: any; // Parsed key (IP, index, etc.)
  value: any; // Parsed value (stats, config, etc.)
  raw: {
    keyHex: string;
    valueHex: string;
  };
}
```

**UI Features**:
*   **Map List**: All maps used by loaded XDP programs
*   **Map Inspector**:
    *   Table view of entries
    *   Hex dump of raw key/value
    *   Parsed/decoded view
    *   Search by key
    *   Filter by value properties
*   **Live Updates**: Auto-refresh entries
*   **Edit Mode**: Modify values for testing (with warnings)
*   **Clear Functionality**: Clear entire map (with confirmation)
*   **Export**: Dump map contents to JSON

**Safety Features**:
*   Read-only mode by default
*   Require explicit unlock for editing
*   Validation before updates
*   Backup before destructive operations
*   Audit log of all changes

##### **PacketCaptureInterface Component** (`packet-capture.tsx`)
tcpdump-style packet capture integrated into the UI.

**Features**:
*   **Capture Filters**:
    *   Source/destination IP
    *   Port numbers
    *   Protocol (TCP/UDP/ICMP)
    *   XDP action (DROP/PASS/REDIRECT)
    *   Backend destination
*   **Capture Controls**:
    *   Start/Stop capture
    *   Packet limit
    *   Time limit
    *   Buffer size
*   **Packet Display**:
    *   List view with timestamp, src, dst, protocol, action
    *   Expandable rows showing full packet headers
    *   Hex dump of packet payload
    *   Protocol decode (TCP flags, etc.)
*   **Export Formats**:
    *   PCAP file (for Wireshark)
    *   JSON
    *   Text (tcpdump format)
*   **Analysis Tools**:
    *   Conversation tracking (group by flow)
    *   Statistics (protocol distribution)
    *   Search (by IP, port, etc.)

#### 2.4 Configuration & Management (`ui/components/ebpf/`)

##### **XDPConfigEditor Component** (`xdp-config-editor.tsx`)
Configuration interface for XDP load balancer settings.

**Configuration Sections**:

1. **Global Settings**:
   *   **XDP Mode**: SKB (Generic), DRV (Native), HW (Hardware Offload)
   *   **Load Balancing Algorithm**: Maglev, Round-Robin, Least-Connections
   *   **Connection Tracking**: Enable/Disable, Timeout settings
   *   **Fragmentation Handling**: Drop, Pass, Reassemble

2. **Maglev Configuration**:
   *   **Lookup Table Size**: Dropdown (65537, 131071, 262139)
   *   **Hash Functions**: Slider (1-10)
   *   **Rebalance Strategy**: Minimal disruption, Immediate

3. **Rate Limiting**:
   *   **Global Rate**: Packets/second threshold
   *   **Per-Backend Rate**: Individual limits
   *   **Burst Size**: Allowed burst packets
   *   **Action on Limit**: DROP, PASS with mark

4. **Health Checking**:
   *   **Probe Interval**: Seconds between checks
   *   **Probe Timeout**: Milliseconds
   *   **Failure Threshold**: Consecutive failures
   *   **Recovery Threshold**: Consecutive successes
   *   **Probe Method**: ICMP ping, TCP connect, HTTP GET

5. **Logging & Telemetry**:
   *   **Log Level**: Debug, Info, Warn, Error
   *   **Sample Rate**: % of packets to log
   *   **Metrics Export**: Prometheus, StatsD
   *   **Tracing**: Enable distributed tracing

**Form Features**:
*   **Validation**: Real-time validation with helper text
*   **Presets**: Common configuration templates
*   **Import/Export**: JSON config files
*   **Diff View**: Compare current vs. proposed config
*   **Dry Run**: Validate without applying
*   **Rollback**: Revert to previous config

##### **InterfaceSelector Component** (`interface-selector.tsx`)
Network interface selection and capability detection.

**Display Information**:
*   Interface name (eth0, ens3, etc.)
*   IP addresses (IPv4 and IPv6)
*   MAC address
*   MTU
*   Link speed
*   Driver name
*   Current state (up/down)
*   XDP capabilities:
    *   Generic mode support
    *   Driver mode support
    *   Hardware offload support
*   Current traffic (real-time graph)

**Selection Features**:
*   Multi-select for batch operations
*   Quick filter (show only XDP-capable)
*   Sort by name, traffic, capabilities
*   Group by interface type
*   Visual capability indicators

##### **ProgramCompiler Component** (`program-compiler.tsx`)
In-browser XDP program compilation interface.

**Features**:
*   **Code Editor**:
    *   Syntax highlighting for C/BPF
    *   Auto-completion for BPF helpers
    *   Inline documentation
    *   Error highlighting
*   **Compilation**:
    *   Trigger compile (calls backend API)
    *   Show compiler output
    *   Display errors with line numbers
    *   Verification status
*   **Program Management**:
    *   Save/Load programs
    *   Version control
    *   Program templates
    *   Example library

#### 2.5 Layout & Navigation (`ui/components/layout/`)

##### **NetworkLayout Component** (`network-layout.tsx`)
Specialized layout for network/eBPF features.

**Structure**:
```
┌─────────────────────────────────────────────┐
│ Header: Network Load Balancer              │
│ [Status: Active] [Mode: XDP Native]        │
├──────────────┬──────────────────────────────┤
│ Sidebar:     │ Content Area:                │
│              │                              │
│ • Overview   │ <Outlet />                   │
│ • Topology   │                              │
│ • Backends   │                              │
│ • Programs   │                              │
│ • Metrics    │                              │
│ • Packet Cap │                              │
│ • Maps       │                              │
│ • Config     │                              │
│              │                              │
├──────────────┴──────────────────────────────┤
│ Status Bar: NIC: eth0 | PPS: 1.2M | CPU: 5%│
└─────────────────────────────────────────────┘
```

**Sidebar Items**:
*   **Overview**: High-level dashboard
*   **Topology**: Network map and packet flow
*   **Backends**: L4 backend management
*   **Programs**: XDP program loader
*   **Metrics**: Performance monitoring
*   **Packet Capture**: tcpdump interface
*   **BPF Maps**: Map explorer
*   **Configuration**: Settings editor

**Context-Aware Header**:
*   Current XDP mode badge
*   Active interface indicator
*   Global enable/disable toggle
*   Emergency stop button
*   Quick stats (PPS, latency)

##### **StatusBar Component** (`network-status-bar.tsx`)
Always-visible network status at bottom of screen.

**Information Displayed**:
*   Active interface(s)
*   Current packet rate (PPS)
*   Current bandwidth (Gbps)
*   XDP program status
*   Backend count (healthy/total)
*   CPU usage
*   Error count
*   Last update timestamp

**Interactive Elements**:
*   Click metrics to jump to relevant view
*   Toggle auto-refresh
*   Expand for detailed mini-dashboard

### State Management

#### Context Providers (`ui/context/`)

##### **XDPContext** (`xdp-context.tsx`)
Global state for XDP programs and configuration.

```typescript
interface XDPContextValue {
  programs: XDPProgram[];
  interfaces: NetworkInterface[];
  backends: L4Backend[];
  maglev: MaglevConfig;
  stats: XDPStats;
  loading: boolean;
  error: Error | null;
  
  // Program Management
  loadProgram: (program: XDPProgram) => Promise<void>;
  unloadProgram: (programId: string) => Promise<void>;
  attachProgram: (programId: string, iface: string, mode: XDPMode) => Promise<void>;
  detachProgram: (iface: string) => Promise<void>;
  reloadProgram: (iface: string) => Promise<void>;
  
  // Backend Management
  addBackend: (backend: L4Backend) => Promise<void>;
  removeBackend: (ip: string) => Promise<void>;
  updateBackend: (ip: string, updates: Partial<L4Backend>) => Promise<void>;
  recalculateMaglev: () => Promise<void>;
  
  // Configuration
  updateConfig: (config: XDPConfig) => Promise<void>;
  getConfig: () => Promise<XDPConfig>;
  exportConfig: () => Promise<string>;
  importConfig: (config: string) => Promise<void>;
  
  // Stats & Monitoring
  refreshStats: () => Promise<void>;
  subscribeToStats: (callback: (stats: XDPStats) => void) => () => void;
  
  // BPF Maps
  getBPFMaps: () => Promise<BPFMap[]>;
  updateMapEntry: (mapId: string, key: any, value: any) => Promise<void>;
  clearMap: (mapId: string) => Promise<void>;
}
```

##### **NetworkMonitoringContext** (`network-monitoring-context.tsx`)
Real-time network metrics and packet capture state.

```typescript
interface NetworkMonitoringContextValue {
  metrics: NetworkMetrics;
  packets: CapturedPacket[];
  capturing: boolean;
  
  // Metrics
  getHistoricalMetrics: (timeRange: TimeRange) => Promise<NetworkMetrics[]>;
  subscribeToMetrics: (callback: (metrics: NetworkMetrics) => void) => () => void;
  
  // Packet Capture
  startCapture: (filter: CaptureFilter) => Promise<void>;
  stopCapture: () => Promise<void>;
  exportCapture: (format: 'pcap' | 'json') => Promise<Blob>;
  clearCapture: () => void;
  
  // Alerts
  setAlert: (metric: string, threshold: number) => Promise<void>;
  getActiveAlerts: () => Promise<Alert[]>;
}
```

### API Integration (`ui/services/`)

#### **XDPAPIService** (`xdp-api.ts`)
Centralized API client for XDP and eBPF operations.

```typescript
class XDPAPIService {
  // Program Management
  async getPrograms(): Promise<XDPProgram[]>;
  async compileProgram(source: string): Promise<CompilationResult>;
  async loadProgram(program: XDPProgram): Promise<void>;
  async unloadProgram(programId: string): Promise<void>;
  async attachProgram(programId: string, iface: string, mode: XDPMode): Promise<void>;
  async detachProgram(iface: string): Promise<void>;
  
  // Interface Management
  async getInterfaces(): Promise<NetworkInterface[]>;
  async getInterfaceStats(iface: string): Promise<InterfaceStats>;
  
  // Backend Management
  async getBackends(): Promise<L4Backend[]>;
  async addBackend(backend: L4Backend): Promise<L4Backend>;
  async removeBackend(ip: string): Promise<void>;
  async updateBackend(ip: string, updates: Partial<L4Backend>): Promise<L4Backend>;
  async testBackendConnection(ip: string): Promise<ConnectionTestResult>;
  async triggerHealthCheck(): Promise<void>;
  
  // Maglev
  async getMaglevConfig(): Promise<MaglevConfig>;
  async updateMaglevConfig(config: MaglevConfig): Promise<void>;
  async recalculateMaglev(): Promise<MaglevDistribution>;
  async previewMaglevChanges(changes: BackendChange[]): Promise<DisruptionAnalysis>;
  
  // Statistics
  async getXDPStats(): Promise<XDPStats>;
  async streamXDPStats(): WebSocket; // Real-time stream
  async getHistoricalStats(timeRange: TimeRange): Promise<XDPStats[]>;
  
  // BPF Maps
  async getBPFMaps(): Promise<BPFMap[]>;
  async getMapEntries(mapId: string): Promise<BPFMapEntry[]>;
  async updateMapEntry(mapId: string, key: any, value: any): Promise<void>;
  async deleteMapEntry(mapId: string, key: any): Promise<void>;
  async clearMap(mapId: string): Promise<void>;
  
  // Configuration
  async getXDPConfig(): Promise<XDPConfig>;
  async updateXDPConfig(config: XDPConfig): Promise<void>;
  async validateXDPConfig(config: XDPConfig): Promise<ValidationResult>;
  async exportXDPConfig(): Promise<Blob>;
  async importXDPConfig(file: File): Promise<void>;
  
  // Packet Capture
  async startPacketCapture(filter: CaptureFilter): Promise<void>;
  async stopPacketCapture(): Promise<void>;
  async getPackets(limit?: number): Promise<CapturedPacket[]>;
  async exportPackets(format: 'pcap' | 'json'): Promise<Blob>;
  
  // Performance
  async runPerformanceTest(config: PerfTestConfig): Promise<PerfTestResult>;
  async getBenchmarkHistory(): Promise<BenchmarkResult[]>;
}
```

### Utilities (`ui/utils/`)

#### **Network Utilities** (`network.ts`)
```typescript
// IP validation and parsing
validateIPv4(ip: string): boolean;
validateIPv6(ip: string): boolean;
parseCIDR(cidr: string): { network: string; mask: number };

// Byte/packet formatting
formatPackets(count: number): string; // "1.2M pps"
formatBytes(bytes: number): string; // "1.5 GB"
formatBandwidth(bps: number): string; // "10 Gbps"

// Latency formatting
formatLatency(ns: number): string; // "1.2 µs"

// MAC address formatting
formatMAC(mac: string): string;

// Hash calculation (for Maglev)
calculateMaglevHash(ip: string, tableSize: number): number;
```

#### **BPF Utilities** (`bpf.ts`)
```typescript
// Parse BPF map keys/values
parseBPFKey(hex: string, type: string): any;
parseBPFValue(hex: string, type: string): any;

// Encode for BPF map updates
encodeBPFKey(value: any, type: string): string;
encodeBPFValue(value: any, type: string): string;

// XDP return code names
getXDPActionName(code: number): string; // 0=ABORTED, 1=DROP, etc.

// BPF verifier log parsing
parseVerifierLog(log: string): VerifierError[];
```

#### **Performance Utilities** (`performance.ts`)
```typescript
// Calculate percentiles
calculatePercentile(values: number[], percentile: number): number;
calculatePercentiles(values: number[], percentiles: number[]): Map<number, number>;

// Statistical analysis
calculateMean(values: number[]): number;
calculateStdDev(values: number[]): number;
calculateMedian(values: number[]): number;

// Distribution metrics
calculateSkewness(values: number[]): number;
calculateKurtosis(values: number[]): number;

// Maglev fairness metrics
calculateDistributionFairness(distribution: Map<string, number>): number;
calculateDisruptionPercentage(oldDist: Map<string, number>, newDist: Map<string, number>): number;
```

### Testing Strategy

#### Unit Tests

##### Component Tests (`*.test.tsx`)
*   **PacketFlowVisualizer**:
    *   Renders flow diagram with correct proportions
    *   Updates animation when stats change
    *   Handles click events on nodes
    *   Displays tooltips with accurate data
*   **L4BackendList**:
    *   Renders backend cards/table correctly
    *   Sorts and filters backends
    *   Validates IP addresses on add
    *   Updates weight sliders
*   **MaglevDistributionVisualizer**:
    *   Calculates distribution correctly
    *   Shows disruption analysis
    *   Handles backend additions/removals
*   **XDPMetricsDashboard**:
    *   Renders charts with real data
    *   Updates metrics in real-time
    *   Handles missing data gracefully
    *   Calculates percentiles correctly

##### Hook Tests
*   **useXDP**:
    *   Loads programs successfully
    *   Handles attach/detach operations
    *   Updates state correctly
    *   Manages errors appropriately
*   **useNetworkMonitoring**:
    *   Subscribes to WebSocket correctly
    *   Handles reconnection
    *   Buffers data during disconnection
    *   Cleans up on unmount

##### Utility Tests
*   **Network utilities**:
    *   Validates IPv4 addresses (valid/invalid cases)
    *   Validates IPv6 addresses
    *   Parses CIDR notation correctly
    *   Formats bytes/packets/bandwidth
*   **BPF utilities**:
    *   Parses hex keys/values correctly
    *   Encodes values for map updates
    *   Handles different data types
*   **Performance utilities**:
    *   Calculates percentiles accurately
    *   Computes statistical measures
    *   Handles edge cases (empty arrays, NaN)

#### Integration Tests

##### API Integration (`*.integration.test.tsx`)
*   **Program Loading**:
    *   Compile → Load → Attach → Verify stats flow
    *   Handle compilation errors gracefully
    *   Detach and cleanup correctly
*   **Backend Management**:
    *   Add backend → Update Maglev → Verify distribution
    *   Remove backend → Check disruption percentage
    *   Bulk operations complete atomically
*   **Monitoring Pipeline**:
    *   WebSocket connects → Receives stats → Updates UI
    *   Handles reconnection after network failure
    *   Buffers data correctly

##### Context Integration
*   **XDPContext**:
    *   Multiple components share program state
    *   Updates propagate to all subscribers
    *   Optimistic updates with rollback
*   **NetworkMonitoringContext**:
    *   Real-time stats flow to visualizations
    *   Packet capture updates log viewer
    *   Alerts trigger notifications

#### E2E Tests (Playwright/Cypress)

##### User Workflows
*   **XDP Program Deployment**:
    1. Navigate to Programs page
    2. Select program from library
    3. Choose interface (eth0)
    4. Select mode (Native/Driver)
    5. Click "Attach"
    6. Verify status shows "Attached"
    7. Check metrics dashboard shows traffic
    
*   **Backend Pool Management**:
    1. Navigate to Backends page
    2. Click "Add Backend"
    3. Enter IP: 10.0.1.100
    4. Set weight: 50
    5. Click "Test Connection"
    6. Verify connection succeeds
    7. Click "Save"
    8. Verify backend appears in list
    9. Check Maglev distribution updated
    
*   **Performance Monitoring**:
    1. Navigate to Metrics dashboard
    2. Select time range: Last 5 minutes
    3. Verify graphs render
    4. Hover over data points
    5. Verify tooltips show correct values
    6. Click "Export Report"
    7. Verify PDF downloads
    
*   **Incident Response**:
    1. Simulate backend failure
    2. Verify alert appears
    3. Navigate to Backends page
    4. Verify backend marked unhealthy
    5. Click "Disable"
    6. Verify Maglev recalculates
    7. Check traffic redirected to healthy backends
    
*   **Configuration Management**:
    1. Navigate to Config page
    2. Modify XDP mode setting
    3. Click "Validate"
    4. Review warnings
    5. Click "Apply"
    6. Verify program reloads
    7. Check stats continue flowing

#### Performance Tests

##### Load Testing
*   **High Packet Rate**: Test UI responsiveness with 10M+ pps
*   **Many Backends**: 1000+ backends in table
*   **Long-Running**: UI stability over 24+ hours
*   **Memory Leaks**: Monitor memory usage over time

##### Benchmark Scenarios
```typescript
// Benchmark: Rendering 1000 backends
test('renders 1000 backends in under 500ms', async () => {
  const backends = generateBackends(1000);
  const startTime = performance.now();
  render(<L4BackendList backends={backends} />);
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(500);
});

// Benchmark: Chart updates
test('updates metrics chart at 60 FPS', async () => {
  // Simulate 60 updates per second
  // Verify no dropped frames
});
```

#### Safety & Kernel Tests

##### Validation Tests
*   **Invalid Configuration**: Reject configs that would crash kernel
*   **Resource Limits**: Prevent BPF map exhaustion
*   **Privilege Checks**: Verify user has CAP_NET_ADMIN
*   **Interface Validation**: Prevent attaching to non-existent interfaces

##### Kernel Safety Scenarios
*   **Malformed Packets**: XDP program handles gracefully
*   **Map Overflow**: BPF map full → graceful degradation
*   **Program Errors**: XDP_ABORTED doesn't crash kernel
*   **Concurrent Updates**: Race conditions in map updates

### Accessibility (a11y)

#### Keyboard Navigation
*   **Tab Order**: Logical focus flow through all interactive elements
*   **Shortcuts**:
    *   `Alt+N`: Navigate to Network page
    *   `Alt+B`: Navigate to Backends
    *   `Alt+M`: Navigate to Metrics
    *   `Ctrl+E`: Emergency stop (with confirmation)
    *   `?`: Show keyboard shortcuts help
*   **Focus Indicators**: High-contrast focus rings
*   **Skip Links**: Skip to main content, skip navigation

#### Screen Reader Support
*   **ARIA Labels**: All interactive elements labeled
*   **Live Regions**: 
    *   Alert announcements: "Backend 10.0.1.1 marked unhealthy"
    *   Stats updates: "Packet rate: 1.2 million per second"
*   **Status Updates**: Alert severity communicated
*   **Chart Descriptions**: Text alternatives for visualizations
*   **Table Semantics**: Proper `<th>`, `<td>`, `scope` attributes

#### Visual Accessibility
*   **Color Contrast**: WCAG AAA for text (7:1)
*   **Color Independence**: Status not conveyed by color alone
*   **Text Sizing**: Respects browser zoom up to 200%
*   **Animations**: Respect `prefers-reduced-motion`
*   **High Contrast Mode**: Compatible with Windows High Contrast

### Responsive Design

#### Breakpoints
*   **Mobile** (< 640px):
    *   Single column layout
    *   Stacked cards for backends
    *   Simplified charts (fewer data points)
    *   Bottom sheet navigation
    *   Touch-optimized controls (larger hit targets)
*   **Tablet** (640px - 1024px):
    *   Two-column layout
    *   Collapsible sidebar
    *   Full-featured charts
    *   Touch and mouse support
*   **Desktop** (> 1024px):
    *   Full three-column layout
    *   Fixed sidebar navigation
    *   Advanced visualizations
    *   Keyboard-first interactions

#### Mobile-Specific Features
*   **Swipe Gestures**:
    *   Swipe left on backend → Quick actions
    *   Pull down → Refresh data
    *   Swipe between dashboard tabs
*   **Simplified Topology**: Fewer details on small screens
*   **Bottom Navigation**: Main tabs at bottom
*   **Compact Tables**: Horizontal scroll with sticky columns

### Performance Optimizations

#### Rendering Optimizations
*   **Virtual Scrolling**: For 1000+ backend lists
*   **Canvas Rendering**: For high-frequency chart updates
*   **Web Workers**: Statistics calculations off main thread
*   **RequestAnimationFrame**: Smooth 60 FPS animations
*   **Memoization**: React.memo for pure components

#### Network Optimizations
*   **WebSocket**: Single connection for all real-time data
*   **Compression**: Gzip/Brotli for API responses
*   **Debouncing**: Search inputs (300ms)
*   **Throttling**: Chart updates (60 FPS max)
*   **Caching**: React Query for API responses

#### Bundle Optimizations
*   **Code Splitting**: Lazy load monitoring components
*   **Tree Shaking**: Remove unused code
*   **Dynamic Imports**: Load visualizations on demand
*   **Asset Optimization**: Compress images, use WebP

### Error Handling

#### Error Categories

##### API Errors
*   **Network Errors**: Toast with retry button
*   **Authorization Errors**: Redirect to login or show permission error
*   **Validation Errors**: Inline form errors
*   **Server Errors**: Error banner with support contact

##### XDP Errors
*   **Compilation Errors**: Show in code editor with line numbers
*   **Attach Errors**: Modal with troubleshooting steps
*   **Program Errors**: Alert with XDP return code explanation
*   **Map Errors**: Detailed error with suggested fixes

##### Configuration Errors
*   **Invalid Backend IP**: Inline field error
*   **Maglev Calculation Failed**: Retry with exponential backoff
*   **Config Import Failed**: Show validation errors
*   **Kernel Compatibility**: Warning with upgrade path

#### Error Recovery

##### Automatic Recovery
*   **WebSocket Reconnection**: Exponential backoff up to 60s
*   **Failed API Calls**: Retry 3 times with jitter
*   **Stale Data**: Auto-refresh when connection restored

##### Manual Recovery
*   **Reset to Defaults**: One-click config reset
*   **Emergency Stop**: Detach all XDP programs
*   **Rollback**: Revert to previous working config
*   **Safe Mode**: Load minimal configuration

### Security Considerations

#### Authentication & Authorization
*   **Role-Based Access**:
    *   Viewer: Read-only access
    *   Operator: Start/stop, view configs
    *   Admin: Full control, edit configs
*   **Action Confirmation**: Confirm destructive actions
*   **Audit Logging**: Log all configuration changes
*   **Session Management**: Auto-logout after inactivity

#### Input Validation
*   **IP Address Validation**: Prevent injection attacks
*   **Config Sanitization**: Validate all user inputs
*   **File Upload Security**: Scan uploaded configs
*   **Command Injection Prevention**: Escape shell commands

#### Kernel Safety
*   **BPF Verifier**: All programs pass verifier
*   **Resource Limits**: Prevent BPF map exhaustion
*   **Privilege Escalation**: Prevent unauthorized access
*   **Audit Trail**: Log all kernel operations

### Documentation

#### In-App Help
*   **Tooltips**: Contextual help for all features
*   **Getting Started Wizard**: Interactive tutorial
*   **Video Tutorials**: Embedded walkthrough videos
*   **Glossary**: eBPF/XDP terminology explained

#### Technical Documentation
*   **Component API**: Props and usage examples
*   **Architecture Diagrams**: System overview
*   **Integration Guides**: How to extend functionality
*   **Troubleshooting**: Common issues and solutions

#### User Guides
*   **Quick Start**: Deploy first XDP program in 5 minutes
*   **Best Practices**: Performance tuning recommendations
*   **Common Workflows**: Step-by-step guides
*   **FAQ**: Frequently asked questions

## 3. Testing

### Backend Testing

#### Unit Tests
*   **BPF Map Operations**: Add/remove backends from maps
*   **Maglev Hashing**: Verify consistent hashing distribution
*   **Stats Collection**: Verify accurate counter reads
*   **Backend Health**: Test health check logic

#### Integration Tests
*   **API Integration**: `TestXDPConfiguration` - verify config updates XDP maps
*   **Program Loading**: Test XDP program attach/detach cycle
*   **Multi-Interface**: Test multiple interfaces simultaneously
*   **Concurrent Updates**: Test thread-safe map operations

#### Performance Tests
*   **iperf3 Benchmark**: Compare XDP LB vs User-space LB
    *   Measure throughput (Gbps)
    *   Measure latency (microseconds)
    *   Measure CPU usage
    *   Test at various packet sizes (64, 512, 1500 bytes)
*   **Packet Generator**: Use pktgen for high packet rates
    *   Test at 1M, 5M, 10M pps
    *   Verify no packet loss
    *   Measure XDP processing time

#### Safety Tests
*   **Kernel Stability**: Verify XDP program doesn't crash kernel
    *   Test with malformed packets
    *   Test with invalid configurations
    *   Test with resource exhaustion
*   **Graceful Degradation**: Test fallback to user-space
*   **Resource Limits**: Test with max map entries
*   **Privilege Checks**: Test with insufficient permissions

### Frontend Testing
*   **Unit Tests**: Component rendering, state management, utilities
*   **Integration Tests**: Context providers, API services, WebSocket connections
*   **E2E Tests**: Complete workflows (deploy XDP, manage backends, monitor metrics)
*   **Performance Tests**: High packet rate UI responsiveness, many backends rendering
*   **Accessibility Tests**: Keyboard navigation, screen reader compatibility

### System Testing
*   **End-to-End**: Deploy XDP program → Add backends → Generate traffic → Verify distribution
*   **Failover**: Simulate backend failure → Verify traffic redistribution
*   **Scale**: Test with 1000+ backends, 10M+ pps
*   **Chaos**: Random backend failures, network partitions
*   **Upgrade**: Test hot reload of XDP programs without traffic loss