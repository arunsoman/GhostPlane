'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, Rocket, Info, ChevronRight, Zap, Shield, Activity, Globe, Cpu } from 'lucide-react'
import { Template } from './types'
import { cn } from '@/lib/utils'

interface TemplateGalleryProps {
    onSelectTemplate: (template: Template) => void
}

const categories = [
    { id: 'all', label: 'All Solutions', icon: Zap },
    { id: 'api-management', label: 'API Management', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'deployment', label: 'Deployment', icon: Rocket },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'hybrid-cloud', label: 'Hybrid Cloud', icon: Cpu },
]

export default function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
    const [templates, setTemplates] = useState<Template[]>([])
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await fetch('/api/v1/templates', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setTemplates(data.templates || [])
                }
            } catch (err) {
                console.error('Failed to fetch templates:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchTemplates()
    }, [])

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.metadata.name.toLowerCase().includes(search.toLowerCase()) ||
            t.metadata.description.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = activeCategory === 'all' || t.metadata.category === activeCategory
        return matchesSearch && matchesCategory
    })

    return (
        <div className="animate-in space-y-8">
            <header>
                <h1 className="text-4xl font-black text-white tracking-tight mb-2">Solutions Gallery</h1>
                <p className="text-[var(--text-secondary)]">One-click deployment for production-grade network patterns.</p>
            </header>

            {/* Search & Tabs */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                                activeCategory === cat.id
                                    ? "bg-[var(--accent-blue)] text-white shadow-lg"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-white"
                            )}
                        >
                            <cat.icon size={16} />
                            {cat.label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-[var(--accent-cyan)] outline-none transition-all"
                    />
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card h-64 animate-pulse bg-white/5" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((tmpl) => (
                        <button
                            key={tmpl.metadata.id}
                            onClick={() => onSelectTemplate(tmpl)}
                            className="card group text-left hover:border-[var(--accent-cyan)] transition-all flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-2xl shadow-inner">
                                    {tmpl.metadata.icon}
                                </div>
                                <div className={cn(
                                    "px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter",
                                    tmpl.metadata.difficulty === 'advanced' ? "bg-red-500/10 text-red-500" :
                                        tmpl.metadata.difficulty === 'intermediate' ? "bg-yellow-500/10 text-yellow-500" :
                                            "bg-green-500/10 text-green-500"
                                )}>
                                    {tmpl.metadata.difficulty}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--accent-cyan)] transition-colors">
                                {tmpl.metadata.name}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-6 flex-1">
                                {tmpl.metadata.description}
                            </p>

                            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest pt-4 border-t border-[var(--border-subtle)]">
                                <div className="flex gap-2">
                                    {tmpl.metadata.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="px-2 py-0.5 rounded bg-white/5">#{tag}</span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 group-hover:text-white transition-colors">
                                    Configure <ChevronRight size={12} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {!loading && filteredTemplates.length === 0 && (
                <div className="py-20 text-center card bg-white/5 border-dashed">
                    <Info className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">No templates found</h3>
                    <p className="text-[var(--text-secondary)]">Try adjusting your search or category filters.</p>
                </div>
            )}
        </div>
    )
}
