"use client";

export interface GraphNode { id: string; label: string; x: number; y: number }
export interface GraphEdge { id: string; from: string; to: string; type: string; polarity: "+" | "-" }

export const graphNodes: GraphNode[] = [
  { id: "demand", label: "Talep", x: 110, y: 110 },
  { id: "price", label: "Fiyat", x: 375, y: 70 },
  { id: "sales", label: "Satış", x: 520, y: 220 },
  { id: "revenue", label: "Gelir", x: 650, y: 355 },
  { id: "orders", label: "Sipariş Miktarı", x: 240, y: 250 },
  { id: "marketing", label: "Pazarlama", x: 90, y: 365 },
];

export function NodeGraphCanvas({ edges, selected, onNodeClick, simulating, warningNodeIds = [] }: { edges: GraphEdge[]; selected: string | null; onNodeClick: (id: string) => void; simulating?: boolean; warningNodeIds?: string[] }) {
  const byId = new Map(graphNodes.map((node) => [node.id, node]));
  return <div className="graph-canvas"><svg className="graph-svg" viewBox="0 0 760 430" role="img" aria-label="Nedensel ilişki ağı">
    <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="25" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="context-stroke" /></marker></defs>
    {edges.map((edge, index) => { const from = byId.get(edge.from)!; const to = byId.get(edge.to)!; const path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`; return <g key={edge.id}>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`graph-edge ${edge.polarity === "-" ? "negative" : ""} ${simulating ? "simulating" : ""}`} />
      <g className={`polarity-badge ${edge.polarity === "-" ? "negative" : "positive"}`}><circle cx={(from.x+to.x)/2} cy={(from.y+to.y)/2-8} r="12" /><text x={(from.x+to.x)/2} y={(from.y+to.y)/2-4} textAnchor="middle">{edge.polarity}</text></g>
      {simulating && <circle r="6" className="shock-particle"><animateMotion dur="1.35s" begin={`${index * .16}s`} repeatCount="indefinite" path={path} /></circle>}
    </g>; })}
    {graphNodes.map((node) => <g key={node.id} className={`graph-node ${selected === node.id ? "selected" : ""} ${warningNodeIds.includes(node.id) ? "warning" : ""}`} onClick={() => onNodeClick(node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onNodeClick(node.id); }} role="button" tabIndex={0}><circle cx={node.x} cy={node.y} r="49" /><text x={node.x} y={node.y+4} textAnchor="middle">{node.label}</text>{warningNodeIds.includes(node.id) && <text className="warning-mark" x={node.x+34} y={node.y-32}>!</text>}</g>)}
  </svg></div>;
}
