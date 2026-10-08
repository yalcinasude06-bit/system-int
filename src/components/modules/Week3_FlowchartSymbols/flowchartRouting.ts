import type { FlowchartDiagram, FlowEdge } from "./flowchartContent";
import type { ResponsiveDiagramLayout } from "./responsiveLayout";

export type EdgeSide = "top" | "right" | "bottom" | "left";

export type EdgeRoute = {
  edge: FlowEdge;
  key: string;
  path: string;
  end: { x: number; y: number };
  endDirection: EdgeSide;
  label?: { x: number; y: number; anchor?: "start" | "middle" | "end" };
};

function pointOnBox(box: ResponsiveDiagramLayout["nodes"][string], side: EdgeSide) {
  if (side === "top") return { x: box.x + box.width / 2, y: box.y };
  if (side === "right") return { x: box.x + box.width, y: box.y + box.height / 2 };
  if (side === "bottom") return { x: box.x + box.width / 2, y: box.y + box.height };
  return { x: box.x, y: box.y + box.height / 2 };
}

export function arrowPolygon(end: EdgeRoute["end"], direction: EdgeSide) {
  const vector = direction === "top" ? { x: 0, y: -1 }
    : direction === "right" ? { x: 1, y: 0 }
      : direction === "bottom" ? { x: 0, y: 1 }
        : { x: -1, y: 0 };
  const base = { x: end.x - vector.x * 10, y: end.y - vector.y * 10 };
  const perpendicular = { x: -vector.y * 4.5, y: vector.x * 4.5 };
  return `${end.x},${end.y} ${base.x + perpendicular.x},${base.y + perpendicular.y} ${base.x - perpendicular.x},${base.y - perpendicular.y}`;
}

export function buildFlowEdgeRoutes(diagram: FlowchartDiagram, layout: ResponsiveDiagramLayout): EdgeRoute[] {
  return diagram.edges.flatMap<EdgeRoute>((edge, index): EdgeRoute[] => {
    const fromBox = layout.nodes[edge.from];
    const toBox = layout.nodes[edge.to];
    if (!fromBox || !toBox) return [];

    const fromCenter = { x: fromBox.x + fromBox.width / 2, y: fromBox.y + fromBox.height / 2 };
    const toCenter = { x: toBox.x + toBox.width / 2, y: toBox.y + toBox.height / 2 };
    const key = `${edge.from}:${edge.to}:${index}`;

    if (edge.loop) {
      const loopIndex = diagram.edges.slice(0, index).filter((candidate) => candidate.loop).length;
      const laneX = layout.loopLanes[Math.min(loopIndex, layout.loopLanes.length - 1)];
      const start = pointOnBox(fromBox, "right");
      const end = pointOnBox(toBox, "right");
      return [{
        edge,
        key,
        path: `M ${start.x} ${start.y} H ${laneX} V ${end.y} H ${end.x}`,
        end,
        endDirection: "left",
        label: edge.label ? { x: laneX - 9, y: (start.y + end.y) / 2, anchor: "end" } : undefined,
      }];
    }

    // Decision labels always get their own orthogonal branch. A branch first
    // leaves the decision sideways, then enters its target from the matching
    // side, keeping Yes/No text out of the main vertical flow.
    if (edge.label) {
      const targetIsLeft = toCenter.x < fromCenter.x - 12;
      const targetIsRight = toCenter.x > fromCenter.x + 12;
      if (targetIsLeft || targetIsRight) {
        const start = pointOnBox(fromBox, targetIsLeft ? "left" : "right");
        const end = pointOnBox(toBox, targetIsLeft ? "right" : "left");
        const availableGap = targetIsLeft ? start.x - end.x : end.x - start.x;
        if (availableGap >= 32) {
          const bendX = (start.x + end.x) / 2;
          return [{
            edge,
            key,
            path: `M ${start.x} ${start.y} H ${bendX} V ${end.y} H ${end.x}`,
            end,
            endDirection: targetIsLeft ? "left" : "right",
            label: { x: bendX, y: (start.y + end.y) / 2 - 5 },
          }];
        }

        // Compact rows can overlap horizontally. In that case, take the
        // branch around both shapes instead of sending a line under either.
        const side: EdgeSide = targetIsLeft ? "left" : "right";
        const outerStart = pointOnBox(fromBox, side);
        const outerEnd = pointOnBox(toBox, side);
        const bendX = targetIsLeft
          ? Math.max(8, Math.min(outerStart.x, outerEnd.x) - 26)
          : Math.min(layout.width - 8, Math.max(outerStart.x, outerEnd.x) + 26);
        return [{
          edge,
          key,
          path: `M ${outerStart.x} ${outerStart.y} H ${bendX} V ${outerEnd.y} H ${outerEnd.x}`,
          end: outerEnd,
          endDirection: targetIsLeft ? "right" : "left",
          label: { x: bendX + (targetIsLeft ? 8 : -8), y: (outerStart.y + outerEnd.y) / 2 - 5, anchor: targetIsLeft ? "start" : "end" },
        }];
      }

      const useRightLane = edge.label.en === "No";
      const side: EdgeSide = useRightLane ? "right" : "left";
      const start = pointOnBox(fromBox, side);
      const end = pointOnBox(toBox, side);
      const bendX = useRightLane ? Math.max(start.x, end.x) + 26 : Math.min(start.x, end.x) - 26;
      return [{
        edge,
        key,
        path: `M ${start.x} ${start.y} H ${bendX} V ${end.y} H ${end.x}`,
        end,
        endDirection: useRightLane ? "left" : "right",
        label: { x: bendX + (useRightLane ? 8 : -8), y: (start.y + end.y) / 2 - 5, anchor: useRightLane ? "start" : "end" },
      }];
    }

    if (toCenter.y >= fromCenter.y) {
      const start = pointOnBox(fromBox, "bottom");
      const end = pointOnBox(toBox, "top");
      const bendY = (start.y + end.y) / 2;
      return [{
        edge,
        key,
        path: Math.abs(start.x - end.x) < 1 ? `M ${start.x} ${start.y} V ${end.y}` : `M ${start.x} ${start.y} V ${bendY} H ${end.x} V ${end.y}`,
        end,
        endDirection: "bottom",
      }];
    }

    const useRightSide = toCenter.x >= fromCenter.x;
    const start = pointOnBox(fromBox, useRightSide ? "right" : "left");
    const end = pointOnBox(toBox, useRightSide ? "right" : "left");
    const bendX = useRightSide ? Math.max(start.x, end.x) + 26 : Math.min(start.x, end.x) - 26;
    return [{
      edge,
      key,
      path: `M ${start.x} ${start.y} H ${bendX} V ${end.y} H ${end.x}`,
      end,
      endDirection: useRightSide ? "left" : "right",
    }];
  });
}
