import type { MapElement } from "@/types";

export function EnvironmentClassifier({ elements, insideIds }: { elements: MapElement[]; insideIds: Set<string> }) {
  const groups = [
    { title: "Sistem İçi", description: "Doğrudan yönetilebilen", filter: (item: MapElement) => insideIds.has(item.id), color: "var(--emerald)" },
    { title: "Yakın İş Çevresi", description: "Etkilenebilir çevre", filter: (item: MapElement) => !insideIds.has(item.id) && item.type === "direct_env", color: "var(--indigo-soft)" },
    { title: "Uzak Genel Çevre", description: "Kontrol dışı çevre", filter: (item: MapElement) => !insideIds.has(item.id) && item.type === "indirect_env", color: "var(--violet)" },
  ];
  return <div className="classifier-stack">
    {groups.map((group) => { const items = elements.filter(group.filter); return <div className="classifier-group" key={group.title}><div><h4 style={{ color: group.color }}>{group.title}</h4><small>{group.description}</small></div><div className="classifier-items">{items.length ? items.map((item) => <span key={item.id}>{item.icon} {item.name}</span>) : <em>Öğe yok</em>}</div></div>; })}
  </div>;
}
