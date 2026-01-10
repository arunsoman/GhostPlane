'use client'

import React from 'react'
import { Send, User, Bot, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CopilotChat() {
    const [messages, setMessages] = React.useState([
        { role: 'bot', content: 'Hello! I am your Network Copilot. How can I help you today?' }
    ])
    const [input, setInput] = React.useState('')

    const handleSend = async () => {
        if (!input.trim()) return
        const userMsg = input
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setInput('')

        try {
            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            })
            const data = await response.json()
            const result = data.result

            let content = ""
            if (result.prediction) {
                content = `Prediction: ${result.prediction}\nConfidence: ${result.confidence * 100}%`
            } else if (result.migration) {
                content = `Migration Plan:\n${result.migration}`
            } else {
                content = JSON.stringify(result, null, 2)
            }

            setMessages(prev => [...prev, {
                role: 'bot',
                content: content
            }])
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'bot',
                content: "I'm having trouble connecting to the brain. Is the Copilot service running?"
            }])
        }
    }

    return (
        <div className="card glass flex flex-col h-[700px] border-[hsla(var(--foreground),0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--accent-neon))] opacity-5 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-8 p-4 border-b border-[hsla(var(--foreground),0.05)] bg-[hsla(var(--foreground),0.02)]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[hsla(var(--accent-neon),0.1)] flex items-center justify-center border border-[hsla(var(--accent-neon),0.2)]">
                        <Sparkles className="text-[hsl(var(--accent-neon))] w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Network Copilot</h3>
                        <p className="text-[10px] text-[hsl(var(--accent-neon))] font-bold pulse inline-block px-2 rounded-full bg-[hsla(var(--accent-neon),0.1)] mt-1">AI-Powered Logic Active</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_green]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 opacity-30" />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 opacity-30" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 mb-6 p-4 custom-scrollbar">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex gap-4 max-w-[90%] group",
                            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border transition-transform group-hover:scale-110",
                            msg.role === 'user'
                                ? "bg-gradient-to-br from-blue-500 to-cyan-400 border-blue-400/50"
                                : "bg-gradient-to-br from-purple-600 to-pink-500 border-purple-400/50"
                        )}>
                            {msg.role === 'user' ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
                        </div>
                        <div className={cn(
                            "p-4 rounded-3xl text-sm leading-relaxed relative",
                            msg.role === 'user'
                                ? "bg-[hsla(var(--primary-neon),0.15)] text-white border border-[hsla(var(--primary-neon),0.3)] rounded-tr-none shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
                                : "bg-[hsla(var(--foreground),0.05)] text-gray-200 border border-[hsla(var(--foreground),0.1)] rounded-tl-none backdrop-blur-md"
                        )}>
                            <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                            <div className={cn(
                                "absolute top-0 w-2 h-2",
                                msg.role === 'user' ? "-right-2 bg-[hsla(var(--primary-neon),0.2)]" : "-left-2 bg-[hsla(var(--foreground),0.05)]"
                            )} style={{ clipPath: 'polygon(0 0, 0 100%, 100% 0)' }} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-[hsla(var(--foreground),0.02)] border-t border-[hsla(var(--foreground),0.05)] mt-auto">
                <div className="flex gap-3 p-2 bg-[hsla(var(--bg-deep),0.5)] rounded-2xl border border-[hsla(var(--foreground),0.1)] focus-within:border-[hsla(var(--primary-neon),0.5)] transition-all shadow-inner relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsla(var(--primary-neon),0.05)] to-transparent -translate-x-full group-focus-within:translate-x-full transition-transform duration-1000" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask the brain anything..."
                        className="flex-1 bg-transparent border-none outline-none text-sm px-4 py-2 text-white placeholder:text-gray-600 relative z-10"
                    />
                    <button
                        onClick={handleSend}
                        className="p-3 bg-gradient-to-br from-blue-600 to-cyan-500 hover:scale-105 active:scale-95 rounded-xl transition-all shadow-[0_5px_15px_hsla(var(--primary-neon),0.3)] relative z-10"
                    >
                        <Send size={20} className="text-white" />
                    </button>
                </div>
            </div>
        </div>
    )
}
