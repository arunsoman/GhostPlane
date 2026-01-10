export interface XDPStats {
    timestamp: number;
    nic: {
        interface: string;
        rxPackets: number;
        rxBytes: number;
        rxRate: number; // packets/sec
    };
    xdp: {
        processed: number;
        dropped: number;
        passed: number;
        redirected: number;
        aborted: number;
        txBounced: number;
    };
    perBackend: Record<string, BackendStats>;
    errors: XDPError[];
}

export interface BackendStats {
    ip: string;
    packets: number;
    bytes: number;
    connections: number;
    lastSeen: number;
}

export interface XDPError {
    timestamp: number;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
}

export interface L4Backend {
    ip: string;
    port?: number;
    weight: number;
    enabled: boolean;
    health: {
        status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
        lastCheck: string;
        consecutiveFailures: number;
        latency?: number;
    };
    metadata: {
        addedAt: string;
        updatedAt: string;
        label?: string;
        tags: string[];
    };
    stats: {
        totalConnections: number;
        activeConnections: number;
        packetsProcessed: number;
        bytesProcessed: number;
        errors: number;
    };
}

export interface XDPProgram {
    id: string;
    name: string;
    version: string;
    source: string;
    compiled: boolean;
    metadata: {
        author: string;
        description: string;
        createdAt: string;
    };
}

export type XDPMode = 'SKB' | 'DRV' | 'HW';

export interface NetworkInterface {
    name: string;
    index: number;
    mtu: number;
    state: 'up' | 'down' | 'unknown';
    attachedProgram?: {
        id: string;
        mode: XDPMode;
        attachedAt: string;
    };
    capabilities: {
        xdpSupported: boolean;
        xdpDriverMode: boolean;
        xdpHardwareMode: boolean;
    };
}

export interface XDPConfig {
    global: {
        maxBackends: number;
        maglevTableSize: number;
        healthCheckInterval: number; // ms
        enableRateLimit: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
    };
    listeners: PortMapping[];
    rateLimit: {
        maxPacketsPerSec: number;
        burstSize: number;
    };
}

export interface PortMapping {
    id: string;
    externalPort: number;
    internalPort: number;
    protocol: 'TCP' | 'UDP';
    enabled: boolean;
    description?: string;
}
