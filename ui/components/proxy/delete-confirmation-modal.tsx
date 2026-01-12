'use client'

import React, { useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'

interface DeleteConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
    title: string
    message: string
    itemName: string
}

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    itemName
}: DeleteConfirmationModalProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    if (!isOpen) return null

    const handleConfirm = async () => {
        setIsDeleting(true)
        try {
            await onConfirm()
            onClose()
        } catch (error) {
            console.error('Delete failed:', error)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-red-500/20 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-4 flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
                        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 bg-red-500/5 border-y border-red-500/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-black/40 text-red-400 font-mono text-sm border border-red-500/20">
                            {itemName}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 size={16} />
                                Delete Item
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
