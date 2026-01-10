'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Plus, Trash2, ArrowRight, Settings2 } from 'lucide-react'
import HealthCheckConfigComp from './health-check-config'

interface ConfigRoute {
    path: string
    methods?: string[]
    priority?: number
    targets: string[]
    healthCheck?: {
        path: string
        interval: number
        timeout: number
        healthyThreshold: number
        unhealthyThreshold: number
    }
}

interface RouteEditorProps {
    isOpen: boolean
    onClose: () => void
    onSave: (route: ConfigRoute) => Promise<void>
    initialRoute?: ConfigRoute | null
}

export default function RouteEditor({ isOpen, onClose, onSave, initialRoute }: RouteEditorProps) {
    const [path, setPath] = useState('')
    const [methods, setMethods] = useState<string[]>([])
    const [priority, setPriority] = useState<number>(0)
    const [targets, setTargets] = useState<string[]>([''])
    const [healthCheck, setHealthCheck] = useState<any>({
        path: '/health',
        interval: 10,
        timeout: 2,
        healthyThreshold: 2,
        unhealthyThreshold: 3
    })
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (initialRoute) {
                setPath(initialRoute.path)
                setMethods(initialRoute.methods || [])
                setPriority(initialRoute.priority || 0)
                setTargets(initialRoute.targets.length > 0 ? initialRoute.targets : [''])
                setHealthCheck(initialRoute.healthCheck || {
                    path: '/health',
                    interval: 10,
                    timeout: 2,
                    healthyThreshold: 2,
                    unhealthyThreshold: 3
                })
            } else {
                setPath('')
                setMethods([])
                setPriority(0)
                setTargets([''])
                setHealthCheck({
                    path: '/health',
                    interval: 10,
                    timeout: 2,
                    healthyThreshold: 2,
                    unhealthyThreshold: 3
                })
            }
        }
    }, [isOpen, initialRoute])

    if (!isOpen) return null

    const handleAddTarget = () => {
        setTargets([...targets, ''])
    }

    const handleRemoveTarget = (index: number) => {
        setTargets(targets.filter((_, i) => i !== index))
    }

    const handleTargetChange = (index: number, value: string) => {
        const newTargets = [...targets]
        newTargets[index] = value
        setTargets(newTargets)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            // Clean up empty targets
            const cleanTargets = targets.filter(t => t.trim() !== '')
            if (cleanTargets.length === 0) {
                alert('At least one target is required')
                setSaving(false)
                return
            }
            await onSave({
                path,
                methods,
                priority,
                targets: cleanTargets,
                healthCheck: showAdvanced ? healthCheck : undefined
            })
            onClose()
        } catch (error) {
            console.error(error)
            alert('Failed to save route')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">
                    {initialRoute ? 'Edit Route' : 'Add New Route'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                Path Pattern
                            </label>
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                placeholder="/api/v1/*"
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                Priority (Lower = Higher)
                            </label>
                            <input
                                type="number"
                                value={priority}
                                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            HTTP Methods (Optional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                        if (methods.includes(m)) {
                                            setMethods(methods.filter(x => x !== m))
                                        } else {
                                            setMethods([...methods, m])
                                        }
                                    }}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${methods.includes(m)
                                        ? 'bg-[var(--accent-blue)] text-white shadow-lg'
                                        : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] italic">
                            Leave empty to match all methods.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex justify-between items-center">
                            <span>Target Backends</span>
                            <button
                                type="button"
                                onClick={handleAddTarget}
                                className="text-[var(--accent-blue)] hover:text-blue-400 flex items-center gap-1 text-[10px]"
                            >
                                <Plus size={12} /> ADD TARGET
                            </button>
                        </label>

                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {targets.map((target, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="p-2 rounded bg-[var(--bg-primary)] text-[var(--text-muted)]">
                                        <ArrowRight size={14} />
                                    </div>
                                    <input
                                        type="text"
                                        value={target}
                                        onChange={(e) => handleTargetChange(index, e.target.value)}
                                        placeholder="http://localhost:8080"
                                        className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                    />
                                    {targets.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTarget(index)}
                                            className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-white transition-colors"
                        >
                            <Settings2 size={14} className={showAdvanced ? 'text-[var(--accent-blue)]' : ''} />
                            {showAdvanced ? 'HIDE ADVANCED SETTINGS' : 'SHOW ADVANCED SETTINGS'}
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                                <HealthCheckConfigComp
                                    config={healthCheck}
                                    onChange={setHealthCheck}
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-subtle)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-[var(--accent-blue)] text-white hover:bg-blue-600 transition-colors text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Save Route
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
