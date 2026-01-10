'use client'

import React, { useState } from 'react'
import { Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, HelpCircle, MoreVertical, Shield, Activity, BarChart2 } from 'lucide-react'
import { L4Backend } from './types'

interface L4BackendListProps {
    backends: L4Backend[]
    onAdd: (backend: Partial<L4Backend>) => Promise<void>
    onRemove: (ip: string) => Promise<void>
    onToggle: (ip: string) => Promise<void>
    onUpdateWeight: (ip: string, weight: number) => Promise<void>
}

export default function L4BackendList({ backends, onAdd, onRemove, onToggle, onUpdateWeight }: L4BackendListProps) {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newBackend, setNewBackend] = useState({ ip: '', port: 80, weight: 10 })

    const getStatusIcon = (status: L4Backend['health']['status']) => {
        switch (status) {
            case 'healthy': return <CheckCircle2 className="text-emerald-400" size={16} />
            case 'degraded': return <AlertTriangle className="text-amber-400" size={16} />
            case 'unhealthy': return <XCircle className="text-rose-400" size={16} />
            default: return <HelpCircle className="text-slate-400" size={16} />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Shield size={20} className="text-indigo-400" />
                        L4 Backend Pool
                    </h2>
                    <p className="text-sm text-slate-400">Direct XDP packet forwarding targets</p>
                </div>
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Add Backend
                </button>
            </div>

            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border-color)] bg-slate-800/50">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Backend IP</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Weight</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Traffic (PPS)</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Active Conns</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {backends.map((b) => (
                            <tr key={b.ip} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-slate-200">{b.ip}:{b.port || 80}</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                                            {b.metadata.label || 'PROD-BACKEND'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(b.health.status)}
                                        <span className={`text-xs font-medium capitalize ${b.health.status === 'healthy' ? 'text-emerald-400' :
                                                b.health.status === 'unhealthy' ? 'text-rose-400' :
                                                    'text-amber-400'
                                            }`}>
                                            {b.health.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-3">
                                        <input
                                            type="range"
                                            min="1"
                                            max="100"
                                            value={b.weight}
                                            onChange={(e) => onUpdateWeight(b.ip, parseInt(e.target.value))}
                                            className="w-24 accent-indigo-500"
                                        />
                                        <span className="text-xs font-mono w-6 text-center">{b.weight}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 font-mono text-indigo-400 text-sm">
                                        <Activity size={12} className="animate-pulse" />
                                        {b.stats.packetsProcessed.toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-slate-300">{b.stats.activeConnections}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onRemove(b.ip)}
                                            className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button className="p-2 hover:bg-white/5 text-slate-400 rounded-lg transition-all">
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {backends.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                    No backends provisioned in the XDP pool.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Backend Modal Placeholder */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <h3 className="text-xl font-bold mb-4">Add L4 Backend</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target IPv4</label>
                                <input
                                    type="text"
                                    placeholder="10.0.0.1"
                                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={newBackend.ip}
                                    onChange={(e) => setNewBackend({ ...newBackend, ip: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Port</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={newBackend.port}
                                        onChange={(e) => setNewBackend({ ...newBackend, port: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Weight</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={newBackend.weight}
                                        onChange={(e) => setNewBackend({ ...newBackend, weight: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsAddOpen(false)}
                                className="px-4 py-2 text-sm font-medium hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onAdd(newBackend)
                                    setIsAddOpen(false)
                                }}
                                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                Provision IP
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
