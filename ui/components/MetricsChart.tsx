'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

export default function MetricsChart() {
    const [data, setData] = useState<any[]>([
        { name: '00:00:00', latency: 0, rps: 0 }
    ])
    const lastTotalRef = useRef(0)
    const lastTimeRef = useRef(Date.now())

    useEffect(() => {
        const token = localStorage.getItem('token')
        const fetchData = async () => {
            try {
                const res = await fetch('/api/v1/metrics', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                })
                if (res.ok) {
                    const json = await res.json()
                    const now = Date.now()
                    const timeDiff = (now - lastTimeRef.current) / 1000

                    // Avoid division by zero on first run
                    let currentRps = 0
                    if (timeDiff > 0 && lastTotalRef.current > 0) {
                        const reqDiff = json.total_requests - lastTotalRef.current
                        currentRps = Math.round(reqDiff / timeDiff)
                        // Prevent negative spikes if server restarts
                        if (currentRps < 0) currentRps = 0
                    }

                    // Simulated latency as backend doesn't provide it yet
                    // But we use active_connections to modulate it (more load = higher latency)
                    const simulatedLatency = 5 + (json.active_connections * 0.5) + (Math.random() * 5)

                    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false })

                    setData(prev => {
                        const newData = [...prev, {
                            name: timeStr,
                            latency: Math.round(simulatedLatency),
                            rps: currentRps
                        }]
                        if (newData.length > 20) newData.shift()
                        return newData
                    })

                    lastTotalRef.current = json.total_requests
                    lastTimeRef.current = now
                }
            } catch (err) {
                console.error("Metrics fetch error", err)
            }
        }

        // Initial fetch
        fetchData()
        const interval = setInterval(fetchData, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="card glass h-[450px] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

            <div className="flex justify-between items-center mb-10 px-2">
                <div>
                    <h3 className="text-xl font-bold tracking-tight">System Telemetry</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-[0.1em] font-medium mt-1">Real-time Performance Analysis</p>
                </div>
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Latency</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_purple]" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RPS</span>
                    </div>
                </div>
            </div>

            <div className="h-[320px] -mx-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="rgba(255,255,255,0.2)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.2)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(5, 10, 20, 0.9)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '16px',
                                backdropFilter: 'blur(10px)',
                                fontSize: '12px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="latency"
                            stroke="#22d3ee"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorLatency)"
                            animationDuration={2000}
                        />
                        <Area
                            type="monotone"
                            dataKey="rps"
                            stroke="#a855f7"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRps)"
                            animationDuration={2500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
