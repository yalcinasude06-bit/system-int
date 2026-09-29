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

export function NodeGraphCanvas({ edges, selected, onNodeClick, simulating }: { edges: GraphEdge[]; selected: string | null; onNodeClick: (id: string) => void; simulating?: boolean }) {
  const byId = new Map(graphNodes.map((node) => [node.id, node]));
  return <div className="graph-canvas"><svg className="graph-svg" viewBox="0 0 760 430" role="img" aria-label="Nedensel ilişki ağı">
    <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="25" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="context-stroke" /></marker></defs>
    {edges.map((edge) => { const from = byId.get(edge.from)!; const to = byId.get(edge.to)!; return <g key={edge.id}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`graph-edge ${edge.polarity === "-" ? "negative" : ""} ${simulating ? "simulating" : ""}`} /><text x={(from.x+to.x)/2} y={(from.y+to.y)/2-8} fill={edge.polarity === "+" ? "#6ee7d7" : "#fb7185"} fontWeight="900">{edge.polarity}</text></g>; })}
    {graphNodes.map((node) => <g key={node.id} className={`graph-node ${selected === node.id ? "selected" : ""}`} onClick={() => onNodeClick(node.id)} role="button" tabIndex={0}><circle cx={node.x} cy={node.y} r="49" /><text x={node.x} y={node.y+4} textAnchor="middle">{node.label}</text></g>)}
  </svg></div>;
}
