import { flowchartPool } from "../src/components/modules/Week3_FlowchartSymbols/flowchartContent.ts";
import { createResponsiveDiagramLayout, fitDiagramScale, measureFlowNode } from "../src/components/modules/Week3_FlowchartSymbols/responsiveLayout.ts";

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
      const maxColumn = Math.max(...diagram.nodes.map((node) => node.column));
      const compact = viewport.width <= 620 || maxColumn >= 8;
      const layout = createResponsiveDiagramLayout(diagram, locale, compact);
      const scale = fitDiagramScale(viewport.diagramWidth, viewport.diagramHeight, layout.width, layout.height);
      const scaledWidth = layout.width * scale;
      const scaledHeight = layout.height * scale;

      if (scaledWidth > viewport.diagramWidth + .01 || scaledHeight > viewport.diagramHeight + .01) {
        failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: stage exceeds its viewport`);
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
          if (firstNode.column !== secondNode.column) continue;
          const first = layout.nodes[firstNode.id];
          const second = layout.nodes[secondNode.id];
          const overlaps = first.x < second.x + second.width && first.x + first.width > second.x
            && first.y < second.y + second.height && first.y + first.height > second.y;
          if (overlaps) failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: ${first.id} overlaps ${second.id}`);
        }
      }

      for (const edge of diagram.edges) {
        if (!layout.nodes[edge.from] || !layout.nodes[edge.to]) {
          failures.push(`${viewport.width}x${viewport.height}/${locale}/${diagram.id}: edge endpoint is missing`);
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
