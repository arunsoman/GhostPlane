'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Terminal, Search, Filter, Trash2, ArrowDown } from 'lucide-react'

interface AccessLog {
    timestamp: string
    method: string
    path: string
    status: number
    duration_ms: number
    backend: string
    client_ip: string
}

export default function LogViewer() {
    const [logs, setLogs] = useState<AccessLog[]>([])
    const [filter, setFilter] = useState('')
    const [autoScroll, setAutoScroll] = useState(true)
    const logEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const eventSource = new EventSource('/api/v1/stream')

        eventSource.addEventListener('log', (e) => {
            const newLog = JSON.parse(e.data)
            setLogs(prev => [...prev.slice(-99), newLog]) // Keep last 100 logs
        })

        return () => eventSource.close()
    }, [])

    useEffect(() => {
        if (autoScroll && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs, autoScroll])

    const filteredLogs = logs.filter(l =>
        l.path.toLowerCase().includes(filter.toLowerCase()) ||
        l.backend?.toLowerCase().includes(filter.toLowerCase()) ||
        l.method.toLowerCase().includes(filter.toLowerCase())
    )

    const getStatusColor = (status: number) => {
        if (status >= 500) return 'text-red-400 bg-red-400/10 border-red-400/20'
        if (status >= 400) return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
        if (status >= 300) return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
        return 'text-green-400 bg-green-400/10 border-green-400/20'
    }

    return (
        <div className="flex flex-col h-[600px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-indigo-500/10 text-indigo-400">
                        <Terminal size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Live Access Logs</h2>
                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-black">Real-time Stream</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                        <input
                            type="text"
                            placeholder="Filter logs (path, method, backend)..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setLogs([])}
                        className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Clear logs"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`p-2 rounded-lg transition-all ${autoScroll ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'}`}
                        title="Toggle Auto-scroll"
                    >
                        <ArrowDown size={16} className={autoScroll ? 'animate-bounce' : ''} />
                    </button>
                </div>
            </div>

            {/* Log List */}
            <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-black/20">
                {filteredLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50 space-y-2">
                        <div className="w-1 h-8 bg-indigo-500/20 rounded-full animate-pulse" />
                        <span>Waiting for traffic...</span>
                    </div>
                ) : (
                    filteredLogs.map((log, i) => (
                        <div key={i} className="group flex items-center gap-3 py-1 px-3 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold w-12 text-center ${getStatusColor(log.status)}`}>
                                {log.status}
                            </span>
                            <span className="text-white font-bold w-12 lowercase">{log.method}</span>
                            <span className="text-indigo-300 font-bold truncate flex-1">{log.path}</span>
                            <span className="text-[var(--text-muted)] w-24 text-right">{log.duration_ms}ms</span>
                            <span className="text-[var(--text-secondary)] truncate w-32 hidden md:block text-right">{log.backend || 'default'}</span>
                        </div>
                    ))
                )}
                <div ref={logEndRef} />
            </div>

            {/* Status Bar */}
            <div className="p-2 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Connected</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                        Showing {filteredLogs.length} of {logs.length} logs
                    </span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] italic">
                    Press <kbd className="px-1 py-0.5 bg-[var(--bg-primary)] rounded border border-[var(--border-subtle)]">Ctrl+F</kbd> to search
                </div>
            </div>
        </div>
    )
}
