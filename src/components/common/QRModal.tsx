"use client";

import { QRCodeSVG } from "qrcode.react";
import { Copy, X } from "lucide-react";
import { Button } from "./Button";

export function QRModal({ open, onClose, url, pin }: { open: boolean; onClose: () => void; url: string; pin: string }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Katılım QR kodu">
      <div className="modal">
        <div className="section-head">
          <div><h2>Derse katıl</h2><p>QR kodu okut veya PIN’i gir.</p></div>
          <Button variant="secondary" size="small" onClick={onClose} aria-label="Kapat" icon={<X size={16} />} />
        </div>
        <div className="qr-wrap"><QRCodeSVG value={url} size={220} level="M" /></div>
        <div className="pin" style={{ textAlign: "center" }}>{pin}</div>
        <Button
          variant="secondary"
          style={{ width: "100%", marginTop: 18 }}
          icon={<Copy size={17} />}
          onClick={() => navigator.clipboard.writeText(url)}
        >
          Katılım bağlantısını kopyala
        </Button>
      </div>
    </div>
  );
}
