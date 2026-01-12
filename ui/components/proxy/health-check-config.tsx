'use client'

import React from 'react'
import { HeartPulse, Clock, ShieldCheck, AlertTriangle } from 'lucide-react'

interface HealthCheckConfig {
    path: string
    interval: number
    timeout: number
    healthyThreshold: number
    unhealthyThreshold: number
}

interface HealthCheckConfigProps {
    config: HealthCheckConfig
    onChange: (config: HealthCheckConfig) => void
}

export default function HealthCheckConfig({ config, onChange }: HealthCheckConfigProps) {
    const handleChange = (field: keyof HealthCheckConfig, value: any) => {
        onChange({ ...config, [field]: value })
    }

    return (
        <div className="space-y-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
            <div className="flex items-center gap-2 mb-2">
                <HeartPulse size={16} className="text-pink-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Health Check Settings</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Check Path</label>
                    <input
                        type="text"
                        value={config.path}
                        onChange={(e) => handleChange('path', e.target.value)}
                        placeholder="/health"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Interval (seconds)</label>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Clock size={12} className="text-[var(--text-muted)]" />
                            <input
                                type="number"
                                min="1"
                                value={config.interval}
                                onChange={(e) => handleChange('interval', parseInt(e.target.value) || 10)}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                            />
                        </div>
                        {config.interval < 5 && (
                            <span className="text-[10px] text-orange-400 flex items-center gap-1">
                                <AlertTriangle size={10} /> Low interval may cause high CPU usage
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Healthy Threshold</label>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={12} className="text-green-500" />
                        <input
                            type="number"
                            min="1"
                            value={config.healthyThreshold}
                            onChange={(e) => handleChange('healthyThreshold', parseInt(e.target.value) || 2)}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Unhealthy Threshold</label>
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={12} className="text-red-500" />
                        <input
                            type="number"
                            min="1"
                            value={config.unhealthyThreshold}
                            onChange={(e) => handleChange('unhealthyThreshold', parseInt(e.target.value) || 3)}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                        />
                    </div>
                </div>
            </div>

            <p className="text-[10px] text-[var(--text-muted)] italic">
                The proxy will periodically perform HEAD requests to the check path.
            </p>
        </div>
    )
}
