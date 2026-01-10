'use client'

import React, { useState, useEffect } from 'react'
import { Server, Activity, CheckCircle, XCircle, RefreshCw, ExternalLink, Zap } from 'lucide-react'

interface Backend {
    url: string
    alive: boolean
    avgLatency: number
    requestCount: number
}

export default function BackendPool() {
    const [backends, setBackends] = useState<Backend[]>([])
    const [loading, setLoading] = useState(true)

    const fetchBackendHealth = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/v1/config', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
            const data = await res.json()

            // Extract unique backends from all routes
            const urls = new Set<string>()
            if (data.active_routes) {
                data.active_routes.forEach((r: any) => {
                    r.targets.forEach((t: string) => urls.add(t))
                })
            }

            // Mocking some metrics for now
            const backendList = Array.from(urls).map(url => ({
                url,
                alive: true, // Should ideally come from backend
                avgLatency: Math.floor(Math.random() * 50) + 5,
                requestCount: Math.floor(Math.random() * 1000)
            }))

            setBackends(backendList)
        } catch (err) {
            console.error('Failed to fetch backend health', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBackendHealth()
        const interval = setInterval(fetchBackendHealth, 10000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Backend Pools</h2>
                    <p className="text-sm text-[var(--text-secondary)]">Health and performance of target servers</p>
                </div>
                <button
                    onClick={fetchBackendHealth}
                    className="p-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors border border-[var(--border-subtle)]"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {backends.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                        <Server className="text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">No Backends Active</h3>
                    <p className="text-[var(--text-secondary)] max-w-sm mt-2">
                        Configure routes to see backend health telemetry here.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {backends.map((b) => (
                        <div key={b.url} className="group p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--accent-blue)] transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3">
                                {b.alive ? (
                                    <CheckCircle size={18} className="text-green-500 shadow-sm" />
                                ) : (
                                    <XCircle size={18} className="text-red-500 shadow-sm" />
                                )}
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--accent-blue)] group-hover:bg-[var(--accent-blue)] group-hover:text-white transition-colors">
                                    <Server size={20} />
                                </div>
                                <div className="truncate pr-6">
                                    <h4 className="font-bold text-white truncate text-sm" title={b.url}>{b.url}</h4>
                                    <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-tighter">Active Target</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]/50">
                                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider font-bold">
                                        <Activity size={10} /> Latency
                                    </div>
                                    <div className="text-lg font-bold text-white">{b.avgLatency}ms</div>
                                </div>
                                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]/50">
                                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider font-bold">
                                        <Zap size={10} /> Requests
                                    </div>
                                    <div className="text-lg font-bold text-white">{b.requestCount}</div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-[11px]">
                                <span className={`${b.alive ? 'text-green-500' : 'text-red-500'} font-bold flex items-center gap-1`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${b.alive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    {b.alive ? 'OPERATIONAL' : 'DEGRADED'}
                                </span>
                                <button className="text-[var(--text-muted)] hover:text-white flex items-center gap-1 transition-colors group/link">
                                    Logs <ExternalLink size={10} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
