'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Plus, Trash2, ArrowRight, Settings2 } from 'lucide-react'
import HealthCheckConfigComp from './health-check-config'

interface RoutingRule {
    conditions: Array<{
        type: string
        key: string
        operator: string
        value: string
    }>
    match_logic: string // Consistency with backend
}

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
    rules?: RoutingRule
    algorithm?: string
    weights?: Record<string, number>
    canary?: {
        weight: number
        targets: string[]
    }
    affinity?: {
        type: string
        cookie_name?: string
    }
    resilience?: {
        timeout_ms: number
        max_retries: number
        retry_on?: number[]
    }
    circuit_breaker?: {
        error_threshold: number
        success_threshold: number
        timeout_ms: number
    }
    rate_limit?: {
        requests_per_second: number
        burst: number
    }
    auth?: {
        type: string
        keys: Record<string, string>
    }
    cache?: {
        enabled: boolean
        ttl_seconds: number
    }
    headers?: {
        add_request?: Record<string, string>
        remove_request?: string[]
        add_response?: Record<string, string>
        remove_response?: string[]
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
    const [algorithm, setAlgorithm] = useState('round_robin')
    const [weights, setWeights] = useState<Record<string, number>>({})
    const [rules, setRules] = useState<RoutingRule>(initialRoute?.rules || { conditions: [], match_logic: 'AND' })
    const [canaryWeight, setCanaryWeight] = useState(initialRoute?.canary?.weight || 0)
    const [canaryTargets, setCanaryTargets] = useState<string[]>(initialRoute?.canary?.targets || [])
    const [affinityType, setAffinityType] = useState(initialRoute?.affinity?.type || 'none')
    const [cookieName, setCookieName] = useState(initialRoute?.affinity?.cookie_name || 'GP_SESSION')
    const [timeoutMs, setTimeoutMs] = useState(initialRoute?.resilience?.timeout_ms || 30000)
    const [maxRetries, setMaxRetries] = useState(initialRoute?.resilience?.max_retries || 0)
    const [cbErrorThreshold, setCbErrorThreshold] = useState(initialRoute?.circuit_breaker?.error_threshold || 5)
    const [cbSuccessThreshold, setCbSuccessThreshold] = useState(initialRoute?.circuit_breaker?.success_threshold || 2)
    const [cbTimeoutMs, setCbTimeoutMs] = useState(initialRoute?.circuit_breaker?.timeout_ms || 30000)
    const [rlRps, setRlRps] = useState(initialRoute?.rate_limit?.requests_per_second || 100)
    const [rlBurst, setRlBurst] = useState(initialRoute?.rate_limit?.burst || 150)
    const [authType, setAuthType] = useState(initialRoute?.auth?.type || 'none')
    const [authKeys, setAuthKeys] = useState<Record<string, string>>(initialRoute?.auth?.keys || {})
    const [cacheEnabled, setCacheEnabled] = useState(initialRoute?.cache?.enabled || false)
    const [cacheTtl, setCacheTtl] = useState(initialRoute?.cache?.ttl_seconds || 60)
    const [reqHeadersAdd, setReqHeadersAdd] = useState<Record<string, string>>(initialRoute?.headers?.add_request || {})
    const [reqHeadersRemove, setReqHeadersRemove] = useState<string[]>(initialRoute?.headers?.remove_request || [])
    const [resHeadersAdd, setResHeadersAdd] = useState<Record<string, string>>(initialRoute?.headers?.add_response || {})
    const [resHeadersRemove, setResHeadersRemove] = useState<string[]>(initialRoute?.headers?.remove_response || [])
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
                setAlgorithm(initialRoute.algorithm || 'round_robin')
                setWeights(initialRoute.weights || {})
                setRules(initialRoute.rules || {
                    conditions: [],
                    match_logic: 'AND'
                })
                setCanaryWeight(initialRoute.canary?.weight || 0)
                setCanaryTargets(initialRoute.canary?.targets || [])
                setAffinityType(initialRoute.affinity?.type || 'none')
                setCookieName(initialRoute.affinity?.cookie_name || 'GP_SESSION')
                setTimeoutMs(initialRoute.resilience?.timeout_ms || 30000)
                setMaxRetries(initialRoute.resilience?.max_retries || 0)
                setCbErrorThreshold(initialRoute.circuit_breaker?.error_threshold || 5)
                setCbSuccessThreshold(initialRoute.circuit_breaker?.success_threshold || 2)
                setCbTimeoutMs(initialRoute.circuit_breaker?.timeout_ms || 30000)
                setRlRps(initialRoute.rate_limit?.requests_per_second || 100)
                setRlBurst(initialRoute.rate_limit?.burst || 150)
                setAuthType(initialRoute.auth?.type || 'none')
                setAuthKeys(initialRoute.auth?.keys || {})
                setCacheEnabled(initialRoute.cache?.enabled || false)
                setCacheTtl(initialRoute.cache?.ttl_seconds || 60)
                setReqHeadersAdd(initialRoute.headers?.add_request || {})
                setReqHeadersRemove(initialRoute.headers?.remove_request || [])
                setResHeadersAdd(initialRoute.headers?.add_response || {})
                setResHeadersRemove(initialRoute.headers?.remove_response || [])
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
                setAlgorithm('round_robin')
                setWeights({})
                setRules({
                    conditions: [],
                    match_logic: 'AND'
                })
                setCanaryWeight(0)
                setCanaryTargets([])
                setAffinityType('none')
                setCookieName('GP_SESSION')
                setTimeoutMs(30000)
                setMaxRetries(0)
                setCbErrorThreshold(5)
                setCbSuccessThreshold(2)
                setCbTimeoutMs(30000)
                setRlRps(100)
                setRlBurst(150)
                setAuthType('none')
                setAuthKeys({})
                setCacheEnabled(false)
                setCacheTtl(60)
                setReqHeadersAdd({})
                setReqHeadersRemove([])
                setResHeadersAdd({})
                setResHeadersRemove([])
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
                healthCheck: showAdvanced ? healthCheck : undefined,
                algorithm,
                weights: algorithm === 'weighted' ? weights : undefined,
                rules: rules.conditions.length > 0 ? rules : undefined,
                canary: canaryWeight > 0 ? { weight: canaryWeight, targets: canaryTargets } : undefined,
                affinity: affinityType !== 'none' ? { type: affinityType, cookie_name: affinityType === 'cookie' ? cookieName : undefined } : undefined,
                resilience: (timeoutMs !== 30000 || maxRetries > 0) ? { timeout_ms: timeoutMs, max_retries: maxRetries } : undefined,
                circuit_breaker: showAdvanced ? { error_threshold: cbErrorThreshold, success_threshold: cbSuccessThreshold, timeout_ms: cbTimeoutMs } : undefined,
                rate_limit: showAdvanced ? { requests_per_second: rlRps, burst: rlBurst } : undefined,
                auth: authType !== 'none' ? { type: authType, keys: authKeys } : undefined,
                cache: showAdvanced && cacheEnabled ? { enabled: true, ttl_seconds: cacheTtl } : undefined,
                headers: showAdvanced ? {
                    add_request: reqHeadersAdd,
                    remove_request: reqHeadersRemove,
                    add_response: resHeadersAdd,
                    remove_response: resHeadersRemove
                } : undefined
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
            <div className="w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-auto custom-scrollbar">
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
                        <label htmlFor="algorithm-select" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Load Balancing Algorithm
                        </label>
                        <select
                            id="algorithm-select"
                            value={algorithm}
                            onChange={(e) => setAlgorithm(e.target.value)}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                        >
                            <option value="round_robin">Round Robin (Default)</option>
                            <option value="random">Random</option>
                            <option value="weighted">Weighted</option>
                            <option value="least_conn">Least Connections</option>
                            <option value="ip_hash">IP Hash</option>
                        </select>
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

                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {targets.map((target, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="p-2 rounded bg-[var(--bg-primary)] text-[var(--text-muted)]">
                                        <ArrowRight size={14} />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <input
                                            type="text"
                                            value={target}
                                            onChange={(e) => handleTargetChange(index, e.target.value)}
                                            placeholder="http://localhost:8080"
                                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                        />
                                        {algorithm === 'weighted' && (
                                            <div className="flex items-center gap-2 px-2">
                                                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold min-w-[50px]">Weight:</span>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="500"
                                                    value={weights[target] || 100}
                                                    onChange={(e) => setWeights({ ...weights, [target]: parseInt(e.target.value) })}
                                                    className="flex-1 h-1 bg-[var(--bg-elevated)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-blue)]"
                                                />
                                                <span className="text-[10px] font-mono text-white min-w-[30px]">{weights[target] || 100}</span>
                                            </div>
                                        )}
                                    </div>
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
                            <div className="mt-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Settings2 size={16} className="text-purple-500" />
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Advanced Routing Rules</h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setRules({
                                                ...rules,
                                                conditions: [...rules.conditions, { type: 'header', key: '', operator: 'equals', value: '' }]
                                            })}
                                            className="text-[var(--accent-blue)] hover:text-blue-400 flex items-center gap-1 text-[10px] font-bold"
                                        >
                                            <Plus size={12} /> ADD CONDITION
                                        </button>
                                    </div>

                                    {rules.conditions.length === 0 ? (
                                        <p className="text-[10px] text-[var(--text-muted)] italic text-center py-4">
                                            No advanced rules configured. Route will match based on path/methods only.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Match Logic:</span>
                                                <div className="flex bg-[var(--bg-elevated)] rounded p-0.5">
                                                    {['AND', 'OR'].map(l => (
                                                        <button
                                                            key={l}
                                                            type="button"
                                                            onClick={() => setRules({ ...rules, match_logic: l })}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${rules.match_logic === l ? 'bg-[var(--accent-blue)] text-white' : 'text-[var(--text-muted)]'}`}
                                                        >
                                                            {l}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {rules.conditions.map((cond: any, idx: number) => (
                                                <div key={idx} className="flex gap-2 items-start bg-[var(--bg-secondary)] p-2 rounded-lg border border-[var(--border-subtle)]">
                                                    <select
                                                        value={cond.type}
                                                        onChange={(e) => {
                                                            const newConds = [...rules.conditions]
                                                            newConds[idx].type = e.target.value
                                                            setRules({ ...rules, conditions: newConds })
                                                        }}
                                                        className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-white"
                                                    >
                                                        <option value="header">Header</option>
                                                        <option value="query">Query</option>
                                                        <option value="host">Host</option>
                                                    </select>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={cond.key}
                                                                onChange={(e) => {
                                                                    const newConds = [...rules.conditions]
                                                                    newConds[idx].key = e.target.value
                                                                    setRules({ ...rules, conditions: newConds })
                                                                }}
                                                                placeholder={cond.type === 'header' ? 'X-User-Type' : cond.type === 'query' ? 'version' : 'Host'}
                                                                className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-white"
                                                            />
                                                            <select
                                                                value={cond.operator}
                                                                onChange={(e) => {
                                                                    const newConds = [...rules.conditions]
                                                                    newConds[idx].operator = e.target.value
                                                                    setRules({ ...rules, conditions: newConds })
                                                                }}
                                                                className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-white"
                                                            >
                                                                <option value="equals">Equals</option>
                                                                <option value="contains">Contains</option>
                                                                <option value="regex">Regex</option>
                                                                <option value="exists">Exists</option>
                                                                <option value="not-exists">Not Exists</option>
                                                            </select>
                                                        </div>
                                                        {cond.operator !== 'exists' && cond.operator !== 'not-exists' && (
                                                            <input
                                                                type="text"
                                                                value={cond.value}
                                                                onChange={(e) => {
                                                                    const newConds = [...rules.conditions]
                                                                    newConds[idx].value = e.target.value
                                                                    setRules({ ...rules, conditions: newConds })
                                                                }}
                                                                placeholder="Value"
                                                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-white"
                                                            />
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newConds = rules.conditions.filter((_: any, i: number) => i !== idx)
                                                            setRules({ ...rules, conditions: newConds })
                                                        }}
                                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <HealthCheckConfigComp
                                    config={healthCheck}
                                    onChange={setHealthCheck}
                                />

                                <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-6">
                                    {/* Canary */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Traffic Splitting (Canary)</h4>
                                            </div>
                                            <span className="text-xs font-mono text-yellow-400 font-bold">{canaryWeight}%</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label htmlFor="canary-weight" className="text-sm text-white">Canary Percentage</label>
                                            </div>
                                            <input
                                                id="canary-weight"
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={canaryWeight}
                                                onChange={(e) => setCanaryWeight(parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-lg appearance-none cursor-pointer accent-yellow-400"
                                            />
                                            {canaryWeight > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Canary Targets</label>
                                                    {canaryTargets.map((target, idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={target}
                                                                onChange={(e) => {
                                                                    const newTargets = [...canaryTargets]
                                                                    newTargets[idx] = e.target.value
                                                                    setCanaryTargets(newTargets)
                                                                }}
                                                                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                                placeholder="Canary backend URL"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setCanaryTargets(canaryTargets.filter((_, i) => i !== idx))}
                                                                className="p-1.5 rounded hover:bg-red-500/10 text-red-500"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => setCanaryTargets([...canaryTargets, ''])}
                                                        className="text-xs font-bold text-[var(--accent-blue)] hover:underline"
                                                    >
                                                        + ADD CANARY TARGET
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Session Affinity */}
                                    <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Session Affinity</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label htmlFor="affinity-type" className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Affinity Type</label>
                                                <select
                                                    id="affinity-type"
                                                    value={affinityType}
                                                    onChange={(e) => setAffinityType(e.target.value)}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-white"
                                                >
                                                    <option value="none">None</option>
                                                    <option value="ip">IP-based</option>
                                                    <option value="cookie">Cookie-based</option>
                                                </select>
                                            </div>
                                            {affinityType === 'cookie' && (
                                                <div className="space-y-2">
                                                    <label htmlFor="cookie-name" className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Cookie Name</label>
                                                    <input
                                                        id="cookie-name"
                                                        type="text"
                                                        value={cookieName}
                                                        onChange={(e) => setCookieName(e.target.value)}
                                                        placeholder="GP_SESSION"
                                                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-white"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Resilience */}
                                    <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Resilience</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label htmlFor="timeout-ms" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Timeout (ms)</label>
                                                <input
                                                    id="timeout-ms"
                                                    type="number"
                                                    value={timeoutMs}
                                                    onChange={(e) => setTimeoutMs(parseInt(e.target.value))}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="max-retries" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Max Retries</label>
                                                <input
                                                    id="max-retries"
                                                    type="number"
                                                    value={maxRetries}
                                                    onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                    min="0"
                                                    max="10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Circuit Breaker */}
                                    <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Circuit Breaker</h4>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label htmlFor="cb-error" className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Err Threshold</label>
                                                <input
                                                    id="cb-error"
                                                    type="number"
                                                    value={cbErrorThreshold}
                                                    onChange={(e) => setCbErrorThreshold(parseInt(e.target.value))}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="cb-success" className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Succ Threshold</label>
                                                <input
                                                    id="cb-success"
                                                    type="number"
                                                    value={cbSuccessThreshold}
                                                    onChange={(e) => setCbSuccessThreshold(parseInt(e.target.value))}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="cb-timeout" className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">CB Timeout (ms)</label>
                                                <input
                                                    id="cb-timeout"
                                                    type="number"
                                                    value={cbTimeoutMs}
                                                    onChange={(e) => setCbTimeoutMs(parseInt(e.target.value))}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rate Limiting */}
                                    <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Rate Limiting</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label htmlFor="rl-rps" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Req / Sec</label>
                                                <input
                                                    id="rl-rps"
                                                    type="number"
                                                    value={rlRps}
                                                    onChange={(e) => setRlRps(parseFloat(e.target.value))}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="rl-burst" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Burst</label>
                                                <input
                                                    id="rl-burst"
                                                    type="number"
                                                    value={rlBurst}
                                                    onChange={(e) => setRlBurst(parseInt(e.target.value))}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Authentication */}
                                    <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Security & Auth</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label htmlFor="auth-type" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Auth Type</label>
                                                <select
                                                    id="auth-type"
                                                    value={authType}
                                                    onChange={(e) => setAuthType(e.target.value)}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                >
                                                    <option value="none">None</option>
                                                    <option value="api_key">API Key (Header/Query)</option>
                                                    <option value="basic">Basic Auth</option>
                                                </select>
                                            </div>
                                            {authType !== 'none' && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Credentials</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAuthKeys({ ...authKeys, '': '' })}
                                                            className="text-[10px] font-bold text-[var(--accent-blue)] hover:underline"
                                                        >
                                                            + ADD CREDENTIAL
                                                        </button>
                                                    </div>
                                                    {Object.entries(authKeys).map(([key, value], idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={key}
                                                                onChange={(e) => {
                                                                    const newKeys = { ...authKeys }
                                                                    delete newKeys[key]
                                                                    newKeys[e.target.value] = value
                                                                    setAuthKeys(newKeys)
                                                                }}
                                                                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                                placeholder={authType === 'api_key' ? 'API Key' : 'Username'}
                                                            />
                                                            <input
                                                                type="text"
                                                                value={value}
                                                                onChange={(e) => {
                                                                    const newKeys = { ...authKeys }
                                                                    newKeys[key] = e.target.value
                                                                    setAuthKeys(newKeys)
                                                                }}
                                                                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                                placeholder={authType === 'api_key' ? 'Label (e.g. Admin)' : 'Password'}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newKeys = { ...authKeys }
                                                                    delete newKeys[key]
                                                                    setAuthKeys(newKeys)
                                                                }}
                                                                className="p-1.5 rounded hover:bg-red-500/10 text-red-500"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Response Caching */}
                                    <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Response Caching</h4>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCacheEnabled(!cacheEnabled)}
                                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter transition-all ${cacheEnabled ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]'}`}
                                            >
                                                {cacheEnabled ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>
                                        {cacheEnabled && (
                                            <div className="space-y-2">
                                                <label htmlFor="cache-ttl" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">TTL (Seconds)</label>
                                                <input
                                                    id="cache-ttl"
                                                    type="number"
                                                    value={cacheTtl}
                                                    onChange={(e) => setCacheTtl(parseInt(e.target.value))}
                                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Header Manipulation */}
                                    <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Header Manipulation</h4>
                                        </div>

                                        {/* Request Headers */}
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-orange-400/80">Request Headers (Add)</label>
                                                    <button
                                                        id="add-req-header"
                                                        type="button"
                                                        onClick={() => setReqHeadersAdd({ ...reqHeadersAdd, '': '' })}
                                                        className="text-[10px] font-bold text-[var(--accent-blue)] hover:underline"
                                                    >
                                                        + ADD HEADER
                                                    </button>
                                                </div>
                                                {Object.entries(reqHeadersAdd).map(([key, value], idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={key}
                                                            onChange={(e) => {
                                                                const next = { ...reqHeadersAdd }
                                                                delete next[key]
                                                                next[e.target.value] = value
                                                                setReqHeadersAdd(next)
                                                            }}
                                                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-white"
                                                            placeholder="Name"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={value}
                                                            onChange={(e) => {
                                                                const next = { ...reqHeadersAdd }
                                                                next[key] = e.target.value
                                                                setReqHeadersAdd(next)
                                                            }}
                                                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-white"
                                                            placeholder="Value"
                                                        />
                                                        <button type="button" onClick={() => {
                                                            const next = { ...reqHeadersAdd }
                                                            delete next[key]
                                                            setReqHeadersAdd(next)
                                                        }} className="text-red-500 p-1"><Trash2 size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-red-400/80">Request Headers (Remove)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReqHeadersRemove([...reqHeadersRemove, ''])}
                                                        className="text-[10px] font-bold text-[var(--accent-blue)] hover:underline"
                                                    >
                                                        + REMOVE HEADER
                                                    </button>
                                                </div>
                                                {reqHeadersRemove.map((header, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={header}
                                                            onChange={(e) => {
                                                                const next = [...reqHeadersRemove]
                                                                next[idx] = e.target.value
                                                                setReqHeadersRemove(next)
                                                            }}
                                                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-white"
                                                            placeholder="Header Name"
                                                        />
                                                        <button type="button" onClick={() => {
                                                            setReqHeadersRemove(reqHeadersRemove.filter((_, i) => i !== idx))
                                                        }} className="text-red-500 p-1"><Trash2 size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Response Headers */}
                                        <div className="space-y-4 pt-2">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-orange-400/80">Response Headers (Add)</label>
                                                    <button
                                                        id="add-res-header"
                                                        type="button"
                                                        onClick={() => setResHeadersAdd({ ...resHeadersAdd, '': '' })}
                                                        className="text-[10px] font-bold text-[var(--accent-blue)] hover:underline"
                                                    >
                                                        + ADD HEADER
                                                    </button>
                                                </div>
                                                {Object.entries(resHeadersAdd).map(([key, value], idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={key}
                                                            onChange={(e) => {
                                                                const next = { ...resHeadersAdd }
                                                                delete next[key]
                                                                next[e.target.value] = value
                                                                setResHeadersAdd(next)
                                                            }}
                                                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-white"
                                                            placeholder="Name"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={value}
                                                            onChange={(e) => {
                                                                const next = { ...resHeadersAdd }
                                                                next[key] = e.target.value
                                                                setResHeadersAdd(next)
                                                            }}
                                                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-white"
                                                            placeholder="Value"
                                                        />
                                                        <button type="button" onClick={() => {
                                                            const next = { ...resHeadersAdd }
                                                            delete next[key]
                                                            setResHeadersAdd(next)
                                                        }} className="text-red-500 p-1"><Trash2 size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-red-400/80">Response Headers (Remove)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setResHeadersRemove([...resHeadersRemove, ''])}
                                                        className="text-[10px] font-bold text-[var(--accent-blue)] hover:underline"
                                                    >
                                                        + REMOVE HEADER
                                                    </button>
                                                </div>
                                                {resHeadersRemove.map((header, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={header}
                                                            onChange={(e) => {
                                                                const next = [...resHeadersRemove]
                                                                next[idx] = e.target.value
                                                                setResHeadersRemove(next)
                                                            }}
                                                            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-white"
                                                            placeholder="Header Name"
                                                        />
                                                        <button type="button" onClick={() => {
                                                            setResHeadersRemove(resHeadersRemove.filter((_, i) => i !== idx))
                                                        }} className="text-red-500 p-1"><Trash2 size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
