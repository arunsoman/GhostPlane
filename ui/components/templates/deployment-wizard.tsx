'use client'

import React, { useState } from 'react'
import { X, ArrowRight, ArrowLeft, Rocket, ShieldCheck, Activity, Info, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Template, DeploymentStatus } from './types'
import { cn } from '@/lib/utils'

interface DeploymentWizardProps {
    template: Template
    initialDeploymentId?: string
    onClose: () => void
    onDeployComplete: () => void
}

export default function DeploymentWizard({ template, initialDeploymentId, onClose, onDeployComplete }: DeploymentWizardProps) {
    const [step, setStep] = useState(1)
    const [params, setParams] = useState<Record<string, any>>(() => {
        const defaults: Record<string, any> = {}
        template.parameters.forEach(p => {
            if (p.default !== undefined) {
                // If it's a list (e.g. backend_ips as ip_list), handle accordingly if needed
                defaults[p.name] = p.default
            }
        })
        return defaults
    })
    const [status, setStatus] = useState<DeploymentStatus | null>(null)
    const [verificationResults, setVerificationResults] = useState<any[]>([])
    const [isDeploying, setIsDeploying] = useState(false)
    const [fetchedDeployment, setFetchedDeployment] = useState(false)

    React.useEffect(() => {
        if (initialDeploymentId && !fetchedDeployment) {
            const fetchDeployment = async () => {
                try {
                    const token = localStorage.getItem('token')
                    // Using the new endpoint specific for this template, 
                    // passing deployment_id query param to fetch specifically that one
                    const res = await fetch(`/api/v1/deployments/active?deployment_id=${initialDeploymentId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        setParams(prev => ({ ...prev, ...data.parameters }))
                        // If we found it, maybe we want to notify or show status?
                        // For now just filling params is enough.
                    }
                } catch (e) {
                    console.error("Failed to hydrate deployment", e)
                } finally {
                    setFetchedDeployment(true)
                }
            }
            fetchDeployment()
        }
    }, [initialDeploymentId, template.metadata.id, fetchedDeployment])

    const handleParamChange = (name: string, value: any) => {
        setParams(prev => ({ ...prev, [name]: value }))
    }

    const handleVerify = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/v1/templates/${template.metadata.id}/verify`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setVerificationResults(data.results || [])
            }
        } catch (err) {
            console.error('Verification failed:', err)
        }
    }

    const handleDeploy = async () => {
        setStep(3)
        setIsDeploying(true)
        setStatus({ id: 'new', status: 'deploying', progress: 20 })

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/v1/templates/${template.metadata.id}/deploy`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ parameters: params, dry_run: false })
            })

            if (res.ok) {
                setStatus({ id: 'done', status: 'active', progress: 100 })
                setIsDeploying(false)
                // Start verification after a short delay to allow proxy reload
                setTimeout(handleVerify, 1000)
            } else {
                let errorMessage = 'Deployment failed';
                const responseText = await res.text();
                try {
                    const data = JSON.parse(responseText);
                    errorMessage = data.error || errorMessage;
                } catch (e) {
                    errorMessage = responseText || errorMessage;
                }
                setStatus({ id: 'error', status: 'failed', progress: 100, errors: [errorMessage] })
                setIsDeploying(false)
            }
        } catch (err: any) {
            setStatus({ id: 'error', status: 'failed', progress: 100, errors: [err.message || 'Network error'] })
            setIsDeploying(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-3xl">
                            {template.metadata.icon}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">{template.metadata.name}</h2>
                            <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Deploying {template.metadata.version}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Steps */}
                <div className="flex-1 overflow-y-auto p-8">
                    {step === 1 && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 mb-8">
                                <Info className="text-[var(--accent-cyan)]" size={20} />
                                <h3 className="text-xl font-bold text-white">Configure Parameters</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {template.parameters.map((p) => (
                                    <div key={p.name} className="space-y-2">
                                        <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest block">
                                            {p.name.replace(/_/g, ' ')}
                                            {p.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        {p.type === 'enum' ? (
                                            <select
                                                value={params[p.name]}
                                                onChange={(e) => handleParamChange(p.name, e.target.value)}
                                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:border-[var(--accent-cyan)] outline-none"
                                            >
                                                {p.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                type={p.secret ? "password" : "text"}
                                                value={params[p.name] || ''}
                                                onChange={(e) => handleParamChange(p.name, e.target.value)}
                                                placeholder={p.description}
                                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-white focus:border-[var(--accent-cyan)] outline-none transition-all placeholder:text-[var(--text-muted)]/50 text-sm"
                                            />
                                        )}
                                        <p className="text-[10px] text-[var(--text-muted)] font-medium italic">{p.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 mb-8">
                                <ShieldCheck className="text-[var(--accent-cyan)]" size={20} />
                                <h3 className="text-xl font-bold text-white">Review Architecture</h3>
                            </div>
                            <div className="card bg-[var(--bg-primary)] border-dashed border-2 py-12 flex flex-col items-center justify-center text-center">
                                <div className="text-4xl mb-6">🏛️</div>
                                <h4 className="text-lg font-bold text-white mb-2">{template.architecture.diagram}</h4>
                                <div className="flex gap-2 flex-wrap justify-center max-w-md">
                                    {template.architecture.components.map(c => (
                                        <span key={c} className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase">{c}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in zoom-in-95 duration-300 flex flex-col items-center justify-center py-12">
                            {status?.status === 'deploying' && (
                                <>
                                    <div className="relative w-24 h-24 mb-8">
                                        <Loader2 className="w-full h-full text-[var(--accent-cyan)] animate-spin" strokeWidth={1.5} />
                                        <Rocket className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2 italic">Initializing Flux...</h3>
                                    <p className="text-[var(--text-secondary)]">Applying machine logic to data plane.</p>
                                    <div className="w-64 h-2 bg-white/5 rounded-full mt-8 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" style={{ width: `${status.progress}%` }} />
                                    </div>
                                </>
                            )}

                            {status?.status === 'active' && (
                                <>
                                    <CheckCircle2 className="w-24 h-24 text-green-500 mb-8" strokeWidth={1} />
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Deployment Active</h3>
                                    <p className="text-[var(--text-secondary)]">Your network has been re-architected successfully.</p>

                                    {verificationResults.length > 0 && (
                                        <div className="mt-8 w-full max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest text-center mb-4">Live Verification Probes</h4>
                                            {verificationResults.map((result, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                                    <div className="flex items-center gap-3">
                                                        {result.success ? <CheckCircle2 size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-500" />}
                                                        <span className="text-xs font-bold text-white">{result.step}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{result.response_time_ms}ms</span>
                                                        <span className={cn("text-[10px] font-black uppercase", result.success ? "text-green-400" : "text-red-400")}>
                                                            {result.success ? "PASS" : "FAIL"}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-8 flex gap-4">
                                        <button
                                            onClick={onClose}
                                            className="px-6 py-3 rounded-xl bg-green-500 text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-green-500/30"
                                        >
                                            Complete
                                        </button>
                                    </div>
                                </>
                            )}

                            {status?.status === 'failed' && (
                                <>
                                    <AlertCircle className="w-24 h-24 text-red-500 mb-8" strokeWidth={1} />
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Deployment Failed</h3>
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 max-w-md w-full">
                                        {status.errors?.map((err, i) => <p key={i} className="text-sm text-red-400 font-bold font-mono text-center">{err}</p>)}
                                    </div>
                                    <button
                                        onClick={() => setStep(1)}
                                        className="mt-8 px-6 py-3 rounded-xl bg-white/5 text-white font-black uppercase tracking-widest text-sm"
                                    >
                                        Adjust Parameters
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]">
                    <div>
                        {step < 3 && (
                            <button
                                onClick={onClose}
                                className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {step > 1 && step < 3 && (
                            <button
                                onClick={() => setStep(prev => prev - 1)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
                            >
                                <ArrowLeft size={18} /> Back
                            </button>
                        )}
                        {step < 2 && (
                            <button
                                onClick={() => setStep(prev => prev + 1)}
                                className="btn-primary flex items-center gap-2 px-8 py-3 rounded-xl shadow-lg shadow-blue-500/30 font-black uppercase tracking-widest text-sm"
                            >
                                Next <ArrowRight size={18} />
                            </button>
                        )}
                        {step === 2 && (
                            <button
                                onClick={handleDeploy}
                                className="btn-primary flex items-center gap-2 px-8 py-3 rounded-xl shadow-lg shadow-cyan-500/30 font-black uppercase tracking-widest text-sm bg-gradient-to-r from-cyan-500 to-blue-500"
                            >
                                Deploy Template <Rocket size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
