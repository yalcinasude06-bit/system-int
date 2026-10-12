type BossPortraitProps = {
  variant: number;
  className?: string;
};

const profiles = [
  { skin: "#8d5524", hair: "#24160f", jacket: "#153f35", shirt: "#f8fafc", accent: "#d4a62a", hairStyle: 0, accessory: "tie" },
  { skin: "#f1c7a5", hair: "#8b5a3c", jacket: "#315c4d", shirt: "#e8f3ee", accent: "#e0b22f", hairStyle: 1, accessory: "helmet" },
  { skin: "#d59b72", hair: "#2f2421", jacket: "#214c63", shirt: "#f4f1ea", accent: "#d4a62a", hairStyle: 2, accessory: "headset" },
  { skin: "#70452f", hair: "#d9d6cf", jacket: "#283c35", shirt: "#f8fafc", accent: "#b98b16", hairStyle: 3, accessory: "tie" },
  { skin: "#edb98f", hair: "#171717", jacket: "#496b5d", shirt: "#fff7dc", accent: "#c39218", hairStyle: 4, accessory: "glasses" },
  { skin: "#9b6648", hair: "#33251d", jacket: "#2f6b58", shirt: "#edf7f2", accent: "#d4a62a", hairStyle: 5, accessory: "scarf" },
  { skin: "#f0c4a5", hair: "#b8663c", jacket: "#244f43", shirt: "#f8fafc", accent: "#d9ad32", hairStyle: 6, accessory: "glasses" },
  { skin: "#5f3a29", hair: "#171717", jacket: "#3f5e52", shirt: "#ecf7f2", accent: "#d4a62a", hairStyle: 7, accessory: "badge" },
] as const;

function Hair({ style, color }: { style: number; color: string }) {
  if (style === 0) return <path d="M75 99c4-34 25-52 53-52 31 0 49 17 54 48-18-10-36-16-55-15-17 0-35 6-52 19Z" fill={color} />;
  if (style === 1) return <><path d="M74 100c-2-37 20-59 53-59 36 0 56 23 53 61-15-18-31-25-53-25-21 0-37 7-53 23Z" fill={color} /><circle cx="176" cy="94" r="17" fill={color} /></>;
  if (style === 2) return <path d="M72 103c2-44 24-63 56-63 25 0 44 12 53 36-13-7-22-9-31-7-11 2-20 12-34 11-16 0-28 8-44 23Z" fill={color} />;
  if (style === 3) return <path d="M76 98c5-36 23-52 50-52 20 0 39 8 49 28-10-4-18-5-27-3-11 2-20 10-34 9-14-1-25 7-38 18Z" fill={color} />;
  if (style === 4) return <><path d="M72 103c0-42 21-64 55-64 36 0 57 23 55 66-11-19-22-29-37-31-22-4-42 8-73 29Z" fill={color} /><path d="M75 89c-11 28-7 57 7 77l12-12-7-72Z" fill={color} /></>;
  if (style === 5) return <><path d="M69 105c0-42 22-66 58-66s58 24 58 66c-13-17-31-28-58-28s-44 11-58 28Z" fill={color} /><path d="M75 91c-16 33-11 68 4 86l19-16-9-78Z" fill={color} /><path d="M179 91c16 33 11 68-4 86l-19-16 9-78Z" fill={color} /></>;
  if (style === 6) return <path d="M73 104c2-40 21-62 54-62 30 0 50 18 55 52-15-8-27-9-39-4-17 6-35 0-49 6-7 3-14 6-21 8Z" fill={color} />;
  return <path d="M70 103c1-41 23-63 57-63 35 0 56 22 57 63-14-15-31-23-57-23s-43 8-57 23Z" fill={color} />;
}

export function BossPortrait({ variant, className }: BossPortraitProps) {
  const profile = profiles[Math.abs(variant) % profiles.length]!;
  const hasGlasses = profile.accessory === "glasses";

  return <svg className={className} viewBox="0 0 250 310" role="img" aria-label="" focusable="false">
    <circle cx="125" cy="132" r="112" fill="#edf5f0" />
    <circle cx="196" cy="48" r="22" fill="#dfb231" opacity=".22" />
    <path d="M40 310c3-72 32-112 85-112s82 40 85 112H40Z" fill={profile.jacket} />
    <path d="m91 207 34 32 34-32 17 103H74l17-103Z" fill={profile.shirt} />
    <path d="M108 179h34v42c-5 8-11 12-17 12s-12-4-17-12v-42Z" fill={profile.skin} />
    <ellipse cx="125" cy="126" rx="54" ry="66" fill={profile.skin} />
    <ellipse cx="72" cy="132" rx="9" ry="15" fill={profile.skin} />
    <ellipse cx="178" cy="132" rx="9" ry="15" fill={profile.skin} />
    <Hair style={profile.hairStyle} color={profile.hair} />
    <path d="M96 119c7-5 15-5 22 0M136 119c7-5 15-5 22 0" fill="none" stroke={profile.hair} strokeLinecap="round" strokeWidth="4" />
    <circle cx="106" cy="130" r="3.4" fill="#17241f" />
    <circle cx="147" cy="130" r="3.4" fill="#17241f" />
    <path d="M126 133c-2 8-4 13-1 16 3 2 7 2 10 0" fill="none" stroke="#6f3e2c" strokeLinecap="round" strokeWidth="2.5" opacity=".7" />
    <path d="M108 163c11 9 24 9 35 0" fill="none" stroke="#713f37" strokeLinecap="round" strokeWidth="3" />
    {hasGlasses && <g fill="none" stroke="#263832" strokeWidth="3"><rect x="91" y="119" width="29" height="23" rx="9" /><rect x="133" y="119" width="29" height="23" rx="9" /><path d="M120 127h13" /></g>}
    {profile.accessory === "helmet" && <g><path d="M69 94c3-36 26-57 57-57s54 21 57 57H69Z" fill="#e0b22f" /><path d="M62 94h128v12H62Z" fill="#bd8d15" rx="5" /></g>}
    {profile.accessory === "headset" && <g fill="none" stroke="#263832" strokeWidth="5"><path d="M72 134v-17c0-34 22-59 54-59s54 25 54 59v17" /><path d="M176 154c-7 12-16 18-29 18" /></g>}
    {profile.accessory === "tie" && <path d="m125 235-10 13 10 43 10-43-10-13Z" fill={profile.accent} />}
    {profile.accessory === "scarf" && <path d="M91 208c20 16 48 16 68 0l-8 32c-18 9-34 9-52 0l-8-32Z" fill={profile.accent} />}
    {profile.accessory === "badge" && <g><rect x="157" y="235" width="26" height="33" rx="5" fill="#f8fafc" /><circle cx="170" cy="245" r="5" fill={profile.accent} /><path d="M163 256h14M163 261h10" stroke="#64748b" strokeWidth="2" /></g>}
    <path d="M40 310c2-43 14-75 38-94l30 25-17 69H40ZM210 310c-2-43-14-75-38-94l-30 25 17 69h51Z" fill={profile.jacket} />
    <path d="M55 292c12-16 27-25 43-29M195 292c-12-16-27-25-43-29" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="5" opacity=".12" />
  </svg>;
}
