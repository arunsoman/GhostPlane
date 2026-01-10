'use client'

import React, { useState } from 'react'
import { Settings, Plus, Trash2, Save, RotateCcw, Activity, Shield, Hash, Clock, AlertCircle } from 'lucide-react'
import { XDPConfig, PortMapping } from './types'

interface XDPConfigEditorProps {
    config: XDPConfig
    onSave: (config: XDPConfig) => Promise<void>
    onReset: () => Promise<void>
}

export default function XDPConfigEditor({ config, onSave, onReset }: XDPConfigEditorProps) {
    const [editedConfig, setEditedConfig] = useState<XDPConfig>(config)
    const [isSaving, setIsSaving] = useState(false)

    const handleUpdateGlobal = (key: keyof XDPConfig['global'], value: any) => {
        setEditedConfig({
            ...editedConfig,
            global: { ...editedConfig.global, [key]: value }
        })
    }

    const handleAddListener = () => {
        const newListener: PortMapping = {
            id: Math.random().toString(36).substr(2, 9),
            externalPort: 80,
            internalPort: 80,
            protocol: 'TCP',
            enabled: true,
            description: 'New Listener'
        }
        setEditedConfig({
            ...editedConfig,
            listeners: [...editedConfig.listeners, newListener]
        })
    }

    const handleRemoveListener = (id: string) => {
        setEditedConfig({
            ...editedConfig,
            listeners: editedConfig.listeners.filter(l => l.id !== id)
        })
    }

    const handleUpdateListener = (id: string, updates: Partial<PortMapping>) => {
        setEditedConfig({
            ...editedConfig,
            listeners: editedConfig.listeners.map(l => l.id === id ? { ...l, ...updates } : l)
        })
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Settings size={24} className="text-indigo-400" />
                        L4 Control Plane Configuration
                    </h2>
                    <p className="text-sm text-slate-500">Fine-tune kernel-level packet handling and listeners</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                    >
                        <RotateCcw size={14} />
                        Reset
                    </button>
                    <button
                        onClick={() => {
                            setIsSaving(true)
                            onSave(editedConfig).finally(() => setIsSaving(false))
                        }}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                        <Save size={14} />
                        {isSaving ? 'Applying...' : 'Apply Config'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Global & Performance */}
                <div className="space-y-6">
                    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Activity size={14} />
                            Kernel Tuning
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-300">Maglev Table Size</span>
                                    <span className="text-xs font-mono text-indigo-400 font-bold">{editedConfig.global.maglevTableSize}</span>
                                </label>
                                <input
                                    type="range" min="1021" max="65521" step="2"
                                    value={editedConfig.global.maglevTableSize}
                                    onChange={(e) => handleUpdateGlobal('maglevTableSize', parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <p className="text-[10px] text-slate-500 mt-2 italic">Larger values improve distribution but increase memory usage.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Backends</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm font-mono"
                                        value={editedConfig.global.maxBackends}
                                        onChange={(e) => handleUpdateGlobal('maxBackends', parseInt(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Health Interval (ms)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/20 border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm font-mono"
                                        value={editedConfig.global.healthCheckInterval}
                                        onChange={(e) => handleUpdateGlobal('healthCheckInterval', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                                        <Shield size={16} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-300">Rate Limiting</div>
                                        <div className="text-[10px] text-slate-500">DDoS Protection</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUpdateGlobal('enableRateLimit', !editedConfig.global.enableRateLimit)}
                                    className={`w-10 h-5 rounded-full transition-all relative ${editedConfig.global.enableRateLimit ? 'bg-indigo-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editedConfig.global.enableRateLimit ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-500/5 rounded-2xl border border-indigo-500/20 p-6">
                        <div className="flex gap-4 items-start text-indigo-300">
                            <AlertCircle size={24} className="shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold mb-1">Impact Analysis</h4>
                                <p className="text-xs leading-relaxed opacity-70 italic">
                                    Applying these settings will update the Kernel BPF Configuration Map. Changes to Maglev size may cause temporary reshuffling of flow states.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Columns: Listeners & Port Forwarding */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-slate-800/30">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Hash size={14} />
                                L4 Listeners & Port Forwarding
                            </h3>
                            <button
                                onClick={handleAddListener}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                                <Plus size={14} />
                                New Rule
                            </button>
                        </div>

                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-[var(--border-color)]">
                                    <th className="px-6 py-3">Public Port</th>
                                    <th className="px-6 py-3">Internal Port</th>
                                    <th className="px-6 py-3">Protocol</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {editedConfig.listeners.map(l => (
                                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                value={l.externalPort}
                                                onChange={(e) => handleUpdateListener(l.id, { externalPort: parseInt(e.target.value) })}
                                                className="bg-black/40 border border-transparent group-hover:border-slate-700/50 rounded px-2 py-1 text-sm font-mono text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-20"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                value={l.internalPort}
                                                onChange={(e) => handleUpdateListener(l.id, { internalPort: parseInt(e.target.value) })}
                                                className="bg-black/40 border border-transparent group-hover:border-slate-700/50 rounded px-2 py-1 text-sm font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-20"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={l.protocol}
                                                onChange={(e) => handleUpdateListener(l.id, { protocol: e.target.value as any })}
                                                className="bg-black/40 border border-transparent group-hover:border-slate-700/50 rounded px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option>TCP</option>
                                                <option>UDP</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={l.description}
                                                onChange={(e) => handleUpdateListener(l.id, { description: e.target.value })}
                                                className="bg-transparent border border-transparent group-hover:border-slate-700/50 rounded px-2 py-1 text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                                                placeholder="Purpose..."
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRemoveListener(l.id)}
                                                className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {editedConfig.listeners.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                                            No port forwarding rules defined. The XDP program will ignore all traffic.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><Clock size={16} /></div>
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Persistence</h4>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">L4 Configuration is backed by SQLite and automatically refreshed in the BPF Maps on startup.</p>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 w-[85%] animate-pulse" />
                            </div>
                        </div>

                        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><Shield size={16} /></div>
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">ACL Guard</h4>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">Traffic not matching a defined listener port is dropped (XDP_DROP) or passed (XDP_PASS) based on global policy.</p>
                            <div className="flex gap-2">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">STRICT</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">VERIFIED</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
