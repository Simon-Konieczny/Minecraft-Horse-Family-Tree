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
import { useState, useCallback, useDeferredValue, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getCookie, setCookie } from "cookies-next";
import { getBaseLayout, getSortLayout, NodeDensity } from "@/utils/layout";
import { disambiguatedFirstNames, familiesWithCounts } from "@/utils/studbook";
import {
  applyTreeFilters,
  defaultTreeFilters,
  sanitizeTreeFilters,
  type TreeFilters,
} from "@/utils/treeFilters";
import { useBloodlineColors } from "@/components/Bloodlines/BloodlineProvider";
import { vars } from "@/styles/theme.css";
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
  const [density, setDensity] = useState<NodeDensity>("full");

  const [nodes, setNodes] = useState<HorseNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  // Null until the filter cookie is restored (or skipped when absent);
  // null renders the all-on defaults without writing a cookie.
  const [filters, setFilters] = useState<TreeFilters | null>(null);

  const colors = useBloodlineColors();
  const families = useMemo(() => familiesWithCounts(horses), [horses]);
  // First-name chips need duplicate suffixes (Onyx / Onyx II).
  const shortNames = useMemo(() => disambiguatedFirstNames(horses), [horses]);
  const genBounds = useMemo(() => {
    const gens = horses.map((h) => h.generation || 0);
    return {
      min: gens.length > 0 ? Math.min(...gens) : 0,
      max: gens.length > 0 ? Math.max(...gens) : 0,
    };
  }, [horses]);

  const activeFilters = useMemo(
    () => filters ?? defaultTreeFilters(horses),
    [filters, horses],
  );
  // Search stays instant in the input; the expensive dagre re-layout
  // follows the deferred query so rapid typing doesn't jank large herds.
  const deferredSearch = useDeferredValue(activeFilters.search);
  const visibleIds = useMemo(
    () => applyTreeFilters(horses, { ...activeFilters, search: deferredSearch }),
    [horses, activeFilters, deferredSearch],
  );
  const visibleNodes = useMemo(
    () => initialNodes.filter((n) => visibleIds.has(n.id)),
    [initialNodes, visibleIds],
  );
  const visibleEdges = useMemo(
    () =>
      initialEdges.filter(
        (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
      ),
    [initialEdges, visibleIds],
  );

  const updateFilters = useCallback(
    (patch: Partial<TreeFilters>) => {
      setFilters((prev) => ({ ...(prev ?? defaultTreeFilters(horses)), ...patch }));
    },
    [horses],
  );
  const resetFilters = useCallback(() => {
    setFilters(defaultTreeFilters(horses));
  }, [horses]);

  // Initial cookie sync (mount only): restores persisted view choices.
  // Suppression justified below: one-shot external-store hydration,
  // not a render loop.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const savedView = getCookie("horse-tree-view") as ViewMode;
    if (savedView) setView(savedView);

    const savedStatus = getCookie("horse-status-view");
    if (savedStatus !== undefined) setStatusView(savedStatus === "true");

    const savedDensity = getCookie("horse-node-density") as
      | NodeDensity
      | undefined;
    if (
      savedDensity === "full" ||
      savedDensity === "compact" ||
      savedDensity === "minimal"
    ) {
      setDensity(savedDensity);
    } else {
      // Migrate the pre-slider compact toggle.
      const legacyCompact = getCookie("horse-compact-view");
      if (legacyCompact !== undefined) {
        setDensity(legacyCompact === "true" ? "compact" : "full");
      }
    }

    try {
      const raw = getCookie("horse-tree-filters");
      if (raw) {
        setFilters(sanitizeTreeFilters(JSON.parse(String(raw)), horses));
      }
    } catch {
      // Corrupt cookie: fall through to all-on defaults.
    }
  }, [horses]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist filter choices (snapshot the current family set alongside).
  useEffect(() => {
    if (!filters) return;
    const present = familiesWithCounts(horses).map((f) => f.family);
    setCookie("horse-tree-filters", JSON.stringify({ ...filters, knownFamilies: present }), {
      maxAge: 60 * 60 * 24 * 30,
    });
  }, [filters, horses]);

  // Re-layout on view/filter/herd changes and push the result into the
  // controlled ReactFlow instance. Suppression justified below: the
  // nodes prop must stay synced with the external layout inputs.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const layoutNodes =
      view === "base"
        ? getBaseLayout(visibleNodes, visibleEdges, density)
        : getSortLayout(visibleNodes, view, density);

    // Update nodes with statusView, density, and short-name data
    const newNodes = layoutNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        activeView: view,
        statusView: statusView,
        density: density,
        shortName: shortNames.get(node.id) ?? node.data.horse.firstName,
      }
    }));

    setNodes(newNodes);
    setEdges(visibleEdges);
  }, [view, statusView, density, shortNames, visibleNodes, visibleEdges]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
        density={density}
        setDensity={setDensity}
        filters={activeFilters}
        updateFilters={updateFilters}
        resetFilters={resetFilters}
        families={families}
        colors={colors}
        genBounds={genBounds}
        visibleCount={visibleIds.size}
        totalCount={horses.length}
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
        {density === "minimal" && families.length > 0 && (
          <>
            <span className={styles.legendTitle} style={{ marginTop: 4 }}>
              Families
            </span>
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {families.map((f) => (
                <span key={f.family} className={styles.legendRow}>
                  <span
                    className={styles.legendSwatch}
                    style={{ backgroundColor: colors[f.family] || "#94a3b8" }}
                  />
                  {f.family} · {f.count}
                </span>
              ))}
            </span>
          </>
        )}
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
      {visibleIds.size === 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 200,
            backgroundColor: vars.color.parchment,
            border: `1px solid ${vars.color.goldSoft}`,
            borderRadius: vars.borderRadius.md,
            boxShadow: vars.shadow.md,
            padding: `${vars.spacing.sm} ${vars.spacing.md}`,
            fontFamily: vars.font.display,
            color: vars.color.inkSoft,
            pointerEvents: "none",
          }}
        >
          No horses match these filters.
        </div>
      )}
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
