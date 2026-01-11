'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Server, Activity, ArrowRight, CheckCircle2, AlertCircle, Cpu, Wifi } from 'lucide-react'

export default function SetupPage() {
    const [step, setStep] = useState(1)
    const [caps, setCaps] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [clusterName, setClusterName] = useState('')
    const [finishing, setFinishing] = useState(false)
    const router = useRouter()

    const [error, setError] = useState<string | null>(null)

    const checkBackend = useCallback(() => {
        setLoading(true)
        setError(null)
        fetch('/api/v1/setup/check')
            .then(res => {
                if (!res.ok) throw new Error('Backend unreachable')
                return res.json()
            })
            .then(data => {
                setCaps(data.caps)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setError('Could not connect to NLB+ Control Plane. Is the backend running locally on port 8000?')
                setLoading(false)
            })
    }, [])

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }
        checkBackend()
    }, [router, checkBackend])
    // ... initialize handlers ...
    const handleInitialize = async () => {
        setFinishing(true)
        try {
            const token = localStorage.getItem('token')
            if (!token) throw new Error('Authentication required')

            const res = await fetch('/api/v1/setup/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ cluster_name: clusterName })
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.message || `Initialization failed: ${res.status}`)
            }

            // Mark setup as complete in storage for this demo
            localStorage.setItem('nlb_setup_complete', 'true')
            router.push('/')
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Failed to initialize system')
            setFinishing(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)] font-mono">Auditing system capabilities...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
                <div className="card max-w-md w-full p-8 text-center border-red-500/20">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Connection Failed</h2>
                    <p className="text-[var(--text-secondary)] mb-8">{error}</p>
                    <button
                        onClick={checkBackend}
                        className="btn-primary w-full py-3"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                {/* Progress Bar */}
                <div className="flex gap-2 mb-12">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-[var(--accent-blue)] shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`} />
                    ))}
                </div>

                <div className="card p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Shield size={120} />
                    </div>

                    {step === 1 && (
                        <div className="animate-in">
                            <h2 className="text-3xl font-black text-white mb-2">Capability Audit</h2>
                            <p className="text-[var(--text-secondary)] mb-10 text-balance">Verifying host kernel and eBPF permissions for high-speed operation.</p>

                            <div className="space-y-4 mb-10">
                                <StatusItem
                                    icon={<Cpu size={18} />}
                                    label="Kernel Version"
                                    value={caps.kernel_version}
                                    status={caps.privileged ? 'success' : 'warning'}
                                />
                                <StatusItem
                                    icon={<Shield size={18} />}
                                    label="eBPF Privilege"
                                    value={caps.privileged ? 'Granted (Root)' : 'Limited'}
                                    status={caps.privileged ? 'success' : 'error'}
                                />
                                <StatusItem
                                    icon={<Activity size={18} />}
                                    label="XDP Acceleration"
                                    value={caps.xdp_support ? 'Enabled' : 'Host Not Supported'}
                                    status={caps.xdp_support ? 'success' : 'warning'}
                                />
                                <StatusItem
                                    icon={<Wifi size={18} />}
                                    label="Networking Mode"
                                    value={caps.dockerized ? 'Docker Bridge' : 'Native'}
                                    status="neutral"
                                />
                            </div>

                            {/* Block if eBPF privilege is missing */}
                            <button
                                onClick={() => setStep(2)}
                                disabled={!caps.privileged}
                                className={`w-full btn-primary py-4 flex items-center justify-center gap-2 group ${!caps.privileged ? 'opacity-50 cursor-not-allowed bg-red-500/20 text-red-400 border-red-500/50' : ''}`}
                            >
                                {!caps.privileged ? 'System Requirements Not Met' : (
                                    <>Continue <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in">
                            <h2 className="text-3xl font-black text-white mb-2">Node Identity</h2>
                            <p className="text-[var(--text-secondary)] mb-10">Name this load balancer instance for your monitoring plane.</p>

                            <div className="mb-10">
                                <label className="block text-sm font-bold text-[var(--accent-cyan)] uppercase tracking-widest mb-3">Cluster Node Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. nlb-prod-us-01"
                                    value={clusterName}
                                    onChange={(e) => setClusterName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white text-xl font-bold focus:outline-none focus:border-[var(--accent-blue)] transition-all"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 px-6 py-4 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5">Back</button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!clusterName}
                                    className="flex-[2] btn-primary disabled:opacity-50"
                                >
                                    Review & Activate
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500">
                                <CheckCircle2 size={48} />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2">Ready for Activation</h2>
                            <p className="text-[var(--text-secondary)] mb-10">Your configuration is locked. Activation will load the eBPF data plane maps.</p>

                            <div className="bg-white/5 rounded-2xl p-6 text-left mb-10 border border-white/10">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[var(--text-muted)] text-sm">Node Name:</span>
                                    <span className="text-white font-bold">{clusterName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)] text-sm">Operation:</span>
                                    <span className="text-[var(--accent-cyan)] font-mono text-sm">L7 Round Robin</span>
                                </div>
                            </div>

                            <button
                                onClick={handleInitialize}
                                disabled={finishing}
                                className="w-full btn-primary py-4 text-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] disabled:opacity-50"
                            >
                                {finishing ? 'Activating eBPF Plane...' : 'Activate System'}
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center mt-8 text-[var(--text-muted)] text-sm">
                    NLB+ Engine v1.0.0 • Secured by Adaptive WAF
                </p>
            </div>
        </div>
    )
}

function StatusItem({ icon, label, value, status }: { icon: any, label: string, value: string, status: 'success' | 'warning' | 'error' | 'neutral' }) {
    const statusColors = {
        success: 'text-green-500',
        warning: 'text-yellow-500',
        error: 'text-red-500',
        neutral: 'text-[var(--text-muted)]'
    }

    const StatusIcon = {
        success: <CheckCircle2 size={16} />,
        warning: <AlertCircle size={16} />,
        error: <AlertCircle size={16} />,
        neutral: null
    }

    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
                <div className="text-[var(--text-muted)]">{icon}</div>
                <div>
                    <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">{label}</p>
                    <p className="text-white font-bold">{value}</p>
                </div>
            </div>
            <div className={`flex items-center gap-2 text-sm font-bold ${statusColors[status]}`}>
                {StatusIcon[status as keyof typeof StatusIcon]}
                <span className="capitalize">{status}</span>
            </div>
        </div>
    )
}
