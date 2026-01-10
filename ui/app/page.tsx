'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import RouteTable from '../components/proxy/route-table'
import BackendPool from '../components/proxy/backend-pool'
import TrafficDashboard from '../components/monitoring/traffic-dashboard'
import LogViewer from '../components/monitoring/log-viewer'
import MetricsChart from '@/components/MetricsChart'
import CopilotChat from '@/components/CopilotChat'
import EBPFDashboard from '../components/ebpf/ebpf-dashboard'
import { Activity, Globe, Zap, ShieldCheck, ArrowRight, BarChart3, ShieldAlert, Plus, Settings, Shield, Cpu } from 'lucide-react'

export default function Page() {
    const [currentView, setCurrentView] = useState('dashboard')
    const router = useRouter()
    const [metrics, setMetrics] = useState({
        active_connections: 0,
        total_requests: 0,
        system_health: 'Initialising...',
        timestamp: 0
    })

    const handleBackToDashboard = () => {
        setCurrentView('dashboard')
    }

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        const fetchMetrics = async () => {
            try {
                // First check if setup is complete via backend
                const setupRes = await fetch('/api/v1/setup/check', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (setupRes.ok) {
                    const setupData = await setupRes.json()
                    if (!setupData.setup_complete) {
                        router.push('/setup')
                        return
                    }
                }

                const res = await fetch('/api/v1/metrics', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setMetrics(data)
                }
            } catch (err) {
                console.error('Failed to fetch metrics:', err)
            }
        }

        fetchMetrics()
        const interval = setInterval(fetchMetrics, 5000)
        return () => clearInterval(interval)
    }, [router])

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                const isFreshInstall = metrics.total_requests === 0;

                return (
                    <div className="animate-in">
                        <header className="mb-10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`w-2 h-2 rounded-full animate-pulse ${metrics.system_health === 'optimal' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                <span className={`text-xs font-semibold uppercase tracking-wider ${metrics.system_health === 'optimal' ? 'text-green-500' : 'text-yellow-500'}`}>
                                    {metrics.system_health}
                                </span>
                            </div>
                            <h2 className="text-4xl font-black text-white mb-2">Network Control</h2>
                            <p className="text-[var(--text-secondary)]">Real-time intelligence from your local edge node.</p>

                            {isFreshInstall && (
                                <div className="mt-8 p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                                    <div className="flex gap-4 items-center">
                                        <div className="p-3 rounded-xl bg-blue-500 shadow-lg shadow-blue-500/30">
                                            <Plus className="text-white w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-white">Start Routing Traffic</h4>
                                            <p className="text-sm text-[var(--text-muted)] text-balance">No traffic detected yet. Add your first backend to start load balancing.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setCurrentView('provisioning')}
                                        className="btn-primary flex items-center gap-2 px-6"
                                    >
                                        Provision Gateway <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}

                            {!isFreshInstall && (
                                <div className="flex gap-3 mt-6">
                                    <button className="px-5 py-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-sm font-semibold text-white hover:bg-[var(--bg-secondary)] transition-all">
                                        Export Logs
                                    </button>
                                </div>
                            )}
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <button
                                onClick={() => setCurrentView('metrics')}
                                className="card group text-left bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/50"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-xl bg-blue-500 shadow-lg shadow-blue-500/50">
                                        <Globe className="text-white w-6 h-6" strokeWidth={2.5} />
                                    </div>
                                    <ArrowRight className="text-gray-500 group-hover:text-blue-400 transition-colors" size={20} />
                                </div>
                                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Active Connections</h3>
                                <p className="text-4xl font-black text-white">{metrics.active_connections}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-2 font-semibold">Live from node</p>
                            </button>

                            <button
                                onClick={() => setCurrentView('security')}
                                className="card group text-left bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 hover:border-green-500/50"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-xl bg-green-500 shadow-lg shadow-green-500/50">
                                        <ShieldCheck className="text-white w-6 h-6" strokeWidth={2.5} />
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${metrics.system_health === 'optimal' ? 'text-green-400 bg-green-500/20' : 'text-yellow-400 bg-yellow-500/20'}`}>
                                        {metrics.system_health === 'optimal' ? 'Healthy' : 'Pending'}
                                    </span>
                                </div>
                                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Total Packets</h3>
                                <p className="text-4xl font-black text-green-400">{metrics.total_requests}</p>
                                <p className="text-xs text-green-400 mt-2 font-semibold">Processed by eBPF</p>
                            </button>

                            <button
                                onClick={() => setCurrentView('metrics')}
                                className="card group text-left bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-xl bg-purple-500 shadow-lg shadow-purple-500/50">
                                        <Zap className="text-white w-6 h-6" strokeWidth={2.5} />
                                    </div>
                                    <span className="text-xs font-bold text-[var(--text-muted)]">Live</span>
                                </div>
                                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Node Latency</h3>
                                <p className="text-4xl font-black text-white">0.2<span className="text-2xl">ms</span></p>
                                <p className="text-xs text-purple-400 mt-2 font-semibold">Empty hook overhead</p>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <MetricsChart />
                            </div>
                            <div className="lg:col-span-1">
                                <CopilotChat />
                            </div>
                        </div>
                    </div>
                )
            case 'proxy':
                return <RouteTable />
            case 'backends':
                return <BackendPool />
            case 'monitoring':
                return (
                    <div className="animate-in space-y-8">
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Live Observability</h1>
                            <p className="text-[var(--text-secondary)]">Real-time traffic telemetry and access logs</p>
                        </div>

                        <TrafficDashboard />

                        <div className="mt-8">
                            <LogViewer />
                        </div>
                    </div>
                )
            case 'ebpf':
                return <EBPFDashboard />
            case 'security':
                return (
                    <div className="animate-in">
                        <header className="mb-10">
                            <h2 className="text-4xl font-black text-white mb-2">AI Security Plane</h2>
                            <p className="text-[var(--text-secondary)]">Adaptive WAF and Anomaly Detection status.</p>
                        </header>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="card border-l-4 border-l-green-500">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <ShieldCheck className="text-green-500 w-8 h-8" />
                                            <div>
                                                <h3 className="text-2xl font-bold text-white">WAF Active</h3>
                                                <p className="text-sm text-[var(--text-muted)]">Inspecting 4,203 req/sec</p>
                                            </div>
                                        </div>
                                        <div className="px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-xs font-black uppercase">Filtering Active</div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center hover:bg-white/10 transition-colors">
                                            <span className="text-sm font-bold text-white">SQLi/XSS Protection</span>
                                            <div className="w-12 h-6 bg-green-500/20 rounded-full flex items-center px-1">
                                                <div className="w-4 h-4 bg-green-500 rounded-full shadow-[0_0_10px_green]" />
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center opacity-50">
                                            <span className="text-sm font-bold text-white">DDoS Threshold (Auto)</span>
                                            <span className="text-xs font-mono text-[var(--text-muted)]">Active - 50k pps</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="card">
                                    <div className="flex items-center gap-4 mb-8">
                                        <ShieldAlert className="text-red-500 w-6 h-6" />
                                        <h3 className="text-xl font-bold text-white">Threat Occurrences</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex gap-4 items-start">
                                            <div className="w-1 h-12 bg-red-500/50 rounded-full" />
                                            <div>
                                                <p className="text-sm font-black text-white">Malicious Payload Blocked</p>
                                                <p className="text-xs text-[var(--text-muted)]">Endpoint: /api/v1/admin/login • 2m ago</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 items-start opacity-70">
                                            <div className="w-1 h-12 bg-yellow-500/50 rounded-full" />
                                            <div>
                                                <p className="text-sm font-black text-white">Suspicious Latency Anomaly</p>
                                                <p className="text-xs text-[var(--text-muted)]">Confidence: 89% • 15m ago</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-1">
                                <CopilotChat />
                            </div>
                        </div>
                    </div>
                )
            case 'copilot':
                return (
                    <div className="animate-in h-full flex flex-col">
                        <header className="mb-8">
                            <h2 className="text-4xl font-black text-white mb-2">Network Brain</h2>
                            <p className="text-[var(--text-secondary)]">Dedicated full-context reasoning engine.</p>
                        </header>
                        <div className="flex-1">
                            <CopilotChat />
                        </div>
                    </div>
                )
            case 'provisioning':
                return (
                    <div className="animate-in">
                        <header className="mb-10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)]">Traffic Engineering</span>
                            </div>
                            <h2 className="text-4xl font-black text-white mb-2">Provision Gateway</h2>
                            <p className="text-[var(--text-secondary)]">Architect your network topology at the edge.</p>
                        </header>
                        <div className="card max-w-2xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-elevated)] border-[var(--border-strong)]">
                            <div className="space-y-6 p-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Gateway Identity</label>
                                    <input type="text" placeholder="e.g. Primary Edge Node" className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-white focus:border-[var(--accent-cyan)] outline-none transition-all placeholder:text-[var(--text-muted)]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Target Endpoint</label>
                                    <input type="text" placeholder="http://backend-service:8080" className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-white focus:border-[var(--accent-cyan)] outline-none transition-all placeholder:text-[var(--text-muted)]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Protocol</label>
                                        <select className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-white focus:border-[var(--accent-cyan)] outline-none appearance-none">
                                            <option>HTTP/1.1</option>
                                            <option>HTTP/2 (gRPC)</option>
                                            <option>TCP Stream</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Balancing Policy</label>
                                        <select className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-white focus:border-[var(--accent-cyan)] outline-none appearance-none">
                                            <option>Least Conn</option>
                                            <option>Round Robin</option>
                                            <option>Global Latency</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button
                                        onClick={handleBackToDashboard}
                                        className="btn-primary w-full py-4 text-lg font-black tracking-widest uppercase shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                                    >
                                        Initialize Flux
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            case 'settings':
                return (
                    <div className="animate-in h-full flex items-center justify-center py-20">
                        <div className="text-center max-w-sm">
                            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                                <Settings className="w-10 h-10 text-[var(--text-muted)]" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">System Config</h2>
                            <p className="text-[var(--text-secondary)] mb-8">Advanced node parameters and core engine settings are currently locked for stability.</p>
                            <button
                                onClick={handleBackToDashboard}
                                className="text-xs font-bold text-[var(--accent-blue)] uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Return to control plane
                            </button>
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <button
                                    onClick={() => router.push('/setup')}
                                    className="flex items-center gap-2 mx-auto text-xs font-bold text-[var(--text-muted)] hover:text-white transition-colors"
                                >
                                    <Shield size={14} />
                                    Launch Setup Wizard
                                </button>
                            </div>
                        </div>
                    </div>
                )
            default:
                return <div data-testid="null-view" />
        }
    }

    return (
        <div className="flex h-screen bg-[var(--bg-primary)]">
            <Sidebar currentView={currentView} onNavigate={setCurrentView} />
            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto p-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    )
}
