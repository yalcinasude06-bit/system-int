import type { FlowSymbol } from "./flowchartContent";

type FlowSymbolShapeProps = {
  symbol: FlowSymbol;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  className?: string;
};

const colors: Record<FlowSymbol, { fill: string; stroke: string }> = {
  startEnd: { fill: "#dbeafe", stroke: "#475569" },
  process: { fill: "#dcfce7", stroke: "#4d7c0f" },
  decision: { fill: "#fef3c7", stroke: "#a16207" },
  data: { fill: "#dbeafe", stroke: "#0369a1" },
  document: { fill: "#fff7ed", stroke: "#a16207" },
  delay: { fill: "#ffedd5", stroke: "#c2410c" },
  control: { fill: "#f3e8ff", stroke: "#7e22ce" },
};

/** One visual source for palette chips, onboarding previews, and diagram nodes. */
export function FlowSymbolShape({ symbol, x = 0, y = 0, width = 152, height = 58, className = "" }: FlowSymbolShapeProps) {
  const color = colors[symbol];
  const common = { fill: color.fill, stroke: color.stroke, strokeWidth: 2, className: `flowchart-svg-shape ${className}`.trim() };
  const wave = height * .17;

  switch (symbol) {
    case "startEnd":
      return <rect {...common} x={x} y={y} width={width} height={height} rx={height / 2} />;
    case "process":
      return <rect {...common} x={x} y={y} width={width} height={height} rx={Math.max(4, height * .1)} />;
    case "decision":
      return <polygon {...common} points={`${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`} />;
    case "data":
      return <polygon {...common} points={`${x + width * .12},${y} ${x + width},${y} ${x + width * .88},${y + height} ${x},${y + height}`} />;
    case "document":
      return <path {...common} d={`M ${x} ${y} H ${x + width} V ${y + height - wave} Q ${x + width * .87} ${y + height + wave * .2} ${x + width * .75} ${y + height - wave * .6} Q ${x + width * .62} ${y + height - wave * 1.35} ${x + width / 2} ${y + height - wave * .6} Q ${x + width * .37} ${y + height + wave * .2} ${x + width * .25} ${y + height - wave * .6} Q ${x + width * .12} ${y + height - wave * 1.35} ${x} ${y + height - wave * .6} Z`} />;
    case "delay":
      return <path {...common} d={`M ${x} ${y} H ${x + width - height / 2} A ${height / 2} ${height / 2} 0 0 1 ${x + width - height / 2} ${y + height} H ${x} Z`} />;
    case "control":
      return <g><rect {...common} x={x} y={y} width={width} height={height} rx={Math.max(4, height * .1)} /><path className="flowchart-svg-control-lines" d={`M ${x + width * .07} ${y + height * .08} V ${y + height * .92} M ${x + width * .93} ${y + height * .08} V ${y + height * .92}`} stroke="#7e22ce" strokeWidth={Math.max(1.5, width * .02)} /></g>;
  }
}
