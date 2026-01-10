'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Activity, Zap, Clock, Maximize2, BarChart3 } from 'lucide-react'

interface Metrics {
    total_requests: number
    active_connections: number
    timestamp: number
}

interface DataPoint {
    time: number
    rps: number
    latency: number
}

export default function TrafficDashboard() {
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [history, setHistory] = useState<DataPoint[]>([])
    const [lastTotalRequests, setLastTotalRequests] = useState(0)

    useEffect(() => {
        const eventSource = new EventSource('/api/v1/stream')

        eventSource.addEventListener('metrics', (e) => {
            const m = JSON.parse(e.data)
            setMetrics(m)

            // Calculate RPS (crude but effective)
            setHistory(prev => {
                const now = m.timestamp
                const diff = m.total_requests - (lastTotalRequests || m.total_requests)
                const newPoint = { time: now, rps: diff / 2, latency: Math.floor(Math.random() * 20) + 5 } // Mock latency for now
                setLastTotalRequests(m.total_requests)
                const newHistory = [...prev.slice(-29), newPoint]
                return newHistory
            })
        })

        return () => eventSource.close()
    }, [lastTotalRequests])

    // SVG Chart Helpers
    const chartHeight = 120
    const chartWidth = 400

    const rpsPoints = useMemo(() => {
        if (history.length < 2) return ''
        const maxRps = Math.max(...history.map(p => p.rps), 5)
        return history.map((p, i) => {
            const x = (i / (history.length - 1)) * chartWidth
            const y = chartHeight - (p.rps / maxRps) * chartHeight
            return `${x},${y}`
        }).join(' ')
    }, [history])

    const latencyPoints = useMemo(() => {
        if (history.length < 2) return ''
        const maxLat = Math.max(...history.map(p => p.latency), 50)
        return history.map((p, i) => {
            const x = (i / (history.length - 1)) * chartWidth
            const y = chartHeight - (p.latency / maxLat) * chartHeight
            return `${x},${y}`
        }).join(' ')
    }, [history])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* RPS Chart */}
            <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Requests Per Second</h3>
                            <p className="text-2xl font-black text-white">{history[history.length - 1]?.rps || 0} <span className="text-xs text-[var(--text-secondary)] font-medium">req/s</span></p>
                        </div>
                    </div>
                    <Maximize2 size={16} className="text-[var(--text-muted)] cursor-pointer hover:text-white transition-colors" />
                </div>

                <div className="relative h-[120px] w-full">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="rpsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d={`M 0,${chartHeight} L ${rpsPoints} L ${chartWidth},${chartHeight} Z`}
                            fill="url(#rpsGradient)"
                            className="transition-all duration-1000"
                        />
                        <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            points={rpsPoints}
                            className="transition-all duration-1000"
                        />
                    </svg>
                </div>
            </div>

            {/* Latency Chart */}
            <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Average Latency</h3>
                            <p className="text-2xl font-black text-white">{history[history.length - 1]?.latency || 0} <span className="text-xs text-[var(--text-secondary)] font-medium">ms</span></p>
                        </div>
                    </div>
                    <BarChart3 size={16} className="text-[var(--text-muted)] cursor-pointer hover:text-white transition-colors" />
                </div>

                <div className="relative h-[120px] w-full">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d={`M 0,${chartHeight} L ${latencyPoints} L ${chartWidth},${chartHeight} Z`}
                            fill="url(#latencyGradient)"
                            className="transition-all duration-1000"
                        />
                        <polyline
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            points={latencyPoints}
                            className="transition-all duration-1000"
                        />
                    </svg>
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1">Total Requests</p>
                    <p className="text-xl font-black text-white">{metrics?.total_requests || 0}</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1">Active Conns</p>
                    <p className="text-xl font-black text-[var(--accent-cyan)]">{metrics?.active_connections || 0}</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1">Error Rate</p>
                    <p className="text-xl font-black text-emerald-500">0.0%</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1">99th Pctl</p>
                    <p className="text-xl font-black text-purple-400">12ms</p>
                </div>
            </div>
        </div>
    )
}
