"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/common/Button";
import type { Submission } from "@/types";

const anatomy = {
  purpose: { hint: "Sistemin varlık nedeni", answer: "Amaç" },
  components: { hint: "Sistemi oluşturan parçalar", answer: "Bileşenler" },
  relations: { hint: "Parçaların etkileşimi", answer: "İlişkiler" },
  boundary: { hint: "Sınır", answer: "Sınır" },
  environment: { hint: "Çevre", answer: "Çevre" },
  interface: { hint: "Sınırdaki geçiş noktası", answer: "Arayüz" },
  input: { hint: "Sisteme giren akış", answer: "Girdi" },
  output: { hint: "Sistemden çıkan akış", answer: "Çıktı" },
  constraint: { hint: "Hareket alanını daraltan kural", answer: "Kısıtlar" },
} as const;

type ZoneId = keyof typeof anatomy;
const cardOrder: ZoneId[] = ["components", "relations", "boundary", "purpose", "environment", "interface", "input", "output", "constraint"];
const cards = cardOrder.map((id) => anatomy[id].answer);
const legacyNames: Record<string, string> = { "Ara yüzler": "Arayüz", Kısıt: "Kısıtlar" };
const slotNumbers: Record<ZoneId, number> = { constraint: 1, components: 2, relations: 3, boundary: 4, purpose: 5, environment: 6, interface: 7, input: 8, output: 9 };

function savedPlacements(submission?: Submission | null) {
  const value = submission?.payload?.placements;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([zone, card]) => [zone, typeof card === "string" ? legacyNames[card] || card : card]).filter(([zone, card]) => zone in anatomy && typeof card === "string" && cards.includes(card as (typeof cards)[number]))) as Record<string, string>;
}

function AnatomySlot({ id, placements, selected, locked, dragOver, onPlace, onSelect, onDragOver }: {
  id: ZoneId;
  placements: Record<string, string>;
  selected: string | null;
  locked: boolean;
  dragOver: string | null;
  onPlace: (zoneId: ZoneId, card: string, sourceZone?: ZoneId) => void;
  onSelect: (card: string) => void;
  onDragOver: (zoneId: ZoneId | null) => void;
}) {
  const zone = anatomy[id];
  const value = placements[id];
  const correct = locked && value === zone.answer;
  const wrong = locked && value !== zone.answer;

  return <div
    className={`scene-slot slot-${id} ${value ? "filled" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""} ${dragOver === id ? "drag-over" : ""} ${locked ? "locked" : ""}`}
    onDragEnter={(event) => { if (!locked) { event.preventDefault(); onDragOver(id); } }}
    onDragOver={(event) => { if (!locked) event.preventDefault(); }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) onDragOver(null); }}
    onDrop={(event) => {
      event.preventDefault();
      onDragOver(null);
      if (!locked) onPlace(id, event.dataTransfer.getData("text/plain"), event.dataTransfer.getData("application/x-system-zone") as ZoneId || undefined);
    }}
    onClick={() => { if (!locked && selected) onPlace(id, selected); }}
    role="group"
    aria-label={`${zone.hint}: ${value || "boş"}`}
  >
    <span className="slot-number" aria-hidden="true">{slotNumbers[id]}</span>
    {value && <button
      type="button"
      draggable={!locked}
      className={`placed-anatomy-card ${selected === value ? "selected" : ""}`}
      onClick={(event) => { event.stopPropagation(); if (!locked) onSelect(value); }}
      onDragStart={(event) => { event.dataTransfer.setData("text/plain", value); event.dataTransfer.setData("application/x-system-zone", id); }}
    >{value}</button>}
    {correct && <CheckCircle2 className="slot-check" size={18} aria-label="Doğru" />}
    {wrong && <XCircle className="slot-check wrong-check" size={18} aria-label="Yanlış" />}
  </div>;
}

function Gear({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const teeth = Array.from({ length: 8 }, (_, index) => index * 45);
  return <g transform={`translate(${x} ${y})`}>
    {teeth.map((angle) => <rect key={angle} x={-size * .12} y={-size * .64} width={size * .24} height={size * .3} rx="4" fill={color} transform={`rotate(${angle})`} />)}
    <circle r={size * .48} fill={color} />
    <circle r={size * .2} fill="#f8fafc" stroke="rgba(15,23,42,.13)" strokeWidth="4" />
  </g>;
}

function SystemSceneArt() {
  return <svg className="scene-art" viewBox="0 0 1400 790" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Çevre, sistem sınırı, bileşenler, ilişkiler, girdi, çıktı, arayüz ve kısıtları gösteren sistem anatomisi">
    <defs>
      <linearGradient id="env-sky" x1="0" x2="1"><stop stopColor="#d9f3ee" /><stop offset="1" stopColor="#dceffc" /></linearGradient>
      <linearGradient id="system-core" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#dbeafe" /><stop offset="1" stopColor="#eff6ff" /></linearGradient>
      <linearGradient id="input-arrow" x1="0" x2="1"><stop stopColor="#a7f3d0" /><stop offset="1" stopColor="#65a30d" /></linearGradient>
      <linearGradient id="output-arrow" x1="0" x2="1"><stop stopColor="#60a5fa" /><stop offset="1" stopColor="#0284c7" /></linearGradient>
      <filter id="soft-shadow"><feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#64748b" floodOpacity=".18" /></filter>
    </defs>

    <rect width="1400" height="790" rx="30" fill="#ffffff" />
    <path d="M35 175 C70 58 196 75 286 76 C390 77 428 52 530 71 C645 92 719 48 830 67 C940 86 972 62 1070 72 C1174 82 1230 45 1335 94 C1391 120 1390 236 1324 263 C1220 305 1141 238 1052 231 C930 222 856 172 749 182 C637 192 548 169 459 205 C367 243 306 284 190 265 C80 247 14 240 35 175Z" fill="url(#env-sky)" />

    <g opacity=".82">
      <rect x="92" y="154" width="13" height="75" rx="6" fill="#477c63" /><circle cx="98" cy="139" r="40" fill="#75b690" /><circle cx="71" cy="172" r="29" fill="#85c49c" />
      <rect x="155" y="125" width="14" height="103" rx="6" fill="#477c63" /><circle cx="162" cy="112" r="43" fill="#68aa83" /><circle cx="194" cy="171" r="34" fill="#7cba91" />
      <rect x="236" y="142" width="13" height="88" rx="6" fill="#477c63" /><circle cx="242" cy="126" r="45" fill="#6dad86" /><circle cx="278" cy="184" r="31" fill="#82bd92" />
      <path d="M45 233 Q150 199 309 226 L330 254 L47 254Z" fill="#72aa7f" />
      <path d="M365 120 q34 0 14 19 q42 0 15 20 M350 143 q43 0 23 20" fill="none" stroke="#377ba1" strokeWidth="9" strokeLinecap="round" />
      <g fill="#7ea1b8"><rect x="1020" y="137" width="42" height="92" /><rect x="1067" y="101" width="47" height="129" /><rect x="1122" y="160" width="39" height="70" /></g>
      <g fill="#c3dce5"><rect x="1032" y="154" width="8" height="11" /><rect x="1047" y="154" width="8" height="11" /><rect x="1080" y="120" width="8" height="11" /><rect x="1097" y="120" width="8" height="11" /><rect x="1080" y="143" width="8" height="11" /><rect x="1097" y="143" width="8" height="11" /></g>
      <path d="M995 231 Q1080 198 1178 239 L1190 257 L985 257Z" fill="#78ae82" />
      <g fill="#557b91"><circle cx="1215" cy="179" r="16" /><path d="M1197 229 q2-39 18-39 q18 0 20 39Z" /><circle cx="1260" cy="172" r="18" /><path d="M1239 229 q2-43 21-43 q20 0 22 43Z" /><circle cx="1306" cy="160" r="20" /><path d="M1283 229 q2-48 23-48 q22 0 25 48Z" /></g>
      <g transform="translate(1280 90)" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round"><circle r="22" fill="#fbbf24" stroke="none" /><path d="M0-41v-13 M0 41v13 M-41 0h-13 M41 0h13 M-29-29l-9-9 M29 29l9 9 M29-29l9-9 M-29 29l-9 9" /></g>
    </g>

    <g filter="url(#soft-shadow)"><circle cx="635" cy="267" r="48" fill="#ef4444" /><circle cx="635" cy="267" r="34" fill="#fff" /><circle cx="635" cy="267" r="22" fill="#ef4444" /><circle cx="635" cy="267" r="9" fill="#fff" /><path d="M635 267 L682 218" stroke="#334155" strokeWidth="10" strokeLinecap="round" /><path d="M681 218 l-2 23 l20-21Z" fill="#334155" /></g>
    <path d="M635 320 v34" stroke="#ef4444" strokeWidth="7" strokeLinecap="round" /><path d="M624 347 l11 18 l11-18Z" fill="#ef4444" />

    <rect x="310" y="354" width="770" height="324" rx="25" fill="#fffbeb" fillOpacity=".42" stroke="#f5b700" strokeWidth="5" strokeDasharray="14 10" />
    <rect x="402" y="401" width="586" height="224" rx="28" fill="url(#system-core)" stroke="#60a5fa" strokeWidth="4" />
    <rect x="427" y="465" width="190" height="126" rx="20" fill="#dbeafe" stroke="#3b82f6" strokeWidth="4" />
    <rect x="776" y="465" width="190" height="126" rx="20" fill="#dcfce7" stroke="#65a30d" strokeWidth="4" />
    <Gear x={526} y={518} size={54} color="#3b82f6" /><Gear x={474} y={558} size={35} color="#f59e0b" />
    <Gear x={868} y={519} size={54} color="#65a30d" /><Gear x={920} y={558} size={35} color="#f59e0b" />
    <path d="M625 503 H759" stroke="#475569" strokeWidth="5" /><path d="M625 503 l17-10 v20Z M759 503 l-17-10 v20Z" fill="#475569" />
    <path d="M625 568 H759" stroke="#475569" strokeWidth="5" /><path d="M625 568 l17-10 v20Z M759 568 l-17-10 v20Z" fill="#475569" />
    <path d="M520 450 v-23 h350 v23" fill="none" stroke="#2563eb" strokeWidth="4" /><path d="M512 443 l8 13 l8-13Z M862 443 l8 13 l8-13Z" fill="#2563eb" />

    <g filter="url(#soft-shadow)"><rect x="286" y="476" width="34" height="116" rx="12" fill="#7dd3fc" stroke="#0369a1" strokeWidth="5" /><rect x="297" y="488" width="10" height="92" rx="5" fill="#dbeafe" /></g>
    <g filter="url(#soft-shadow)"><rect x="1070" y="476" width="34" height="116" rx="12" fill="#7dd3fc" stroke="#0369a1" strokeWidth="5" /><rect x="1081" y="488" width="10" height="92" rx="5" fill="#dbeafe" /></g>

    <g filter="url(#soft-shadow)"><path d="M172 515 H274 v-22 l42 40 l-42 40 v-22 H172Z" fill="url(#input-arrow)" /><g fill="#d99a58" stroke="#b56e2e" strokeWidth="2"><path d="M55 554 l48-20 l48 20 v50 l-48 20 l-48-20Z" /><path d="M118 583 l48-20 l48 20 v50 l-48 20 l-48-20Z" /><path d="M45 612 l48-20 l48 20 v50 l-48 20 l-48-20Z" /></g></g>
    <g filter="url(#soft-shadow)"><path d="M1105 515 H1208 v-22 l42 40 l-42 40 v-22 h-103Z" fill="url(#output-arrow)" /><path d="M1245 579 l61-26 l61 26 l-61 25Z" fill="#c9782b" /><path d="M1245 579 v64 l61 26 v-65Z" fill="#b96a24" /><path d="M1367 579 v64 l-61 26 v-65Z" fill="#d98b39" /><path d="M1306 553 v-35 M1280 535 l-14-18 M1332 535 l14-18" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" /></g>

    <g filter="url(#soft-shadow)"><path d="M395 708 h165" stroke="#ef6b55" strokeWidth="18" /><path d="M410 690 v54 M545 690 v54" stroke="#d6c4ab" strokeWidth="12" /><path d="M395 708 l26-18 M438 717 l30-25 M486 717 l30-25 M532 716 l28-23" stroke="#fff" strokeWidth="8" /><path d="M475 660 l-36 66 h72Z" fill="#fff" stroke="#ef4444" strokeWidth="9" /><path d="M475 682 v22" stroke="#334155" strokeWidth="8" strokeLinecap="round" /><circle cx="475" cy="714" r="4" fill="#334155" /></g>
    <g opacity=".78"><path d="M835 708 h165" stroke="#ef6b55" strokeWidth="18" /><path d="M850 690 v54 M985 690 v54" stroke="#d6c4ab" strokeWidth="12" /><path d="M835 708 l26-18 M878 717 l30-25 M926 717 l30-25 M972 716 l28-23" stroke="#fff" strokeWidth="8" /></g>
    <path d="M635 690 v-34 M750 690 v-34 M865 690 v-34" stroke="#ef4444" strokeWidth="5" strokeDasharray="9 7" /><path d="M626 666 l9-16 l9 16Z M741 666 l9-16 l9 16Z M856 666 l9-16 l9 16Z" fill="#ef4444" />
  </svg>;
}

export function ConceptualStage({ onComplete, initialSubmission }: {
  onComplete: (result: { score: number; placements: Record<string, string>; mistakes: string[] }) => Promise<boolean>;
  initialSubmission?: Submission | null;
}) {
  const initial = savedPlacements(initialSubmission);
  const [placements, setPlacements] = useState<Record<string, string>>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(Boolean(initialSubmission?.is_submitted));
  const [score, setScore] = useState(initialSubmission?.score ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const available = useMemo(() => cards.filter((card) => !Object.values(placements).includes(card)), [placements]);

  function place(zoneId: ZoneId, card: string, suppliedSource?: ZoneId) {
    if (locked || !cards.some((candidate) => candidate === card)) return;
    setPlacements((current) => {
      const next = { ...current };
      const foundSource = (Object.keys(next) as ZoneId[]).find((key) => next[key] === card);
      const source = suppliedSource && next[suppliedSource] === card ? suppliedSource : foundSource;
      const displaced = next[zoneId];
      if (source && source !== zoneId) {
        delete next[source];
        if (displaced) next[source] = displaced;
      }
      next[zoneId] = card;
      return next;
    });
    setSelected(null);
  }

  function returnToPool(card: string) {
    if (locked) return;
    setPlacements((current) => Object.fromEntries(Object.entries(current).filter(([, value]) => value !== card)));
    setSelected(null);
  }

  async function submit() {
    if (locked || Object.keys(placements).length !== cards.length) return;
    const entries = Object.entries(anatomy) as Array<[ZoneId, (typeof anatomy)[ZoneId]]>;
    const mistakes = entries.filter(([id, item]) => placements[id] !== item.answer).map(([, item]) => item.answer);
    const resultScore = Math.round(((entries.length - mistakes.length) / entries.length) * 100);
    setSubmitting(true);
    const saved = await onComplete({ score: resultScore, placements, mistakes });
    setSubmitting(false);
    if (saved) { setScore(resultScore); setLocked(true); setSelected(null); }
  }

  const allCorrect = locked && score === 100;
  const slotProps = { placements, selected, locked, dragOver, onPlace: place, onSelect: setSelected, onDragOver: (zone: ZoneId | null) => setDragOver(zone) };

  return <div className="module-shell">
    <div
      className={`card-tray anatomy-card-tray ${available.length ? "" : "is-empty"} ${dragOver === "pool" ? "drag-over" : ""}`}
      aria-label="Bekleyen kavram kartları"
      onDragEnter={(event) => { if (!locked) { event.preventDefault(); setDragOver("pool"); } }}
      onDragOver={(event) => { if (!locked) event.preventDefault(); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(null); }}
      onDrop={(event) => { event.preventDefault(); setDragOver(null); returnToPool(event.dataTransfer.getData("text/plain")); }}
      onClick={() => { if (selected) returnToPool(selected); }}
    >
      {available.map((card) => <button draggable={!locked} key={card} type="button" className={`drag-card ${selected === card ? "selected" : ""}`} onDragStart={(event) => event.dataTransfer.setData("text/plain", card)} onClick={(event) => { event.stopPropagation(); if (!locked) setSelected(card); }}>{card}</button>)}
      {!available.length && !locked && <span className="anatomy-tray-empty">Tüm kartlar şemada · Geri almak için buraya bırak.</span>}
      {locked && <span className="locked-badge"><LockKeyhole size={14} /> Gönderildi · puan gizli</span>}
    </div>

    <div className="system-scene-scroll"><div className="system-scene"><SystemSceneArt /><AnatomySlot id="constraint" {...slotProps} /><AnatomySlot id="components" {...slotProps} /><AnatomySlot id="relations" {...slotProps} /><AnatomySlot id="boundary" {...slotProps} /><AnatomySlot id="purpose" {...slotProps} /><AnatomySlot id="environment" {...slotProps} /><AnatomySlot id="interface" {...slotProps} /><AnatomySlot id="input" {...slotProps} /><AnatomySlot id="output" {...slotProps} /></div></div>

    {locked && <div className={allCorrect ? "notice success" : "notice error"}>{allCorrect ? "Tebrikler! Sistem anatomisinin tamamını doğru kurdun. Puanın sonuçlar açıklanana kadar gizli." : "Yanıtın kilitlendi. Doğru ve yanlış yerleşimler işaretlendi; puanın sonuçlar açıklanana kadar gizli."}</div>}
    <div className="button-row module-actions"><Button loading={submitting} onClick={() => void submit()} disabled={locked || Object.keys(placements).length !== cards.length}>{locked ? "Yanıt gönderildi" : "Kontrol Et"}</Button><Button variant="secondary" icon={<RotateCcw size={16} />} disabled={locked || submitting} onClick={() => { setPlacements({}); setSelected(null); }}>Sıfırla</Button></div>
  </div>;
}
