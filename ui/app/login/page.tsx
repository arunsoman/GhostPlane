'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/v1/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })

            if (!response.ok) {
                throw new Error('Invalid credentials')
            }

            const data = await response.json()
            // Store token in localStorage
            localStorage.setItem('token', data.token)

            // Redirect to dashboard
            router.push('/')
        } catch (err) {
            setError('Invalid username or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
            <div className="w-full max-w-md">
                <div className="card p-8">
                    {/* Logo */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-blue)] flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-2xl font-black text-center mb-2 gradient-text">NLB+ Console</h1>
                    <p className="text-center text-[var(--text-muted)] text-sm mb-8">Sign in to access the management console</p>

                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-white focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                                placeholder="admin"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-white focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
                        Default credentials: <span className="text-[var(--accent-cyan)] font-mono">admin / admin123</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
