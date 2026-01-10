'use client'

import React, { useState } from 'react'
import { Cpu, Network, Zap, Unlink, RefreshCw, AlertTriangle, ShieldCheck, Info } from 'lucide-react'
import { XDPProgram, NetworkInterface, XDPMode } from './types'

interface XDPProgramManagerProps {
    programs: XDPProgram[]
    interfaces: NetworkInterface[]
    onAttach: (programId: string, iface: string, mode: XDPMode) => Promise<void>
    onDetach: (iface: string) => Promise<void>
    onReload: (iface: string) => Promise<void>
}

export default function XDPProgramManager({ programs, interfaces, onAttach, onDetach, onReload }: XDPProgramManagerProps) {
    const [selectedProgram, setSelectedProgram] = useState<string | null>(null)
    const [selectedInterface, setSelectedInterface] = useState<string | null>(null)
    const [selectedMode, setSelectedMode] = useState<XDPMode>('SKB')

    const getModeLabel = (mode: XDPMode) => {
        switch (mode) {
            case 'SKB': return 'Generic (SKB)'
            case 'DRV': return 'Native (Driver)'
            case 'HW': return 'Hardware Offload'
        }
    }

    const activeInterface = interfaces.find(i => i.name === selectedInterface)

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Program Library */}
            <div className="lg:col-span-1 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Cpu size={16} />
                    XDP Program Library
                </h3>
                <div className="space-y-3">
                    {programs.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedProgram(p.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedProgram === p.id
                                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5'
                                    : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-slate-700'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-200">{p.name}</span>
                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-mono italic">
                                    {p.version}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">{p.metadata.description}</p>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${p.compiled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                    {p.compiled ? 'Compiled & Verified' : 'Source Only'}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Interface Attachment */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-6">
                        <Network size={16} />
                        Interface Attachment & Control
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Interface</label>
                                <select
                                    className="w-full bg-black/20 border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                                    value={selectedInterface || ''}
                                    onChange={(e) => setSelectedInterface(e.target.value)}
                                >
                                    <option value="" disabled>Select Interface...</option>
                                    {interfaces.map(iface => (
                                        <option key={iface.name} value={iface.name}>
                                            {iface.name} ({iface.state.toUpperCase()})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Operation Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['SKB', 'DRV', 'HW'] as XDPMode[]).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setSelectedMode(mode)}
                                            disabled={activeInterface && mode === 'DRV' && !activeInterface.capabilities.xdpDriverMode}
                                            className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${selectedMode === mode
                                                    ? 'bg-indigo-500 border-indigo-400 text-white'
                                                    : 'bg-black/20 border-[var(--border-color)] text-slate-500 hover:text-slate-300'
                                                } disabled:opacity-30 disabled:cursor-not-allowed`}
                                        >
                                            {getModeLabel(mode)}
                                        </button>
                                    ))}
                                </div>
                                {activeInterface && !activeInterface.capabilities.xdpDriverMode && (
                                    <p className="text-[10px] text-amber-500/80 mt-2 flex gap-1 items-start leading-tight">
                                        <Info size={10} className="mt-0.5" />
                                        Native Driver mode not supported by this NIC driver. Falling back to SKB.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="bg-black/20 rounded-xl border border-[var(--border-color)] p-4 space-y-4">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Safety Check</h4>
                            <div className="space-y-3">
                                <div className="flex gap-3 items-start p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                                    <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                                    <p className="text-[10px] text-amber-200/70 leading-normal">
                                        Attaching XDP programs may cause a temporary network interruption on the target interface.
                                    </p>
                                </div>
                                <div className="flex gap-3 items-start p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                    <ShieldCheck className="text-emerald-500 shrink-0" size={16} />
                                    <p className="text-[10px] text-emerald-200/70 leading-normal">
                                        Program verified by eBPF verifier: CPU-safe, no infinite loops, 0-copy enabled.
                                    </p>
                                </div>
                            </div>
                            <button
                                disabled={!selectedProgram || !selectedInterface}
                                onClick={() => onAttach(selectedProgram!, selectedInterface!, selectedMode)}
                                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:bg-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                            >
                                <Zap size={16} fill="currentColor" />
                                Attach to Interface
                            </button>
                        </div>
                    </div>
                </div>

                {/* Active Attachments Table */}
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border-color)]">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Active XDP Hooks</h4>
                    </div>
                    <table className="w-full text-left">
                        <tbody className="divide-y divide-[var(--border-color)] text-sm">
                            {interfaces.filter(i => i.attachedProgram).map(iface => (
                                <tr key={iface.name} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-200 w-1/4">{iface.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-indigo-400 font-mono text-xs">
                                                {programs.find(p => p.id === iface.attachedProgram?.id)?.name || 'unk_xdp_prog'}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {getModeLabel(iface.attachedProgram!.mode)} • Attached {iface.attachedProgram?.attachedAt}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => onReload(iface.name)}
                                                className="p-2 hover:bg-white/5 text-slate-400 hover:text-indigo-400 rounded-lg transition-all"
                                                title="Hot Reload"
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDetach(iface.name)}
                                                className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                                                title="Detach Program"
                                            >
                                                <Unlink size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {interfaces.filter(i => i.attachedProgram).length === 0 && (
                                <tr>
                                    <td className="px-6 py-8 text-center text-slate-500 text-xs italic" colSpan={3}>
                                        No XDP programs currently attached to any network interfaces.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
