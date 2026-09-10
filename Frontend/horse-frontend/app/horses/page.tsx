export const dynamic = 'force-dynamic';
import { getAllHorses } from '@/lib/horses';
import HorseTreeView from '@/components/HorseTreeView/HorseTreeView';
import { getBaseLayout } from "@/utils/layout";
import { Horse } from '@/types/horse';
import { getHorseFullName } from '@/utils/horseNames';
import { HorseNode } from '@/components/HorseNode/HorseNode';
import { Edge } from '@xyflow/react';

export default async function HomePage() {
  const horses: Horse[] = await getAllHorses();
  
  const initialNodes: HorseNode[] = horses.map((h) => ({
  id: h.id.toString(),
  type: 'horseNode',
  data: { 
    horse: h,
    label: getHorseFullName(h) 
  },
  position: { x: 0, y: 0 },
}));

  const initialEdges: Edge[] = horses.flatMap((h) => {
  const connections: Edge[] = [];

  // Guard against corrupt self-links (a horse as its own parent):
  // they would loop the tree, so never render them.
  if (h.parentId1 && h.parentId1 !== h.id.toString()) {
    connections.push({
      id: `e-${h.parentId1}-${h.id}`,
      source: h.parentId1,
      target: h.id?.toString(),
      animated: true,
    });
  }

  if (h.parentId2 && h.parentId2 !== h.id.toString()) {
    connections.push({
      id: `e-${h.parentId2}-${h.id}`,
      source: h.parentId2,
      target: h.id?.toString(),
    });
  }

  return connections;
});

  const nodes = getBaseLayout(initialNodes, initialEdges);
  const edges = initialEdges;

  const dataKey = `tree-${horses.length}`;

  return (
    <main className="h-screen w-full" suppressHydrationWarning>
      <HorseTreeView initialNodes={nodes} initialEdges={edges} key={dataKey} horses={horses}/>
    </main>
  );
}