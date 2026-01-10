'use client'

import React, { useMemo } from 'react'
import ReactFlow, {
    Handle,
    Position,
    Background,
    Edge,
    Node,
    ReactFlowProvider,
    BaseEdge,
    EdgeProps,
    getBezierPath,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Network, Zap, Shield, ArrowRight, Share2, CornerRightDown } from 'lucide-react'
import { XDPStats, L4Backend } from './types'

// --- Custom Nodes ---

const NICNode = ({ data }: { data: any }) => (
    <div className="px-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-700 shadow-xl min-w-[150px]">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Network size={20} />
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inbound NIC</div>
                <div className="text-sm font-bold text-slate-200">{data.label}</div>
            </div>
        </div>
        <div className="text-[10px] font-mono text-indigo-400 bg-indigo-500/5 px-2 py-1 rounded inline-block">
            {data.pps.toLocaleString()} PPS
        </div>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900" />
    </div>
)

const XDPNode = ({ data }: { data: any }) => (
    <div className="px-6 py-4 rounded-2xl bg-indigo-950 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/10 min-w-[180px]">
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900" />
        <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-indigo-500 rounded-full text-white mb-3 shadow-lg shadow-indigo-500/50 animate-pulse">
                <Zap size={24} fill="currentColor" />
            </div>
            <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-1">Data Plane</div>
            <div className="text-base font-black text-white italic tracking-tight">XDP_CORE v1</div>
        </div>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900" />
    </div>
)

const BackendNode = ({ data }: { data: any }) => (
    <div className={`px-4 py-3 rounded-xl bg-slate-900 border-2 border-slate-800 shadow-xl min-w-[140px] transition-all ${data.active ? 'border-emerald-500/50 shadow-emerald-500/5' : ''}`}>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-slate-900" />
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${data.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                <Shield size={16} />
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Backend</div>
                <div className="text-xs font-mono text-slate-200">{data.ip}</div>
            </div>
        </div>
        {data.pps > 0 && (
            <div className="mt-2 text-[10px] font-mono text-emerald-400/80">
                {data.pps.toLocaleString()} PPS
            </div>
        )}
    </div>
)

const ActionNode = ({ data }: { data: any }) => (
    <div className={`px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 shadow-lg min-w-[100px] flex items-center gap-2`}>
        <Handle type="target" position={Position.Left} className="w-2 h-2 bg-slate-600" />
        <div className={`w-2 h-2 rounded-full ${data.color}`} />
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{data.label}</div>
        <div className="ml-auto text-[10px] font-mono text-slate-500">{data.count}</div>
    </div>
)

// --- Custom Edge ---

const FlowEdge = (props: EdgeProps) => {
    const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data } = props
    const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: data?.weight || 2,
                    stroke: data?.color || '#6366f1',
                    opacity: 0.3
                }}
            />
            {data?.animated && (
                <circle r={data.weight > 4 ? 3 : 2} fill={data.color || '#6366f1'}>
                    <animateMotion
                        dur={`${1 / (data.speed || 1)}s`}
                        repeatCount="indefinite"
                        path={edgePath}
                    />
                </circle>
            )}
        </>
    )
}

const edgeTypes = {
    flow: FlowEdge,
}

const nodeTypes = {
    nic: NICNode,
    xdp: XDPNode,
    backend: BackendNode,
    action: ActionNode,
}

// --- Main Component ---

interface PacketFlowVisualizerProps {
    stats: XDPStats
    backends: L4Backend[]
}

export default function PacketFlowVisualizer({ stats, backends }: PacketFlowVisualizerProps) {
    const { nodes, edges } = useMemo(() => {
        const nodes: Node[] = [
            { id: 'nic', type: 'nic', position: { x: 0, y: 150 }, data: { label: stats.nic.interface, pps: stats.nic.rxRate } },
            { id: 'xdp', type: 'xdp', position: { x: 300, y: 130 }, data: {} },
        ]

        const edges: Edge[] = [
            {
                id: 'nic-xdp',
                source: 'nic',
                target: 'xdp',
                type: 'flow',
                data: { animated: stats.nic.rxRate > 0, speed: 2, weight: Math.min(10, 1 + stats.nic.rxRate / 10000) }
            },
        ]

        // Backend Nodes & Edges
        backends.forEach((b, i) => {
            const bStats = stats.perBackend[b.ip]
            const yPos = 0 + (i * 100)
            nodes.push({
                id: `backend-${b.ip}`,
                type: 'backend',
                position: { x: 650, y: yPos },
                data: { ip: b.ip, active: b.enabled, pps: bStats?.packets || 0 }
            })
            edges.push({
                id: `xdp-backend-${b.ip}`,
                source: 'xdp',
                target: `backend-${b.ip}`,
                type: 'flow',
                data: {
                    animated: (bStats?.packets || 0) > 0,
                    speed: 1.5,
                    color: '#10b981',
                    weight: Math.min(8, 1 + (bStats?.packets || 0) / 5000)
                }
            })
        })

        // Action Nodes (Drop, Pass, Aborted)
        const actionNodes = [
            { id: 'pass', label: 'XDP_PASS', color: 'bg-indigo-400', count: stats.xdp.passed, y: 350 },
            { id: 'drop', label: 'XDP_DROP', color: 'bg-rose-500', count: stats.xdp.dropped, y: 400 },
            { id: 'abort', label: 'XDP_ABORT', color: 'bg-slate-600', count: stats.xdp.aborted, y: 450 },
        ]

        actionNodes.forEach(a => {
            nodes.push({ id: a.id, type: 'action', position: { x: 650, y: a.y }, data: a })
            edges.push({
                id: `xdp-${a.id}`,
                source: 'xdp',
                target: a.id,
                type: 'flow',
                data: {
                    animated: a.count > 0,
                    speed: 1,
                    color: a.id === 'drop' ? '#f43f5e' : '#94a3b8',
                    weight: Math.min(6, 1 + a.count / 10000)
                }
            })
        })

        return { nodes, edges }
    }, [stats, backends])

    return (
        <div className="h-[600px] w-full bg-slate-950/50 rounded-2xl border border-[var(--border-color)] relative overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                    <Share2 size={16} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Topology Monitor</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Real-time eBPF Map Visualization</p>
                </div>
            </div>

            <div className="absolute bottom-4 right-4 z-10 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 flex gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Ingress</div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Redirected</div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Dropped</div>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                preventScrolling={false}
                zoomOnScroll={false}
                panOnScroll={true}
                className="packet-flow-viz"
            >
                <Background color="#1e293b" gap={20} size={1} />
            </ReactFlow>
        </div>
    )
}
