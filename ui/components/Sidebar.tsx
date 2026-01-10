'use client'

import React from 'react'
import {
    Activity,
    Shield,
    Zap,
    MessageSquare,
    Settings,
    LayoutDashboard,
    Globe,
    Server,
    Cpu
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
    { icon: Globe, label: 'Proxy Rules', id: 'proxy' },
    { icon: Server, label: 'Backends', id: 'backends' },
    { icon: Cpu, label: 'L4 (eBPF)', id: 'ebpf' },
    { icon: Activity, label: 'Monitoring', id: 'monitoring' },
    { icon: Shield, label: 'Security', id: 'security' },
    { icon: MessageSquare, label: 'Copilot', id: 'copilot' },
    { icon: Settings, label: 'Settings', id: 'settings' },
]

interface SidebarProps {
    currentView: string
    onNavigate: (view: string) => void
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
    return (
        <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col h-screen">
            {/* Logo */}
            <div className="p-6 border-b border-[var(--border-subtle)]">
                <button
                    onClick={() => onNavigate('dashboard')}
                    className="flex items-center gap-3 group"
                >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-blue)] flex items-center justify-center shadow-lg">
                        <Zap className="text-white w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <span className="text-xl font-black gradient-text">NLB+</span>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left",
                            currentView === item.id
                                ? "bg-[var(--accent-blue)] text-white shadow-lg shadow-blue-500/30"
                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-white"
                        )}
                    >
                        <item.icon size={20} strokeWidth={2} />
                        <span className="font-semibold text-sm">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)]">
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield size={16} className="text-purple-400" />
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Pro Security</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">All systems protected</p>
                </div>
            </div>
        </aside>
    )
}
