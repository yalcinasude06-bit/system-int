const interfaces = [
  { id: "supplier-company", label: "Tedarikçi–Firma Arayüzü" },
  { id: "sales-production", label: "Satış–Üretim Arayüzü" },
  { id: "company-customer", label: "Firma–Müşteri Arayüzü" },
];

export function InterfaceSelector({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return <div className="card"><h3>Arayüz noktaları</h3><p className="muted">Akışın geçebilmesi için gerekli arayüzleri etkinleştir.</p><div className="interface-chips">{interfaces.map((item) => <button type="button" key={item.id} onClick={() => onToggle(item.id)} className={`interface-chip ${selected.includes(item.id) ? "active" : ""}`}>{selected.includes(item.id) ? "✓ " : "+ "}{item.label}</button>)}</div></div>;
}
