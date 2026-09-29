const cards = [
  { id: "customer-order", label: "Müşteri Siparişi", icon: "🛒" },
  { id: "product-design", label: "Ürün Tasarımı", icon: "📐" },
  { id: "purchased-parts", label: "Satın Alınan Parçalar", icon: "⚙️" },
  { id: "finished-product", label: "Bitmiş Ürün", icon: "📦" },
  { id: "service-request", label: "Servis Talebi", icon: "🛠️" },
];

export function FlowCardSelector({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return <div className="card"><h3>Bilgi / malzeme akış kartları</h3><p className="muted">Akışta kullanılacak kartları etkinleştir. Eksik kart token’ı ilgili blokta durdurur.</p><div className="flow-card-grid">{cards.map((item) => <button type="button" key={item.id} onClick={() => onToggle(item.id)} className={`flow-card ${selected.includes(item.id) ? "active" : ""}`}><span>{item.icon}</span><strong>{item.label}</strong><small>{selected.includes(item.id) ? "Akışta" : "Akışa ekle"}</small></button>)}</div></div>;
}
