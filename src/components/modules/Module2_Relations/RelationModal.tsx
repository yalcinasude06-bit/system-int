"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/common/Button";

const types = ["Nedensel", "Zamansal", "Mantıksal", "Matematiksel", "Mekânsal"];

export function RelationModal({ from, to, onSave, onClose }: { from: string; to: string; onSave: (type: string, polarity: "+" | "-") => void; onClose: () => void }) {
  const [type, setType] = useState(types[0]); const [polarity, setPolarity] = useState<"+" | "-">("+");
  return <div className="modal-backdrop"><div className="modal"><div className="section-head"><div><h2>İlişkiyi tanımla</h2><p>{from} → {to}</p></div><Button size="small" variant="secondary" icon={<X size={16} />} onClick={onClose} /></div>
    <div className="form-grid"><div className="field"><label>İlişki türü</label><select className="select" value={type} onChange={(e) => setType(e.target.value)}>{types.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="field"><label>Etki yönü</label><div className="grid-2"><Button type="button" variant={polarity === "+" ? "primary" : "secondary"} onClick={() => setPolarity("+")}>+ Artırıcı</Button><Button type="button" variant={polarity === "-" ? "danger" : "secondary"} onClick={() => setPolarity("-")}>− Azaltıcı</Button></div></div>
      <Button onClick={() => onSave(type, polarity)}>Bağlantıyı ekle</Button>
    </div></div></div>;
}
