import type { Locale } from "@/lib/i18n/dictionaries";
import type { FlowNode, FlowRow, FlowSymbol, FlowchartDiagram } from "./flowchartContent";

export type FlowNodeBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResponsiveDiagramLayout = {
  width: number;
  height: number;
  compact: boolean;
  fontSize: number;
  /** Reserved, obstacle-free lanes used by return arrows. */
  loopLanes: number[];
  nodes: Record<string, FlowNodeBox>;
};

const rowCenters: Record<"regular" | "compact", Record<FlowRow, number>> = {
  // The diagram reads from top to bottom. Branches occupy horizontal rows,
  // while the area at the far right is deliberately left clear for loops.
  regular: { top: 160, main: 420, bottom: 680 },
  compact: { top: 100, main: 215, bottom: 330 },
};

const horizontalPadding: Record<FlowSymbol, number> = {
  startEnd: 24,
  process: 20,
  decision: 48,
  data: 42,
  document: 22,
  delay: 28,
  control: 30,
};

function wrappedLineCount(text: string, contentWidth: number, fontSize: number) {
  const averageCharacterWidth = fontSize * .54;
  const maxCharacters = Math.max(6, Math.floor(contentWidth / averageCharacterWidth));
  let lines = 1;
  let currentLength = 0;

  for (const word of text.trim().split(/\s+/)) {
    const wordLength = Math.min(word.length, maxCharacters);
    if (currentLength && currentLength + 1 + wordLength > maxCharacters) {
      lines += 1;
      currentLength = wordLength;
    } else {
      currentLength += (currentLength ? 1 : 0) + wordLength;
    }
    if (word.length > maxCharacters) lines += Math.floor((word.length - 1) / maxCharacters);
  }

  return lines;
}

export function measureFlowNode(node: FlowNode, locale: Locale, compact: boolean) {
  const text = node.text[locale];
  const fontSize = compact ? 11 : 12;
  const onMainTrack = (node.row ?? "main") === "main";
  const minWidth = compact ? (onMainTrack ? 172 : 136) : (onMainTrack ? 184 : 164);
  const maxWidth = compact ? (onMainTrack ? 214 : 166) : (onMainTrack ? 260 : 214);
  // Any palette symbol can be placed into a blank node. Measure those slots
  // against the narrowest usable shape (decision) so even an incorrect
  // placement cannot squeeze the label outside its temporary shape.
  const padding = horizontalPadding[node.blank ? "decision" : node.symbol] * (compact ? .72 : 1);
  const desiredLines = text.length > (compact ? 25 : 34) ? 3 : 2;
  const textPixels = text.length * fontSize * .54;
  const width = Math.round(Math.max(minWidth, Math.min(maxWidth, textPixels / desiredLines + padding)));
  const contentWidth = Math.max(42, width - padding);
  const lines = wrappedLineCount(text, contentWidth, fontSize);
  const minimumHeight = compact ? 44 : 54;
  const lineHeight = fontSize * 1.12;
  const bottomInset = node.blank || node.symbol === "document" ? .18 : .08;
  const usableHeightRatio = 1 - .08 - bottomInset;
  const height = Math.ceil(Math.max(minimumHeight, lines * lineHeight / usableHeightRatio + 2));
  return { width, height, lines, fontSize };
}

export function createResponsiveDiagramLayout(diagram: FlowchartDiagram, locale: Locale, compact: boolean): ResponsiveDiagramLayout {
  const mode = compact ? "compact" : "regular";
  // Do not switch a wide screen to a narrow canvas just because a diagram has
  // many columns. Height is scrollable in the viewport; horizontal geometry
  // stays readable and reserves a proper return lane.
  const width = compact ? 470 : 900;
  const columnGap = compact ? 16 : 28;
  const outerPadding = compact ? 18 : 28;
  const measurements = new Map(diagram.nodes.map((node) => [node.id, measureFlowNode(node, locale, compact)]));
  const columns = [...new Set(diagram.nodes.map((node) => node.column))].sort((a, b) => a - b);
  const columnTops = new Map<number, number>();
  const columnHeights = new Map<number, number>();
  let cursor = outerPadding;

  for (const column of columns) {
    const height = Math.max(...diagram.nodes.filter((node) => node.column === column).map((node) => measurements.get(node.id)!.height));
    columnTops.set(column, cursor);
    columnHeights.set(column, height);
    cursor += height + columnGap;
  }

  const nodes = Object.fromEntries(diagram.nodes.map((node) => {
    const measurement = measurements.get(node.id)!;
    const columnHeight = columnHeights.get(node.column)!;
    const x = rowCenters[mode][node.row ?? "main"] - measurement.width / 2;
    const y = columnTops.get(node.column)! + (columnHeight - measurement.height) / 2;
    return [node.id, { id: node.id, x, y, width: measurement.width, height: measurement.height } satisfies FlowNodeBox];
  }));

  return {
    width,
    height: Math.max(1, cursor - columnGap + outerPadding),
    compact,
    fontSize: compact ? 11 : 12,
    loopLanes: compact ? [452, 430] : [866, 830],
    nodes,
  };
}

export function fitDiagramScale(availableWidth: number, _availableHeight: number, naturalWidth: number, _naturalHeight: number, minimumScale = .84) {
  if (!availableWidth || !naturalWidth) return 1;
  // Height must not shrink type: long diagrams scroll in their own viewport.
  // On a narrow screen a small horizontal rail is preferable to 7px labels.
  return Math.max(minimumScale, Math.min(1, availableWidth / naturalWidth));
}
