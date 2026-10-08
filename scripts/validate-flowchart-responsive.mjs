import { flowchartPool } from "../src/components/modules/Week3_FlowchartSymbols/flowchartContent.ts";
import { createResponsiveDiagramLayout, fitDiagramScale, measureFlowNode } from "../src/components/modules/Week3_FlowchartSymbols/responsiveLayout.ts";
import { buildFlowEdgeRoutes } from "../src/components/modules/Week3_FlowchartSymbols/flowchartRouting.ts";

const viewports = [
  { width: 360, height: 740, diagramWidth: 298, diagramHeight: 365 },
  { width: 390, height: 844, diagramWidth: 328, diagramHeight: 420 },
  { width: 1280, height: 800, diagramWidth: 929, diagramHeight: 500 },
  { width: 1440, height: 900, diagramWidth: 929, diagramHeight: 540 },
];
const locales = ["tr", "en"];
const failures = [];
let combinations = 0;

for (const viewport of viewports) {
  for (const locale of locales) {
    for (const diagram of flowchartPool) {
      combinations += 1;
      const compact = viewport.width <= 620;
      const layout = createResponsiveDiagramLayout(diagram, locale, compact);
      const minimumScale = compact ? .92 : .84;
      const scale = fitDiagramScale(viewport.diagramWidth, viewport.diagramHeight, layout.width, layout.height, minimumScale);
      const scaledWidth = layout.width * scale;

      if (scale + .001 < minimumScale) {
        failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: labels were scaled below the readable minimum`);
      }
      if (!compact && scaledWidth > viewport.diagramWidth + .01) {
        failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: desktop stage exceeds its viewport`);
      }
      if (compact && scaledWidth <= viewport.diagramWidth) {
        failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: compact stage unexpectedly lost its readable minimum width`);
      }

      for (const node of diagram.nodes) {
        const box = layout.nodes[node.id];
        const measured = measureFlowNode(node, locale, compact);
        if (box.x < 0 || box.y < 0 || box.x + box.width > layout.width || box.y + box.height > layout.height) {
          failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}/${node.id}: node leaves the canvas`);
        }
        if (box.height + .01 < measured.height || box.width + .01 < measured.width) {
          failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}/${node.id}: label box is smaller than measured text`);
        }
        const labelHeight = box.height * (node.blank || node.symbol === "document" ? .74 : .84);
        if (labelHeight + .01 < measured.lines * measured.fontSize * 1.12) {
          failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}/${node.id}: wrapped label exceeds its safe shape area`);
        }
      }

      for (let left = 0; left < diagram.nodes.length; left += 1) {
        for (let right = left + 1; right < diagram.nodes.length; right += 1) {
          const firstNode = diagram.nodes[left];
          const secondNode = diagram.nodes[right];
          const first = layout.nodes[firstNode.id];
          const second = layout.nodes[secondNode.id];
          const overlaps = first.x < second.x + second.width && first.x + first.width > second.x
            && first.y < second.y + second.height && first.y + first.height > second.y;
          if (overlaps) failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: ${first.id} overlaps ${second.id}`);
        }
      }

      const routes = buildFlowEdgeRoutes(diagram, layout);
      if (routes.length !== diagram.edges.length) failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: a route was not generated`);

      for (const edge of diagram.edges) {
        if (!layout.nodes[edge.from] || !layout.nodes[edge.to]) {
          failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: edge endpoint is missing`);
        }
      }

      for (const route of routes) {
        const target = layout.nodes[route.edge.to];
        const epsilon = .01;
        const endsAtTargetBoundary = route.endDirection === "bottom"
          ? Math.abs(route.end.y - target.y) < epsilon
          : route.endDirection === "top"
            ? Math.abs(route.end.y - (target.y + target.height)) < epsilon
            : route.endDirection === "right"
              ? Math.abs(route.end.x - target.x) < epsilon
              : Math.abs(route.end.x - (target.x + target.width)) < epsilon;
        if (!endsAtTargetBoundary) failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}/${route.key}: arrowhead misses its target boundary`);
        if (route.end.x < 0 || route.end.x > layout.width || route.end.y < 0 || route.end.y > layout.height) {
          failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}/${route.key}: arrowhead leaves the canvas`);
        }
        if (route.label) {
          for (const node of diagram.nodes) {
            const box = layout.nodes[node.id];
            if (route.label.x > box.x - 5 && route.label.x < box.x + box.width + 5 && route.label.y > box.y - 5 && route.label.y < box.y + box.height + 5) {
              failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}/${route.key}: edge label overlaps ${node.id}`);
            }
          }
        }
      }

      if (diagram.edges.some((edge) => edge.loop)) {
        for (const lane of layout.loopLanes) {
          if (lane < 0 || lane > layout.width) failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: return lane leaves the canvas`);
          for (const node of diagram.nodes) {
            const box = layout.nodes[node.id];
            if (lane >= box.x && lane <= box.x + box.width) {
              failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: return lane crosses ${node.id}`);
            }
          }
        }
      }
    }
  }
}

if (flowchartPool.length !== 15) failures.push(`Expected 15 diagrams, received ${flowchartPool.length}`);
if (combinations !== 120) failures.push(`Expected 120 matrix combinations, received ${combinations}`);

if (failures.length) {
  console.error(`Responsive flowchart validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Responsive flowchart validation passed: ${flowchartPool.length}/15 diagrams × ${locales.length} languages × ${viewports.length} viewports = ${combinations} combinations.`);
}
