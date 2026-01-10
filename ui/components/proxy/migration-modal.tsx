'use client'

import React, { useState } from 'react'
import { X, Wand2, FileText, ChevronRight, AlertCircle, CheckCircle2, UploadCloud } from 'lucide-react'

interface ConfigRoute {
    path: string
    targets: string[]
    priority?: number
    methods?: string[]
}

interface MigrationModalProps {
    isOpen: boolean
    onClose: () => void
    onApplied: () => void
}

export default function MigrationModal({ isOpen, onClose, onApplied }: MigrationModalProps) {
    const [configText, setConfigText] = useState('')
    const [previewRoutes, setPreviewRoutes] = useState<ConfigRoute[]>([])
    const [migrating, setMigrating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handlePreview = async () => {
        setError(null)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/v1/migrate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ config: configText })
            })
            if (!res.ok) throw new Error('Migration service unavailable')
            const data = await res.json()
            setPreviewRoutes(data)
            if (data.length === 0) {
                setError('No valid routes detected in the provided configuration.')
            }
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            setConfigText(event.target?.result as string)
        }
        reader.readAsText(file)
    }

    const handleApply = async () => {
        setMigrating(true)
        try {
            const token = localStorage.getItem('token')
            // Apply all previewed routes
            const res = await fetch('/api/v1/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(previewRoutes)
            })
            if (!res.ok) throw new Error('Failed to apply migration')
            onApplied()
            onClose()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setMigrating(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <Wand2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Config Migration Wizard</h2>
                            <p className="text-sm text-[var(--text-secondary)] uppercase tracking-[0.2em] font-black">Nginx & Apache Converter</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)] hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Input */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-2">
                                <FileText size={14} />
                                Legacy Configuration
                            </label>
                            <label className="flex items-center gap-1.5 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20 transition-all font-black uppercase tracking-tighter">
                                <UploadCloud size={10} />
                                LOAD FROM FILE
                                <input type="file" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                        <textarea
                            value={configText}
                            onChange={(e) => setConfigText(e.target.value)}
                            placeholder="# Paste Nginx location blocks or Apache ProxyPass directives here..."
                            className="w-full h-[400px] bg-black/40 border border-[var(--border-subtle)] rounded-xl p-4 font-mono text-sm text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none placeholder:opacity-30"
                        />
                        <button
                            onClick={handlePreview}
                            disabled={!configText.trim()}
                            className="w-full py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-white font-bold hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <ChevronRight size={18} />
                            ANALYZE CONFIGURATION
                        </button>
                    </div>

                    {/* Preview */}
                    <div className="space-y-4 flex flex-col">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            Identified Routes
                        </label>

                        <div className="flex-1 bg-black/20 border border-[var(--border-subtle)] rounded-xl p-2 overflow-y-auto space-y-2 min-h-[400px]">
                            {previewRoutes.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50 italic text-sm p-4 text-center">
                                    {error ? (
                                        <div className="text-red-400 flex flex-col items-center gap-2">
                                            <AlertCircle size={24} />
                                            <span>{error}</span>
                                        </div>
                                    ) : (
                                        "Detected routes will appear here after analysis."
                                    )}
                                </div>
                            ) : (
                                previewRoutes.map((route, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-white/5 flex flex-col gap-1 group animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-indigo-400 font-bold font-mono text-xs">{route.path}</span>
                                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">Migrated</span>
                                        </div>
                                        <div className="text-[10px] text-[var(--text-secondary)] font-mono truncate">
                                            {route.targets.join(', ')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {previewRoutes.length > 0 && (
                            <button
                                onClick={handleApply}
                                disabled={migrating}
                                className="w-full py-4 rounded-xl bg-indigo-500 text-white font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
                            >
                                {migrating ? "APPLYING..." : "COMMIT MIGRATION"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/40 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex justify-between items-center italic">
                    <span>* Migrated routes will be added with default priority 10.</span>
                    <span>NLB+ Migrator v1.0</span>
                </div>
            </div>
        </div>
    )
}
