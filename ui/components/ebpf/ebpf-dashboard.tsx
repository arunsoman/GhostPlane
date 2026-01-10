'use client'

import React, { useState, useEffect } from 'react'
import { Activity, Shield, Cpu, Network, Zap, Settings, BarChart3, AlertCircle } from 'lucide-react'
import PacketFlowVisualizer from './packet-flow'
import L4BackendList from './l4-backend-list'
import XDPProgramManager from './xdp-program-manager'
import XDPConfigEditor from './xdp-config-editor'
import { XDPStats, L4Backend, XDPProgram, NetworkInterface, XDPConfig } from './types'

// --- Mock Data Generators ---

const mockInterfaces: NetworkInterface[] = [
    {
        name: 'eth0',
        index: 1,
        mtu: 1500,
        state: 'up',
        capabilities: { xdpSupported: true, xdpDriverMode: true, xdpHardwareMode: false },
        attachedProgram: { id: 'prog-1', mode: 'DRV', attachedAt: '2h 15m ago' }
    },
    {
        name: 'eth1',
        index: 2,
        mtu: 1500,
        state: 'up',
        capabilities: { xdpSupported: true, xdpDriverMode: false, xdpHardwareMode: false }
    },
    {
        name: 'lo',
        index: 0,
        mtu: 65536,
        state: 'up',
        capabilities: { xdpSupported: true, xdpDriverMode: false, xdpHardwareMode: false }
    }
]

const mockPrograms: XDPProgram[] = [
    {
        id: 'prog-1',
        name: 'xdp_lb_v2',
        version: '2.1.4',
        source: 'pkg/ebpf/programs/xdp_lb.c',
        compiled: true,
        metadata: {
            author: 'NLB+ Core',
            description: 'High-performance L4 Round Robin Load Balancer with Maglev Support.',
            createdAt: '2024-03-20'
        }
    },
    {
        id: 'prog-2',
        name: 'xdp_ddos_guard',
        version: '1.0.2',
        source: 'pkg/ebpf/programs/ddos_filter.c',
        compiled: true,
        metadata: {
            author: 'Security Ops',
            description: 'L3/L4 DDoS mitigation and rate-limiting filter.',
            createdAt: '2024-03-22'
        }
    }
]

const initialBackends: L4Backend[] = [
    {
        ip: '10.0.1.10',
        port: 80,
        weight: 10,
        enabled: true,
        health: { status: 'healthy', lastCheck: '5s ago', consecutiveFailures: 0, latency: 0.12 },
        metadata: { addedAt: '2024-03-24', updatedAt: '2024-03-24', label: 'AUTH-SRV-01', tags: ['prod', 'asia'] },
        stats: { totalConnections: 12500, activeConnections: 450, packetsProcessed: 890000, bytesProcessed: 450000000, errors: 0 }
    },
    {
        ip: '10.0.1.11',
        port: 80,
        weight: 10,
        enabled: true,
        health: { status: 'degraded', lastCheck: '2s ago', consecutiveFailures: 0, latency: 15.4 },
        metadata: { addedAt: '2024-03-24', updatedAt: '2024-03-24', label: 'AUTH-SRV-02', tags: ['prod', 'asia'] },
        stats: { totalConnections: 11000, activeConnections: 210, packetsProcessed: 420000, bytesProcessed: 210000000, errors: 12 }
    }
]

const initialConfig: XDPConfig = {
    global: {
        maxBackends: 64,
        maglevTableSize: 65521,
        healthCheckInterval: 5000,
        enableRateLimit: true,
        logLevel: 'info'
    },
    listeners: [
        { id: '1', externalPort: 80, internalPort: 80, protocol: 'TCP', enabled: true, description: 'Default HTTP' },
        { id: '2', externalPort: 443, internalPort: 443, protocol: 'TCP', enabled: true, description: 'Default HTTPS' }
    ],
    rateLimit: {
        maxPacketsPerSec: 100000,
        burstSize: 10000
    }
}

export default function EBPFDashboard() {
    const [backends, setBackends] = useState<L4Backend[]>(initialBackends)
    const [config, setConfig] = useState<XDPConfig>(initialConfig)
    const [activeTab, setActiveTab] = useState<'topology' | 'backends' | 'programs' | 'config'>('topology')
    const [stats, setStats] = useState<XDPStats>({
        timestamp: Date.now(),
        nic: { interface: 'eth0', rxPackets: 0, rxBytes: 0, rxRate: 12500 },
        xdp: { processed: 12500, dropped: 150, passed: 11000, redirected: 1350, aborted: 0, txBounced: 0 },
        perBackend: {
            '10.0.1.10': { ip: '10.0.1.10', packets: 850, bytes: 0, connections: 450, lastSeen: Date.now() },
            '10.0.1.11': { ip: '10.0.1.11', packets: 500, bytes: 0, connections: 210, lastSeen: Date.now() },
        },
        errors: []
    })

    // Simulated real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                ...prev,
                nic: { ...prev.nic, rxRate: 12000 + Math.random() * 2000 },
                xdp: {
                    ...prev.xdp,
                    passed: prev.xdp.passed + Math.floor(Math.random() * 100),
                    redirected: prev.xdp.redirected + Math.floor(Math.random() * 50),
                    dropped: prev.xdp.dropped + (Math.random() > 0.9 ? 1 : 0)
                }
            }))
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="min-h-screen bg-black text-slate-200">
            {/* Dynamic Header */}
            <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Zap size={24} className="text-white" fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black italic tracking-tight text-white">L4 CORE <span className="text-indigo-400">BPF</span></h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                    XDP Native
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">v6.2 Kernel • 100G Enabled</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="hidden xl:flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Throughput</div>
                                <div className="text-sm font-mono text-indigo-400 font-bold">{stats.nic.rxRate.toLocaleString()} <span className="text-[10px] text-slate-600">PPS</span></div>
                            </div>
                            <div className="w-px h-8 bg-white/5" />
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Drop Rate</div>
                                <div className="text-sm font-mono text-rose-500 font-bold">0.02%</div>
                            </div>
                            <div className="w-px h-8 bg-white/5" />
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Active Flows</div>
                                <div className="text-sm font-mono text-white font-bold">2,451</div>
                            </div>
                        </div>
                        <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group">
                            <Settings size={20} className="text-slate-400 group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto p-6 space-y-8">
                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('topology')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'topology' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Network size={14} />
                        Flow Topology
                    </button>
                    <button
                        onClick={() => setActiveTab('backends')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'backends' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Shield size={14} />
                        L4 Backends
                    </button>
                    <button
                        onClick={() => setActiveTab('programs')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'programs' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Cpu size={14} />
                        XDP Hooks
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'config' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Settings size={14} />
                        L4 Config
                    </button>
                </div>

                {/* Content Area */}
                {activeTab === 'topology' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <PacketFlowVisualizer stats={stats} backends={backends} />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Ingress Interface</h4>
                                <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                                            <Activity size={18} />
                                        </div>
                                        <div className="font-mono text-sm">eth0</div>
                                    </div>
                                    <div className="text-emerald-400 text-xs font-bold">UP</div>
                                </div>
                            </div>
                            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">XDP Load Balancer</h4>
                                <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500">
                                            <Cpu size={18} />
                                        </div>
                                        <div className="font-mono text-sm italic">xdp_lb_v2.o</div>
                                    </div>
                                    <div className="text-indigo-400 text-[10px] font-bold font-mono">native</div>
                                </div>
                            </div>
                            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Kernel Integration</h4>
                                <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                                            <Shield size={18} />
                                        </div>
                                        <div className="font-mono text-sm">Zero-Copy</div>
                                    </div>
                                    <div className="text-slate-500 text-xs">Enabled</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'backends' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <L4BackendList
                            backends={backends}
                            onAdd={async () => { }}
                            onRemove={async () => { }}
                            onToggle={async () => { }}
                            onUpdateWeight={async () => { }}
                        />
                    </div>
                )}

                {activeTab === 'programs' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <XDPProgramManager
                            programs={mockPrograms}
                            interfaces={mockInterfaces}
                            onAttach={async () => { }}
                            onDetach={async () => { }}
                            onReload={async () => { }}
                        />
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <XDPConfigEditor
                            config={config}
                            onSave={async (newConfig) => setConfig(newConfig)}
                            onReset={async () => setConfig(initialConfig)}
                        />
                    </div>
                )}
            </main>

            {/* Global Status Bar */}
            <footer className="fixed bottom-0 left-0 right-0 h-10 bg-slate-900 border-t border-white/5 flex items-center px-6 z-50 overflow-hidden">
                <div className="flex items-center gap-6 w-full max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Operational</span>
                    </div>
                    <div className="w-px h-4 bg-white/5" />
                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                        <span>CPU: 4.2%</span>
                        <span>MEM: 124MB</span>
                        <span>NIC: 12.5k pps</span>
                    </div>
                    <div className="ml-auto flex items-center gap-4">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">eBPF Data Plane Active</span>
                        <AlertCircle size={14} className="text-slate-600" />
                    </div>
                </div>
            </footer>
        </div>
    )
}
