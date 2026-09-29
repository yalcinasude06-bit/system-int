import type { MapElement } from "@/types";

export function EnvironmentClassifier({ elements, insideIds }: { elements: MapElement[]; insideIds: Set<string> }) {
  return <div className="grid-3">
    {[{ title: "Sistem içi", filter: (item: MapElement) => insideIds.has(item.id), color: "var(--teal)" }, { title: "Etkilenebilir çevre", filter: (item: MapElement) => !insideIds.has(item.id) && item.type === "direct_env", color: "var(--blue)" }, { title: "Kontrol dışı çevre", filter: (item: MapElement) => !insideIds.has(item.id) && item.type === "indirect_env", color: "var(--violet)" }].map((group) => <div className="card" key={group.title}><h3 style={{ color: group.color }}>{group.title}</h3><div className="card-tray" style={{ marginTop: 12 }}>{elements.filter(group.filter).map((item) => <span className="drag-card" key={item.id}>{item.icon} {item.name}</span>)}</div></div>)}
  </div>;
}
