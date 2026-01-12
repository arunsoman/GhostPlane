'use client'

import React, { useState, useEffect } from 'react'
import {
    Table,
    Trash2,
    Edit2,
    Plus,
    MoreVertical,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Globe,
    ArrowRight,
    Server,
    Download,
    Upload,
    FileJson,
    Save,
    Wand2
} from 'lucide-react'

import RouteEditor from './route-editor'
import MigrationModal from './migration-modal'
import DeleteConfirmationModal from './delete-confirmation-modal'
import DeploymentWizard from '../templates/deployment-wizard'
import { Template } from '../templates/types'

// Types matching the Backend API
interface ConfigRoute {
    path: string
    methods?: string[]
    priority?: number
    targets: string[]
    source?: {
        type: string
        template_id?: string
        deployment_id?: string
    }
}

interface RouteTableProps {
    className?: string
}

export default function RouteTable({ className }: RouteTableProps) {
    const [routes, setRoutes] = useState<ConfigRoute[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [isMigrationOpen, setIsMigrationOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [routeToDelete, setRouteToDelete] = useState<string | null>(null)
    const [editingRoute, setEditingRoute] = useState<ConfigRoute | null>(null)

    // Template Edit State
    const [wizardTemplate, setWizardTemplate] = useState<Template | null>(null)
    const [wizardDeploymentId, setWizardDeploymentId] = useState<string | undefined>(undefined)

    const fetchRoutes = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/v1/config', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
            if (!res.ok) throw new Error('Failed to fetch config')
            const data = await res.json()
            // The API returns { static_config: ..., active_routes: [] }
            setRoutes(data.active_routes || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRoutes()
    }, [])

    const handleSaveRoute = async (route: ConfigRoute) => {
        let newRoutes = [...routes]
        const existingIndex = newRoutes.findIndex(r => r.path === route.path)

        if (existingIndex >= 0) {
            newRoutes[existingIndex] = route
        } else {
            if (editingRoute && editingRoute.path !== route.path) {
                newRoutes = newRoutes.filter(r => r.path !== editingRoute.path)
            }
            newRoutes.push(route)
        }

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/v1/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newRoutes)
            })
            if (!res.ok) throw new Error('Failed to update routes')
            await fetchRoutes()
        } catch (err) {
            alert('Failed to save route config')
        }
    }

    const handleDeleteClick = (path: string) => {
        setRouteToDelete(path)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!routeToDelete) return

        const path = routeToDelete
        // Optimistic update
        const oldRoutes = [...routes]
        const newRoutes = routes.filter(r => r.path !== path)
        setRoutes(newRoutes)

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/v1/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newRoutes)
            })
            if (!res.ok) throw new Error('Failed to update routes')
        } catch (err) {
            alert('Failed to delete route')
            setRoutes(oldRoutes) // Revert
            throw err // Re-throw for the modal to handle loading state
        } finally {
            setRouteToDelete(null)
        }
    }

    const openEditor = (route?: ConfigRoute) => {
        setEditingRoute(route || null)
        setIsEditorOpen(true)
    }

    const handleTemplateEdit = async (route: ConfigRoute) => {
        if (!route.source?.template_id) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/v1/templates/${route.source.template_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const tmpl = await res.json()
                setWizardTemplate(tmpl)
                setWizardDeploymentId(route.source.deployment_id)
            } else {
                alert('Failed to load original template')
            }
        } catch (e) {
            console.error(e)
            alert('Error loading template')
        }
    }

    const handleExport = () => {
        const data = JSON.stringify(routes, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nlb-routes-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const importedRoutes = JSON.parse(event.target?.result as string)
                if (confirm(`Import ${importedRoutes.length} routes? This will overwrite existing rules.`)) {
                    // Update all at once
                    const token = localStorage.getItem('token')
                    const res = await fetch('/api/v1/config', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(importedRoutes)
                    })
                    if (!res.ok) throw new Error('Failed to import routes')
                    await fetchRoutes()
                    alert('Configuration imported successfully')
                }
            } catch (err) {
                alert('Invalid configuration file')
            }
        }
        reader.readAsText(file)
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <RouteEditor
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveRoute}
                initialRoute={editingRoute}
            />

            {wizardTemplate && (
                <DeploymentWizard
                    template={wizardTemplate}
                    initialDeploymentId={wizardDeploymentId}
                    onClose={() => {
                        setWizardTemplate(null)
                        setWizardDeploymentId(undefined)
                    }}
                    onDeployComplete={() => {
                        setWizardTemplate(null)
                        setWizardDeploymentId(undefined)
                        fetchRoutes()
                    }}
                />
            )}

            <MigrationModal
                isOpen={isMigrationOpen}
                onClose={() => setIsMigrationOpen(false)}
                onApplied={fetchRoutes}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false)
                    setRouteToDelete(null)
                }}
                onConfirm={confirmDelete}
                title="Delete Route"
                message="Are you sure you want to remove this traffic rule? This action cannot be undone."
                itemName={routeToDelete || ''}
            />

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Active Routes</h2>
                    <p className="text-sm text-[var(--text-secondary)]">Manage L7 traffic rules</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMigrationOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 transition-colors border border-indigo-500/20 group"
                    >
                        <Wand2 size={16} className="group-hover:rotate-12 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Migrate</span>
                    </button>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer border border-[var(--border-subtle)] group">
                        <Upload size={16} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Import</span>
                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors border border-[var(--border-subtle)] group"
                    >
                        <Download size={16} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Export</span>
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-blue)] text-white hover:bg-blue-600 transition-colors font-semibold text-sm shadow-lg shadow-blue-500/20"
                        onClick={() => openEditor()}
                    >
                        <Plus size={16} />
                        Add Route
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64 text-[var(--text-muted)] animate-pulse">
                    Loading routing table...
                </div>
            ) : routes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                        <Globe className="text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">No Routes Configured</h3>
                    <p className="text-[var(--text-secondary)] max-w-sm mt-2">
                        Traffic is currently falling back to the default backend pool.
                    </p>
                    <button
                        className="mt-4 text-[var(--accent-blue)] hover:underline text-sm font-medium"
                        onClick={() => openEditor()}
                    >
                        Create your first route
                    </button>
                </div>
            ) : (
                <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-secondary)]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Priority</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Path Pattern</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Methods</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Target(s)</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Health</th>
                                <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {routes.map((route) => (
                                <tr key={route.path} className="group hover:bg-[var(--bg-elevated)] transition-colors">
                                    <td className="p-4">
                                        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-[var(--text-secondary)]">
                                            {route.priority || 0}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded bg-purple-500/10 text-purple-400">
                                                <Globe size={16} />
                                            </div>
                                            <code className="text-sm font-mono text-white bg-[var(--bg-primary)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                                                {route.path}
                                            </code>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(!route.methods || route.methods.length === 0) ? (
                                                <span className="text-[10px] font-bold text-[var(--text-muted)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                                                    ALL
                                                </span>
                                            ) : (
                                                route.methods.map(m => (
                                                    <span key={m} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m === 'GET' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                        m === 'POST' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                            'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                                        }`}>
                                                        {m}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            {route.targets.map((target, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                                    <ArrowRight size={12} className="text-[var(--text-muted)]" />
                                                    <span className="text-white">{target}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={16} className="text-green-500" />
                                            <span className="text-xs font-medium text-green-500">Healthy</span>
                                            {/* TODO: Real health check integration */}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {route.source?.type === 'template' ? (
                                                <button
                                                    className="p-2 rounded hover:bg-cyan-500/10 text-[var(--accent-cyan)] hover:text-cyan-400 transition-colors"
                                                    message-tooltip="Edit via Template Wizard"
                                                    onClick={() => handleTemplateEdit(route)}
                                                >
                                                    <Wand2 size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    className="p-2 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-white transition-colors"
                                                    onClick={() => openEditor(route)}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            <button
                                                className="p-2 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                                                onClick={() => handleDeleteClick(route.path)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
