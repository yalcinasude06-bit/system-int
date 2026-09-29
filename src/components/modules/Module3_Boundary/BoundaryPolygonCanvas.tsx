"use client";

import type { MapElement, Point } from "@/types";

export const mapElements: MapElement[] = [
  { id: "employees", name: "Çalışanlar", type: "internal", position: { x: 220, y: 130 }, icon: "👥" },
  { id: "production", name: "Üretim Hattı", type: "internal", position: { x: 390, y: 205 }, icon: "🏭" },
  { id: "robots", name: "Robotik", type: "internal", position: { x: 230, y: 300 }, icon: "🤖" },
  { id: "sales-marketing", name: "Satış / Pazarlama", type: "internal", position: { x: 445, y: 325 }, icon: "📣" },
  { id: "suppliers", name: "Tedarikçiler", type: "direct_env", position: { x: 590, y: 100 }, icon: "🚚" },
  { id: "customers", name: "Müşteriler", type: "direct_env", position: { x: 650, y: 260 }, icon: "🛒" },
  { id: "competitors", name: "Rakipler", type: "direct_env", position: { x: 560, y: 365 }, icon: "🏁" },
  { id: "interest", name: "Faiz", type: "indirect_env", position: { x: 100, y: 390 }, icon: "📈" },
  { id: "law", name: "Mevzuat", type: "indirect_env", position: { x: 710, y: 395 }, icon: "⚖️" },
  { id: "weather", name: "Hava", type: "indirect_env", position: { x: 80, y: 70 }, icon: "🌦️" },
  { id: "tech", name: "Teknoloji", type: "indirect_env", position: { x: 400, y: 55 }, icon: "💡" },
];

export function BoundaryPolygonCanvas({ points, onChange, insideIds }: { points: Point[]; onChange: (points: Point[]) => void; insideIds: Set<string> }) {
  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 800;
    const y = ((event.clientY - bounds.top) / bounds.height) * 430;
    onChange([...points, { x: Math.round(x), y: Math.round(y) }]);
  }
  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");
  return <div className="boundary-canvas"><svg className="boundary-svg" viewBox="0 0 800 430" onClick={handleClick} role="img" aria-label="Sistem sınırı çizim alanı">
    <defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="1" /></pattern></defs><rect width="800" height="430" fill="url(#grid)" />
    {points.length >= 2 && <polyline points={polygon} className="polygon-line" />}
    {points.map((point, index) => <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r="6" className="polygon-point" />)}
    {mapElements.map((item) => <g key={item.id} className={`map-node ${insideIds.has(item.id) ? "inside" : ""}`}><circle cx={item.position.x} cy={item.position.y} r="36" /><text x={item.position.x} y={item.position.y-3} fontSize="18">{item.icon}</text><text x={item.position.x} y={item.position.y+17}>{item.name}</text></g>)}
  </svg></div>;
}
