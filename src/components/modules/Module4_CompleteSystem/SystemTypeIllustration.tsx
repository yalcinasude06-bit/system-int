import Image from "next/image";

type IllustrationProps = {
  type: string;
};

const systemImages: Record<string, string> = {
  natural: "/images/module4/dogal-sistem.png",
  "human-made": "/images/module4/insan-yapimi.png",
  static: "/images/module4/statik-sistem.png",
  dynamic: "/images/module4/dinamik-sistem.png",
  closed: "/images/module4/kapali-sistem.png",
  open: "/images/module4/acik-sistem.png",
  deterministic: "/images/module4/deterministik.png",
  stochastic: "/images/module4/stokastik.png",
  physical: "/images/module4/fiziksel-sistem.png",
  conceptual: "/images/module4/kavramsal-sistem.png",
};

export function SystemTypeIllustration({ type }: IllustrationProps) {
  const source = systemImages[type] || systemImages.conceptual;
  return <span className="system-type-illustration" aria-hidden="true">
    <Image src={source} alt="" fill sizes="(max-width: 620px) 44vw, 360px" />
  </span>;
}
