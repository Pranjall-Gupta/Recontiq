import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Network, AlertTriangle, ShieldCheck, Activity, Loader2, X,
  FileText, CheckCircle2, Shield, UploadCloud, Mail, Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { getFraudNodes, getFraudGraph } from '../api/api-client';

const severityVariant: Record<string, 'danger' | 'warning' | 'info' | 'neutral' | 'success'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'success',
};

const formatCurrency = (val: number | string | null | undefined) => {
  if (val === undefined || val === null) return '₹0';
  const num = typeof val === 'number' ? val : parseFloat(val.toString());
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

// Custom force-directed simulation in React Hook (with spread-out physics)
function useForceLayout(nodes: any[], edges: any[], width = 760, height = 480) {
  const [layoutNodes, setLayoutNodes] = useState<any[]>([]);

  useEffect(() => {
    if (!nodes || nodes.length === 0) {
      setLayoutNodes([]);
      return;
    }

    const numNodes = nodes.length;
    // Position nodes in a wider circle initially to prevent congestion at the center
    const initialized = nodes.map((node, i) => {
      const angle = (i / numNodes) * 2 * Math.PI;
      const radius = 170 + Math.random() * 60;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    // Run physics force layout synchronously to stabilize positions with high spacing
    const k = 0.04;          // Spring attraction force constant (lowered to let nodes separate)
    const d0 = 160;         // Ideal edge/spring length (increased from 100)
    const rep = 7500;       // Repulsion constant (increased from 1200)
    const centerGravity = 0.012; // Gravity to center (lowered from 0.04 to allow spreading)

    for (let step = 0; step < 240; step++) {
      // 1. Repulsion: Push nodes away from one another
      for (let i = 0; i < initialized.length; i++) {
        for (let j = i + 1; j < initialized.length; j++) {
          const n1 = initialized[i];
          const n2 = initialized[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(distSq);
          
          if (dist < 340) { // Increased active distance from 220
            const force = rep / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Attraction: Pull nodes together if connected by an edge
      edges.forEach((edge) => {
        const sourceNode = initialized.find((n) => n.id === edge.source);
        const targetNode = initialized.find((n) => n.id === edge.target);
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const force = k * (dist - d0);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          sourceNode.vx += fx;
          sourceNode.vy += fy;
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      });

      // 3. Center Gravity & Coordinate Updates
      initialized.forEach((node) => {
        const dxCenter = width / 2 - node.x;
        const dyCenter = height / 2 - node.y;
        node.vx += dxCenter * centerGravity;
        node.vy += dyCenter * centerGravity;

        // Apply drag/friction (settle smoothly)
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.82;
        node.vy *= 0.82;

        // Constraint check to stay inside canvas borders (with padding)
        node.x = Math.max(50, Math.min(width - 50, node.x));
        node.y = Math.max(50, Math.min(height - 50, node.y));
      });
    }

    setLayoutNodes(initialized);
  }, [nodes, edges, width, height]);

  return { layoutNodes, setLayoutNodes };
}

export default function FraudIntelligence() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [trustThreshold, setTrustThreshold] = useState(0.85);

  const canvasWidth = 760;
  const canvasHeight = 480;

  // 1. Fetch Suspicious Vendors List (passing parameter directly to backend)
  const { data: suspiciousVendors, isLoading: loadingVendors } = useQuery({
    queryKey: ['suspiciousVendors', trustThreshold],
    queryFn: async () => {
      const res = await getFraudNodes(trustThreshold);
      return res.data;
    },
  });

  // 2. Fetch Fraud Node-Link Graph (passing parameter directly to backend)
  const { data: graphRes, isLoading: loadingGraph } = useQuery({
    queryKey: ['fraudGraph', trustThreshold],
    queryFn: async () => {
      const res = await getFraudGraph(trustThreshold);
      return res.data;
    },
  });

  const nodes = graphRes?.nodes || [];
  const edges = graphRes?.edges || [];

  // Run Custom Physics simulation (exposing setLayoutNodes for reactive dragging manipulation)
  const { layoutNodes, setLayoutNodes } = useForceLayout(nodes, edges, canvasWidth, canvasHeight);

  // Active details card (vendor details)
  const activeNode = layoutNodes.find((n) => n.id === selectedNodeId);

  // ─── Dragging State & Handlers for SVG Nodes ───
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasWidth;
    const y = ((e.clientY - rect.top) / rect.height) * canvasHeight;

    const boundedX = Math.max(30, Math.min(canvasWidth - 30, x));
    const boundedY = Math.max(30, Math.min(canvasHeight - 30, y));

    setLayoutNodes((prevNodes) =>
      prevNodes.map((n) =>
        n.id === draggingNodeId ? { ...n, x: boundedX, y: boundedY } : n
      )
    );
  };

  // ─── Compliance Evidence Locker States ───
  const [evidenceList, setEvidenceList] = useState([
    {
      id: 'EVD-2024-WIP1099',
      vendor: 'Wipro Technologies',
      gstin: '29AAACW4977K1ZH',
      type: 'MISSING',
      period: 'Mar 2024',
      amount: 780000,
      hash: 'a3f89e2c6d7a4b8f0c1e3d9e8b7a6f5e4c3d2b1a0f9e8d7c6b5a4f3e2d1c0b9a',
      status: 'PENDING',
      documents: ['Purchase_Ledger_Mar2024.pdf'],
    },
    {
      id: 'EVD-2024-TCS9081',
      vendor: 'Tata Consultancy Services',
      gstin: '27AABCT1332L1ZV',
      type: 'AMOUNT',
      period: 'Mar 2024',
      amount: 425000,
      hash: '6d8f5e4c3d2b1a0f9e8d7c6b5a4f3e2d1c0b9a3f89e2c6d7a4b8f0c1e3d9e8b7',
      status: 'VERIFIED',
      documents: ['Invoice_TCS_9081.pdf', 'Bank_Receipt_Mar.pdf'],
    },
    {
      id: 'EVD-2024-INF7762',
      vendor: 'Infosys Limited',
      gstin: '29AAACI1681N1ZG',
      type: 'NAME',
      period: 'Mar 2024',
      amount: 1240000,
      hash: '0c1e3d9e8b7a6f5e4c3d2b1a0f9e8d7c6b5a4f3e2d1c0b9a3f89e2c6d7a4b8f',
      status: 'VERIFIED',
      documents: ['Infosys_Recon_Notice.pdf'],
    },
  ]);

  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>('EVD-2024-WIP1099');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [notificationSuccess, setNotificationSuccess] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const selectedEvidence = evidenceList.find(e => e.id === selectedEvidenceId);

  const handleVerifyIntegrity = (id: string) => {
    setVerifyingId(id);
    setTimeout(() => {
      setEvidenceList(prev => 
        prev.map(e => e.id === id ? { ...e, status: 'VERIFIED' } : e)
      );
      setVerifyingId(null);
    }, 1200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileName = e.target.files[0].name;
    setUploadingId(id);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setEvidenceList(current =>
              current.map(item =>
                item.id === id ? { ...item, documents: [...item.documents, fileName] } : item
              )
            );
            setUploadingId(null);
            setUploadProgress(0);
          }, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleNotifyPortal = (id: string) => {
    setNotifyingId(id);
    setNotificationSuccess(false);
  };
  
  const handleConfirmNotify = () => {
    setTimeout(() => {
      setNotificationSuccess(true);
      setTimeout(() => {
        setNotifyingId(null);
        setNotificationSuccess(false);
      }, 2000);
    }, 1200);
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-24">
      <div className="grid gap-24 lg:grid-cols-3">
        {/* Entity Relationship Graph View */}
        <Card className="min-h-[540px] lg:col-span-2 flex flex-col border border-gray-200 dark:border-border-dark shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-16">
            <div>
              <CardTitle>Entity Relationship Graph</CardTitle>
              <p className="mt-4 text-body-sm text-gray-500">
                Interactive 2D spring force relationship map showing shell entity structures
              </p>
            </div>
            <div className="flex items-center gap-12 shrink-0">
              <span className="text-body-xs font-semibold text-gray-400">Trust Cap:</span>
              <select 
                className="rounded-input border border-gray-200 px-8 py-4 text-body-sm bg-gray-50 dark:bg-slate-900"
                value={trustThreshold}
                onChange={(e) => setTrustThreshold(parseFloat(e.target.value))}
              >
                <option value="1.0">All Vendors (&lt;100%)</option>
                <option value="0.85">Suspicious & At-Risk (&lt;85%)</option>
                <option value="0.6">High-Risk Only (&lt;60%)</option>
                <option value="0.4">Critical Anomalies (&lt;40%)</option>
              </select>
            </div>
          </CardHeader>

          {loadingGraph ? (
            <div className="flex flex-1 flex-col items-center justify-center space-y-16 py-[120px]">
              <Loader2 className="h-40 w-40 animate-spin text-accent" />
              <p className="text-body-sm text-gray-500">Solving spring force-directed vectors...</p>
            </div>
          ) : layoutNodes.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-60 text-center">
              <Network className="mb-16 h-40 w-40 text-gray-300" />
              <p className="text-body font-bold text-gray-700 dark:text-gray-400">No Relationship Data Found</p>
              <p className="text-body-sm text-gray-500 mt-4 max-w-xs">Try raising the trust filter cap above.</p>
            </div>
          ) : (
            <div className="relative flex-1 bg-gray-50/50 dark:bg-[#1E1B4B]/5 rounded-b-card overflow-hidden">
              <style>{`
                @keyframes flow {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
                .animate-flow-suspicious {
                  stroke-dasharray: 6, 4;
                  animation: flow 1.2s linear infinite;
                }
                .animate-flow-safe {
                  stroke-dasharray: 4, 6;
                  animation: flow 2.5s linear infinite;
                }
                @keyframes pulse-ring {
                  0% { transform: scale(0.95); opacity: 0.8; }
                  50% { transform: scale(1.1); opacity: 0.3; }
                  100% { transform: scale(1.25); opacity: 0; }
                }
                .pulse-ring-element {
                  animation: pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
                }
              `}</style>

              {/* SVG Relationship Graph */}
              <svg 
                ref={svgRef}
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} 
                className="w-full h-[460px] select-none"
                onMouseMove={handleMouseMove}
                onMouseUp={() => setDraggingNodeId(null)}
                onMouseLeave={() => setDraggingNodeId(null)}
              >
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* Soft neon red pulse glow for high risk/critical nodes */}
                  <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feColorMatrix type="matrix" values="
                      1 0 0 0 0.93
                      0 0 0 0 0.27
                      0 0 0 0 0.27
                      0 0 0 1 0
                    " />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Cool neon indigo glow for selected nodes */}
                  <filter id="glow-indigo" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feColorMatrix type="matrix" values="
                      0 0 0 0 0.38
                      0 1 0 0 0.40
                      0 0 1 0 0.94
                      0 0 0 1 0
                    " />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Neon teal glow for invoice/safe nodes */}
                  <filter id="glow-teal" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feColorMatrix type="matrix" values="
                      0 0 0 0 0.05
                      0 1 0 0 0.58
                      0 0 1 0 0.53
                      0 0 0 0.8 0
                    " />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Draw Edges */}
                {edges.map((edge: any) => {
                  const source = layoutNodes.find((n) => n.id === edge.source);
                  const target = layoutNodes.find((n) => n.id === edge.target);
                  if (!source || !target) return null;

                  const isSuspicious = edge.relation === 'SUSPICIOUS';
                  const isSelected = selectedNodeId === edge.source || selectedNodeId === edge.target;

                  return (
                    <g key={edge.id}>
                      {/* Shadow highlight under selected link */}
                      {isSelected && (
                        <line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke="#6366F1"
                          strokeWidth="5"
                          strokeOpacity="0.25"
                        />
                      )}
                      {/* Real link line */}
                      <line
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={isSuspicious ? '#EF4444' : edge.relation === 'MATCHES' ? '#10B981' : '#6366F1'}
                        strokeWidth={isSuspicious ? '2.5' : '1.5'}
                        className={isSuspicious ? 'animate-flow-suspicious' : edge.relation === 'MATCHES' ? 'animate-flow-safe' : ''}
                        strokeOpacity={selectedNodeId && !isSelected ? '0.15' : '0.75'}
                      />
                      {/* Pulsing glow particle traveling along suspicious edge */}
                      {isSuspicious && (!selectedNodeId || isSelected) && (
                        <circle r="4.5" fill="#EF4444" filter="url(#glow-red)">
                          <animateMotion 
                            dur="3s" 
                            repeatCount="indefinite" 
                            path={`M ${source.x} ${source.y} L ${target.x} ${target.y}`} 
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}

                {/* Draw Nodes */}
                {layoutNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isHighRisk = node.riskLevel === 'critical' || node.riskLevel === 'high';
                  const opacity = selectedNodeId && !isSelected ? 'opacity-30' : 'opacity-100';

                  // Size mapping based on node type
                  const size = node.type === 'vendor' ? 24 : node.type === 'gstin' ? 18 : 14;

                  return (
                    <g
                      key={node.id}
                      className={`cursor-pointer transition-opacity duration-200 ${opacity}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingNodeId(node.id);
                      }}
                      onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      {/* Double pulsing ring for high risk nodes */}
                      {isHighRisk && (
                        <>
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={size + 8}
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth="1"
                            strokeOpacity="0.4"
                            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                            className="pulse-ring-element"
                          />
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={size + 4}
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth="1.5"
                            className="animate-pulse"
                          />
                        </>
                      )}

                      {/* Outer selected glow border */}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={size + 4}
                          fill="none"
                          stroke="#6366F1"
                          strokeWidth="3.5"
                        />
                      )}

                      {/* Core node circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={size}
                        fill={
                          node.type === 'vendor' ? '#1E1B4B' :
                          node.type === 'gstin' ? '#4F46E5' : '#0D9488'
                        }
                        filter={
                          isSelected ? 'url(#glow-indigo)' :
                          isHighRisk ? 'url(#glow-red)' :
                          node.type === 'invoice' ? 'url(#glow-teal)' : undefined
                        }
                        className="shadow-sm transition-all duration-300"
                        stroke={draggingNodeId === node.id ? '#6366F1' : isHighRisk ? '#EF4444' : '#FFFFFF'}
                        strokeWidth={draggingNodeId === node.id ? '3.5' : '2'}
                      />

                      {/* Simple geometric icon glyph inside node */}
                      {node.type === 'vendor' && (
                        <path
                          d={`M ${node.x - 6} ${node.y - 6} h 12 v 12 h -12 z`}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      )}
                      {node.type === 'gstin' && (
                        <polygon
                          points={`${node.x},${node.y - 7} ${node.x + 6},${node.y + 5} ${node.x - 6},${node.y + 5}`}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      )}
                      {node.type === 'invoice' && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="3.5"
                          fill="#FFFFFF"
                        />
                      )}

                      {/* Node text label (visible on hover, or when selected, or for large vendor nodes) */}
                      {(isHovered || isSelected || node.type === 'vendor') && (
                        <g>
                          {/* Text background bubble */}
                          <rect
                            x={node.x - (node.label.length * 3.5) - 6}
                            y={node.y - size - 24}
                            width={node.label.length * 7 + 12}
                            height="18"
                            rx="4"
                            fill="#1E293B"
                            fillOpacity="0.9"
                          />
                          <text
                            x={node.x}
                            y={node.y - size - 12}
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {node.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Float HUD on Graph Workspace */}
              <div className="absolute top-12 left-12 flex flex-col gap-6 text-body-xs bg-slate-900/90 text-white rounded-card p-12 border border-slate-700/50 shadow-md">
                <div className="flex items-center gap-8">
                  <span className="h-8 w-8 rounded-full bg-[#1E1B4B] border border-white" />
                  <span className="font-semibold">Corporate Vendor Node</span>
                </div>
                <div className="flex items-center gap-8">
                  <span className="h-8 w-8 rounded-full bg-[#4F46E5] border border-white" />
                  <span className="font-semibold">GSTIN Identifier Node</span>
                </div>
                <div className="flex items-center gap-8">
                  <span className="h-8 w-8 rounded-full bg-[#0D9488] border border-white" />
                  <span className="font-semibold">Invoice Node</span>
                </div>
                <div className="flex items-center gap-8 border-t border-slate-700/50 pt-6 mt-4 text-[#EF4444]">
                  <Activity size={10} className="animate-pulse" />
                  <span className="font-bold">Crimson edge = Shared GSTIN conflict</span>
                </div>
              </div>

              {/* Slide up overlay for selected entity */}
              <AnimatePresence>
                {activeNode && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="absolute bottom-0 inset-x-0 bg-slate-900 text-white p-16 border-t border-slate-800 shadow-2xl flex justify-between gap-24"
                  >
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-12">
                        <h4 className="text-body font-bold text-teal-400">{activeNode.label}</h4>
                        <Badge variant={severityVariant[activeNode.riskLevel] || 'neutral'} className="font-bold uppercase tracking-wider text-[10px]">
                          {activeNode.riskLevel} Risk
                        </Badge>
                      </div>
                      <p className="text-body-xs text-slate-400 font-medium">
                        Type: <strong className="text-slate-200 capitalize">{activeNode.type} Node</strong>
                        {activeNode.data?.gstin && ` · GSTIN: ${activeNode.data.gstin}`}
                      </p>
                      {activeNode.data?.riskReason && (
                        <p className="text-body-xs text-error font-semibold flex items-center gap-6 mt-6">
                          <AlertTriangle size={12} />
                          {activeNode.data.riskReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-12 shrink-0">
                      {activeNode.type === 'vendor' && activeNode.data?.trustScore !== undefined && (
                        <div className="text-right space-y-4">
                          <span className="block text-[10px] font-semibold text-slate-400">TRUST SCORE</span>
                          <span className={`font-mono text-heading-s font-bold ${activeNode.data.trustScore < 0.4 ? 'text-error' : 'text-warning'}`}>
                            {Math.round(activeNode.data.trustScore * 100)}%
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedNodeId(null)}
                        className="rounded-full p-4 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </Card>

        {/* Detected Patterns List Panel */}
        <Card className="flex flex-col border border-gray-200 dark:border-border-dark shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-12 border-b border-gray-100 dark:border-border-dark pb-16 shrink-0">
            <div>
              <CardTitle>Suspicious Entities</CardTitle>
              <p className="text-body-sm text-gray-500 mt-4">Entities with shared links or low scores</p>
            </div>
            <Button variant="secondary" className="!px-12 !py-6 text-xs">
              <Download size={12} />
              Export Evidence
            </Button>
          </CardHeader>
          
          {loadingVendors ? (
            <div className="flex flex-1 items-center justify-center py-48">
              <Loader2 className="h-28 w-28 animate-spin text-accent" />
            </div>
          ) : !suspiciousVendors || suspiciousVendors.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-24 text-center">
              <ShieldCheck className="h-40 w-40 text-success mb-12" />
              <h5 className="text-body font-bold text-gray-800 dark:text-gray-200">No Risk Alarms Active</h5>
              <p className="text-body-xs text-gray-500 mt-4">
                All active vendor relationships verify perfectly against GSTIN velocity patterns.
              </p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-border-dark pr-4 space-y-2 mt-12 max-h-[460px]">
              {suspiciousVendors.map((vendor: any) => {
                const isSelected = activeNode?.data?.gstin === vendor.gstin || activeNode?.label.toLowerCase().includes(vendor.gstin.toLowerCase());
                return (
                  <li
                    key={vendor.vendorId}
                    onClick={() => {
                      const node = layoutNodes.find((n) => n.label.toLowerCase().includes(vendor.gstin.toLowerCase()) || (n.data && n.data.gstin === vendor.gstin));
                      if (node) {
                        setSelectedNodeId(node.id);
                      }
                    }}
                    className={`rounded-button border p-12 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-400 bg-indigo-50/30 dark:border-indigo-950/40 dark:bg-[#1E1B4B]/10' 
                        : 'border-gray-100 hover:border-gray-300 dark:border-border-dark dark:hover:border-slate-800'
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-8">
                      <p className="text-body-sm font-bold text-primary dark:text-primary-light font-sans text-left">
                        {vendor.canonicalName || 'Suspicious Vendor'}
                      </p>
                      <Badge variant={vendor.trustScore < 0.4 ? 'danger' : 'warning'} className="font-mono text-[10px] font-bold">
                        TRUST: {Math.round(vendor.trustScore * 100)}%
                      </Badge>
                    </div>
                    <p className="text-body-xs text-gray-400 font-semibold font-mono text-left">
                      GSTIN: {vendor.gstin}
                    </p>
                    <p className="text-body-xs text-error font-medium flex items-center gap-4 mt-8 text-left">
                      <AlertTriangle size={12} className="shrink-0" />
                      {vendor.riskReason}
                    </p>

                    <div className="mt-8 border-t border-gray-100 dark:border-border-dark/50 pt-8 flex justify-between items-center">
                      <div className="flex flex-col text-[10px] text-gray-500 font-semibold text-left">
                        <span className="font-mono">Mismatches: {vendor.mismatchCount}</span>
                        <span className="font-mono text-error mt-2">Diff: {formatCurrency(vendor.totalMismatchAmount)}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="text-body-xs !py-1 !px-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 flex items-center gap-4 transition-all"
                        onClick={(e) => {
                          e.stopPropagation(); // prevent card onClick double-fire
                          const node = layoutNodes.find((n) => 
                            (n.label && n.label.toLowerCase().includes(vendor.gstin.toLowerCase())) || 
                            (n.data && n.data.gstin === vendor.gstin) ||
                            (n.label && n.label.toLowerCase().includes(vendor.canonicalName.toLowerCase()))
                          );
                          if (node) {
                            setSelectedNodeId(node.id);
                          }
                        }}
                      >
                        <Network size={12} className="animate-pulse" />
                        Focus in Graph
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Compliance Evidence Locker Card */}
      <Card className="border border-gray-200 dark:border-border-dark shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-16">
          <div className="text-left">
            <CardTitle className="flex items-center gap-8">
              <ShieldCheck className="h-20 w-20 text-indigo-500 animate-pulse" />
              Compliance Evidence Locker
            </CardTitle>
            <p className="mt-4 text-body-sm text-gray-500">
              Auditor-ready evidentiary packages with cryptographic tamper proofs and ledger anchors
            </p>
          </div>
          <div className="flex items-center gap-12 text-body-xs font-semibold text-gray-400 shrink-0">
            <span className="flex items-center gap-6 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-8 py-4 rounded-full border border-emerald-200/50">
              <span className="h-6 w-6 rounded-full bg-emerald-500 animate-ping inline-block animate-pulse" />
              Ledger Active: Block #94,820
            </span>
          </div>
        </CardHeader>

        <div className="grid gap-24 md:grid-cols-3 p-16">
          {/* Left Column: Evidence List */}
          <div className="md:col-span-1 border-r border-gray-100 dark:border-border-dark pr-16 space-y-12 max-h-[380px] overflow-y-auto">
            {evidenceList.map((item) => {
              const isSel = item.id === selectedEvidenceId;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedEvidenceId(item.id)}
                  className={`p-12 rounded-button border transition-all cursor-pointer text-left space-y-4 ${
                    isSel
                      ? 'border-indigo-500 bg-indigo-55/20 dark:border-indigo-900/40 dark:bg-[#1E1B4B]/10 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 dark:border-border-dark dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-body-xs font-mono font-bold text-gray-400">{item.id}</span>
                    <Badge variant={item.status === 'VERIFIED' ? 'success' : 'warning'} className="font-mono text-[9px] font-bold py-1">
                      {item.status}
                    </Badge>
                  </div>
                  <h5 className="text-body-sm font-bold text-primary dark:text-primary-light truncate">{item.vendor}</h5>
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold">
                    <span>{item.period}</span>
                    <span className="font-semibold text-error font-mono">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Evidence Details Visualizer */}
          <div className="md:col-span-2 space-y-16 pl-8 relative">
            {selectedEvidence ? (
              <>
                {/* Cryptographic metadata header */}
                <div className="bg-gray-50/50 dark:bg-[#1E1B4B]/5 p-16 rounded-card border border-gray-100 dark:border-border-dark space-y-12">
                  <div className="flex flex-wrap items-center justify-between gap-12 pb-8 border-b border-gray-100 dark:border-border-dark">
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Evidentiary Record ID</span>
                      <h4 className="text-body font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedEvidence.id}</h4>
                    </div>
                    <div className="flex items-center gap-8 font-sans">
                      <Badge variant="neutral" className="font-mono text-body-xs">{selectedEvidence.gstin}</Badge>
                      <Badge variant={selectedEvidence.type === 'MISSING' ? 'danger' : 'warning'} className="font-mono text-body-xs uppercase font-bold">
                        {selectedEvidence.type} MISMATCH
                      </Badge>
                    </div>
                  </div>

                  {/* Cryptographic hash seal copyable box */}
                  <div className="space-y-6 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ledger Verification Seal (SHA-256)</span>
                    <div className="flex items-center gap-8 bg-slate-900 text-slate-300 p-8 rounded-card border border-slate-800 font-mono text-[11px] overflow-x-auto relative group">
                      <span className="break-all pr-32 select-all text-left font-mono">{selectedEvidence.hash}</span>
                      <button
                        onClick={() => handleCopyHash(selectedEvidence.hash)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white h-24 w-24 hover:bg-slate-800 rounded-sm flex items-center justify-center transition-colors"
                      >
                        {copiedHash === selectedEvidence.hash ? <Check size={12} className="text-emerald-400" /> : <Download size={12} />}
                      </button>
                      {copiedHash === selectedEvidence.hash && (
                        <span className="absolute right-36 top-1/2 -translate-y-1/2 bg-emerald-500 text-white font-sans font-bold text-[9px] px-6 py-2 rounded-sm shadow-md uppercase animate-pulse">
                          Copied Seal!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Verify Integrity Control */}
                  <div className="flex flex-wrap items-center justify-between gap-12 bg-white dark:bg-slate-900/60 p-12 rounded-card border border-gray-100 dark:border-border-dark">
                    <div className="flex items-center gap-8 text-left">
                      <Shield size={16} className={selectedEvidence.status === 'VERIFIED' ? 'text-emerald-500 animate-pulse' : 'text-amber-500'} />
                      <div className="text-left">
                        <span className="block text-[10px] text-gray-400 font-bold">INTEGRITY STATE</span>
                        <span className={`text-body-xs font-mono font-bold ${selectedEvidence.status === 'VERIFIED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {selectedEvidence.status === 'VERIFIED' ? 'Veracity Validated on Ledger (Block #94820)' : 'Pending Notarized Checksum Seal'}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleVerifyIntegrity(selectedEvidence.id)}
                      disabled={selectedEvidence.status === 'VERIFIED' || verifyingId === selectedEvidence.id}
                      className={`!py-6 !px-12 text-xs font-bold transition-all ${
                        selectedEvidence.status === 'VERIFIED' 
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-default' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse'
                      }`}
                    >
                      {verifyingId === selectedEvidence.id ? (
                        <span className="flex items-center gap-4">
                          <Loader2 size={12} className="animate-spin" />
                          Securing Block...
                        </span>
                      ) : selectedEvidence.status === 'VERIFIED' ? (
                        <span className="flex items-center gap-4">
                          <CheckCircle2 size={12} />
                          Sealed & Validated
                        </span>
                      ) : (
                        <span className="flex items-center gap-4">
                          <ShieldCheck size={12} />
                          Verify Integrity on Ledger
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Subgrid: Attached Files & Dropzone */}
                <div className="grid gap-16 sm:grid-cols-2">
                  {/* List of attachments */}
                  <div className="border border-gray-100 dark:border-border-dark p-12 rounded-card text-left space-y-8 bg-white dark:bg-slate-900/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Locked Evidence Files</span>
                    <ul className="space-y-6 max-h-[130px] overflow-y-auto pr-4">
                      {selectedEvidence.documents.map((doc, idx) => (
                        <li key={idx} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/90 rounded border border-gray-100 dark:border-border-dark">
                          <div className="flex items-center gap-6 font-mono text-[10px] text-gray-600 dark:text-gray-300 truncate max-w-[170px] text-left">
                            <FileText size={12} className="text-indigo-500 shrink-0" />
                            <span className="truncate">{doc}</span>
                          </div>
                          <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-200/50 px-4 py-2 rounded-sm font-bold uppercase font-sans shrink-0">
                            Sealed
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Dropzone with uploading progress bars */}
                  <div className="border border-dashed border-gray-300 dark:border-slate-800 p-12 rounded-card bg-slate-50/50 dark:bg-[#1E1B4B]/5 hover:bg-slate-50 dark:hover:bg-[#1E1B4B]/10 transition-colors flex flex-col justify-center items-center text-center relative overflow-hidden group">
                    {uploadingId === selectedEvidence.id ? (
                      <div className="space-y-8 w-full px-12">
                        <Loader2 size={20} className="animate-spin text-indigo-500 mx-auto" />
                        <div className="w-full bg-gray-200 dark:bg-slate-800 h-6 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-200" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Uploading ({uploadProgress}%)
                        </span>
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-8 space-y-6 select-none">
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.png,.jpg,.jpeg,.xlsx" 
                          onChange={(e) => handleFileUpload(e, selectedEvidence.id)} 
                        />
                        <UploadCloud size={20} className="text-gray-400 group-hover:text-indigo-500 transition-colors animate-bounce" />
                        <div className="space-y-2">
                          <span className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 font-sans">Drop new file to sign</span>
                          <span className="block text-[9px] text-gray-400 font-semibold font-sans">PDF, Invoice Scan (Max 10MB)</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Simulated Portal Notification Gateway */}
                <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-slate-900/60 dark:to-slate-900/40 p-16 rounded-card border border-indigo-100/50 dark:border-indigo-950/20 text-left space-y-12">
                  <div className="flex items-center justify-between gap-12 flex-wrap">
                    <div className="space-y-2 text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Corporate vendor portal Gateway</span>
                      <p className="text-body-xs text-gray-600 dark:text-gray-400 font-medium font-sans">
                        Push compiled email mismatch notifications directly to {selectedEvidence.vendor}'s secure portal interface.
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => handleNotifyPortal(selectedEvidence.id)}
                      className="bg-slate-900 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 hover:bg-slate-800 text-xs font-bold !py-8 !px-16 flex items-center gap-6"
                    >
                      <Mail size={12} className="animate-pulse" />
                      Notify Vendor Portal
                    </Button>
                  </div>
                </div>

                {/* Portal Broadcast Simulation Drawer / Modal Overlay */}
                <AnimatePresence>
                  {notifyingId === selectedEvidence.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="absolute inset-0 bg-slate-950/95 text-white z-50 p-24 rounded-card flex flex-col justify-between"
                    >
                      <div className="space-y-12 flex-1 overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-12">
                          <div className="flex items-center gap-8">
                            <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center animate-pulse">
                              <AlertTriangle size={14} />
                            </div>
                            <span className="font-bold text-body-sm font-sans tracking-wide">Portal compliance Broadcast Dispatch</span>
                          </div>
                          <button 
                            onClick={() => setNotifyingId(null)}
                            className="p-4 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {notificationSuccess ? (
                          <div className="flex flex-col items-center justify-center space-y-16 py-40 text-center animate-pulse">
                            <div className="h-48 w-48 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                              <CheckCircle2 size={24} className="animate-bounce" />
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-body font-bold text-emerald-400 font-sans">Broadcast Transmitted!</h4>
                              <p className="text-body-xs text-slate-300 max-w-sm font-sans">
                                Vendor compliance endpoint acknowledged packet. ACK ID: <code className="font-mono text-indigo-400 text-body-xs bg-slate-900 px-6 py-2 rounded">ACK-{selectedEvidence.vendor.slice(0,3).toUpperCase()}-99841</code>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            <div className="space-y-4 text-left">
                              <span className="text-[10px] text-slate-400 font-bold block font-sans">TARGET PORTAL ENDPOINT</span>
                              <code className="block bg-slate-900 p-6 rounded text-body-xs font-mono text-teal-400 border border-slate-800 text-left">
                                POST https://compliance-gateway.{selectedEvidence.vendor.toLowerCase().replace(/\s/g, "")}.com/api/v1/gstin/mismatch-notify
                              </code>
                            </div>

                            <div className="space-y-4 text-left">
                              <span className="text-[10px] text-slate-400 font-bold block font-sans">DISPATCH DATA PAYLOAD</span>
                              <div className="bg-slate-900/90 border border-slate-800/85 p-12 rounded font-mono text-[11px] text-slate-200 max-h-[140px] overflow-y-auto whitespace-pre-line text-left leading-relaxed">
                                {`Dear ${selectedEvidence.vendor},

                                This is a formal GST discrepancy notification regarding invoice ${selectedEvidence.id} for the period ${selectedEvidence.period}. 
                                
                                Our compliance record lists the transaction at ${formatCurrency(selectedEvidence.amount)}, whereas the government GSTR-2B data indicates ₹0. This creates an unfiled invoice mismatch affecting Input Tax Credit (ITC) compliance under the CGST Act.
                                
                                Please immediately file or rectify this invoice in your GSTR-1 return to align the records.
                                
                                Regards,
                                GST Compliance Team`}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {!notificationSuccess && (
                        <div className="flex justify-end gap-12 border-t border-slate-800 pt-16 shrink-0 font-sans">
                          <Button
                            variant="ghost"
                            onClick={() => setNotifyingId(null)}
                            className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs !py-8 !px-16"
                          >
                            Cancel Dispatch
                          </Button>
                          <Button
                            onClick={handleConfirmNotify}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs !py-8 !px-16 flex items-center gap-6"
                          >
                            Transmit Broadcast
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-60 text-center text-gray-400">
                <Shield className="h-40 w-40 mb-12 text-gray-300 animate-pulse" />
                <span className="font-bold text-body-sm font-sans">No Active Evidence Selected</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
