"use client";
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
} from "@xyflow/react";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
import { getBaseLayout, getSortLayout } from "@/utils/layout";
import "@xyflow/react/dist/style.css";
import CustomHorseNode, { HorseNode } from "../HorseNode/HorseNode";
import * as styles from "./HorseTreeView.css";
import { Horse } from "@/types/horse";
import ViewMenu from "./ViewMenu/ViewMenu";

const nodeTypes = { horseNode: CustomHorseNode };
export type ViewMode = "base" | "speed" | "jump" | "health";

interface HorseTreeViewProps {
  initialNodes: HorseNode[];
  initialEdges: Edge[];
  horses: Horse[];
}

function TreeContent({
  initialNodes,
  initialEdges,
  horses,
}: HorseTreeViewProps) {
  const router = useRouter();

  const [view, setView] = useState<ViewMode>("base");
  const [statusView, setStatusView] = useState<boolean>(false);
  const [compactView, setCompactView] = useState<boolean>(false);

  const [nodes, setNodes] = useState<HorseNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // Initial cookie sync
  useEffect(() => {
    const savedView = getCookie("horse-tree-view") as ViewMode;
    if (savedView) setView(savedView);

    const savedStatus = getCookie("horse-status-view");
    if (savedStatus !== undefined) setStatusView(savedStatus === "true");

    const savedCompact = getCookie("horse-compact-view");
    if (savedCompact !== undefined) setCompactView(savedCompact === "true");
  }, []);

  useEffect(() => {
    const layoutNodes =
      view === "base"
        ? getBaseLayout(initialNodes, initialEdges, compactView)
        : getSortLayout(initialNodes, view, compactView);

    // Update nodes with statusView and compactView data
    const newNodes = layoutNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        activeView: view,
        statusView: statusView,
        compactView: compactView
      }
    }));

    setNodes(newNodes);
    setEdges(initialEdges);
  }, [view, statusView, compactView, initialNodes, initialEdges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes((nds) => applyNodeChanges(changes, nds) as HorseNode[]),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  return (
    <div className={styles.container}>
      <ViewMenu 
        setView={setView} 
        view={view} 
        statusView={statusView} 
        setStatusView={setStatusView} 
        compactView={compactView}
        setCompactView={setCompactView}
      />

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendTitle}>Legend</span>
        <span className={styles.legendRow}>
          <span className={styles.legendSwatch} /> Node color — family
        </span>
        <span className={styles.legendRow}>
          <span className={styles.legendShade} /> Darkened — deceased
        </span>
        <span className={styles.legendRow}>
          <span className={styles.legendLine} /> Line — parent to foal
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => router.push(`/horses/${node.id}`)}
        fitView
        minZoom={0.05}
        maxZoom={2.0}
      >
        <Background key="background" variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls key="controls" showInteractive={false} />
        <MiniMap 
          key="minimap"
          nodeStrokeWidth={3} 
          zoomable 
          pannable 
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{ height: 120, width: 200 }}
        />
      </ReactFlow>
    </div>
  );
}

export default function HorseTreeView(props: HorseTreeViewProps) {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingFallback}>Loading lineage...</div>
      }
    >
      <ReactFlowProvider>
        <TreeContent {...props} />
      </ReactFlowProvider>
    </Suspense>
  );
}
