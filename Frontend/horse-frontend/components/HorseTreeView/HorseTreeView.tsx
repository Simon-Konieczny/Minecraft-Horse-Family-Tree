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
import Link from "next/link";
import { useReactFlow } from "@xyflow/react";
import { getCookie, setCookie } from "cookies-next";
import { getBaseLayout, getSortLayout, NodeDensity } from "@/utils/layout";
import { getAncestorIds, getDescendantIds } from "@/utils/lineage";
import { calculateColorFromDna } from "@/utils/genetics/utils";
import { dominantBloodline } from "@/utils/analytics";
import { getHorseFullName } from "@/utils/horseNames";
import { disambiguatedFirstNames, effectiveFamilies, familiesWithCounts } from "@/utils/studbook";
import {
  applyTreeFilters,
  defaultTreeFilters,
  sanitizeTreeFilters,
  TREE_FILTERS_VERSION,
  type TreeFilters,
} from "@/utils/treeFilters";
import { useBloodlineColors } from "@/components/Bloodlines/BloodlineProvider";
import { vars } from "@/styles/theme.css";
import "@xyflow/react/dist/style.css";
import CustomHorseNode, { HorseNode } from "../HorseNode/HorseNode";
import * as styles from "./HorseTreeView.css";
import { Horse } from "@/types/horse";
import ViewMenu from "./ViewMenu/ViewMenu";
import SearchBar from "./HorseSearch/SearchBar";

const nodeTypes = { horseNode: CustomHorseNode };
export type ViewMode = "base" | "speed" | "jump" | "health";
/** Node fill source: stored snapshot, live registry blend, or dominant-bloodline flat. */
export type ColorMode = "stored" | "live" | "dominant";
/** Node click behavior: open the horse page, or focus its lineage in place. */
export type ClickAction = "open" | "focus";
/** How outsiders render while focused: translucent in place, or removed. */
export type FocusDisplay = "dim" | "isolate";

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
  const [colorMode, setColorMode] = useState<ColorMode>("stored");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [clickAction, setClickAction] = useState<ClickAction>("open");
  const [focusDisplay, setFocusDisplay] = useState<FocusDisplay>("dim");

  const [nodes, setNodes] = useState<HorseNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  // Null until the filter cookie is restored (or skipped when absent);
  // null renders the all-on defaults without writing a cookie.
  const [filters, setFilters] = useState<TreeFilters | null>(null);
  // Quick-find pick hidden by the active filters — offers a Reveal action.
  const [hiddenPickId, setHiddenPickId] = useState<string | null>(null);
  const { fitView } = useReactFlow();

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
  // Focus set: the focused horse plus its full ancestor/descendant cone.
  const focusSet = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const id of getAncestorIds(horses, focusId, 25)) set.add(id);
    for (const id of getDescendantIds(horses, focusId)) set.add(id);
    return set;
  }, [horses, focusId]);
  const focusHorse = useMemo(
    () => (focusId ? horses.find((h) => h.id === focusId) : undefined),
    [horses, focusId],
  );
  const visibleIds = useMemo(
    () => applyTreeFilters(horses, { ...activeFilters, search: deferredSearch }),
    [horses, activeFilters, deferredSearch],
  );
  // Isolate hides outsiders; dim keeps the full layout and fades them.
  const effectiveIds = useMemo(() => {
    if (focusDisplay !== "isolate" || !focusSet) return visibleIds;
    return new Set([...visibleIds].filter((id) => focusSet.has(id)));
  }, [visibleIds, focusSet, focusDisplay]);
  const dimmedIds = useMemo(() => {
    if (focusDisplay !== "dim" || !focusSet) return null;
    const dimmed = new Set<string>();
    for (const id of visibleIds) {
      if (!focusSet.has(id)) dimmed.add(id);
    }
    return dimmed;
  }, [visibleIds, focusSet, focusDisplay]);
  // Live tints per color mode (stored = no override).
  const tints = useMemo(() => {
    if (colorMode === "stored") return null;
    const map = new Map<string, string>();
    for (const h of horses) {
      if (colorMode === "live") {
        map.set(h.id, calculateColorFromDna(h.dna || {}, colors));
      } else {
        const dom = dominantBloodline(h.dna);
        map.set(h.id, (dom && colors[dom]) || "#94a3b8");
      }
    }
    return map;
  }, [horses, colors, colorMode]);
  const visibleNodes = useMemo(
    () =>
      initialNodes
        .filter((n) => effectiveIds.has(n.id))
        .map((n) => {
          const tint = tints?.get(n.id);
          return tint && tint !== n.data.horse.hexColor
            ? { ...n, data: { ...n.data, tint } }
            : n;
        }),
    [initialNodes, effectiveIds, tints],
  );
  const visibleEdges = useMemo(
    () =>
      initialEdges
        .filter(
          (e) => effectiveIds.has(e.source) && effectiveIds.has(e.target),
        )
        .map((e) => {
          const dimmed =
            dimmedIds !== null &&
            (dimmedIds.has(e.source) || dimmedIds.has(e.target));
          return dimmed ? { ...e, style: { ...e.style, opacity: 0.12 } } : e;
        }),
    [initialEdges, effectiveIds, dimmedIds],
  );

  const updateFilters = useCallback(
    (patch: Partial<TreeFilters>) => {
      setFilters((prev) => ({ ...(prev ?? defaultTreeFilters(horses)), ...patch }));
    },
    [horses],
  );
  const resetFilters = useCallback(() => {
    setFilters(defaultTreeFilters(horses));
    setHiddenPickId(null);
  }, [horses]);

  const flyToHorse = useCallback(
    (horseId: string) => {
      setTimeout(() => fitView({ nodes: [{ id: horseId }], duration: 600, padding: 0.3 }), 50);
    },
    [fitView],
  );

  // Quick-find pick: highlight lineage + fly to the node. When the horse
  // is hidden by the active filters, keep the pick pending and offer a
  // Reveal action instead of silently resetting the herd's filters.
  const handleSearchPick = useCallback(
    (horseId: string) => {
      if (visibleIds.has(horseId)) {
        setHiddenPickId(null);
        setFocusId(horseId);
        flyToHorse(horseId);
      } else {
        setHiddenPickId(horseId);
      }
    },
    [visibleIds, flyToHorse],
  );

  // Reveal widens only the blocking dimensions (family, status, gen).
  const handleRevealPick = useCallback(() => {
    if (!hiddenPickId) return;
    const horse = horses.find((h) => h.id === hiddenPickId);
    if (!horse) {
      setHiddenPickId(null);
      return;
    }
    const base = filters ?? defaultTreeFilters(horses);
    const families = [...new Set([...base.families, ...effectiveFamilies(horse)])];
    const statuses = base.statuses.includes(horse.status)
      ? base.statuses
      : [...base.statuses, horse.status];
    const gen = horse.generation || 0;
    setFilters({
      ...base,
      families,
      statuses,
      genMin: Math.min(base.genMin, gen),
      genMax: Math.max(base.genMax, gen),
    });
    setHiddenPickId(null);
    setFocusId(horse.id);
    flyToHorse(horse.id);
  }, [hiddenPickId, horses, filters, flyToHorse]);

  const handleClickActionChange = useCallback((mode: ClickAction) => {
    setClickAction(mode);
    setCookie("horse-tree-click", mode, { maxAge: 60 * 60 * 24 * 30 });
  }, []);

  const handleFocusDisplayChange = useCallback((mode: FocusDisplay) => {
    setFocusDisplay(mode);
    setCookie("horse-tree-focus-display", mode, { maxAge: 60 * 60 * 24 * 30 });
  }, []);

  // Initial cookie sync (mount only): restores persisted view choices.
  // Suppression justified below: one-shot external-store hydration,
  // not a render loop.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const savedView = getCookie("horse-tree-view") as ViewMode;
    if (savedView) setView(savedView);

    const savedColor = getCookie("horse-tree-color") as ColorMode;
    if (savedColor === "stored" || savedColor === "live" || savedColor === "dominant") {
      setColorMode(savedColor);
    }

    const savedClick = getCookie("horse-tree-click") as ClickAction;
    if (savedClick === "open" || savedClick === "focus") {
      setClickAction(savedClick);
    }

    const savedFocusDisplay = getCookie("horse-tree-focus-display") as FocusDisplay;
    if (savedFocusDisplay === "dim" || savedFocusDisplay === "isolate") {
      setFocusDisplay(savedFocusDisplay);
    }

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

  // Persist filter choices (snapshot the current family set and gen span
  // alongside). The text search is session-only and never persisted.
  useEffect(() => {
    if (!filters) return;
    const present = familiesWithCounts(horses).map((f) => f.family);
    const gens = horses.map((h) => h.generation || 0);
    const spanMin = gens.length > 0 ? Math.min(...gens) : 0;
    const spanMax = gens.length > 0 ? Math.max(...gens) : 0;
    setCookie(
      "horse-tree-filters",
      JSON.stringify({
        ...filters,
        search: "",
        knownFamilies: present,
        knownGenMin: spanMin,
        knownGenMax: spanMax,
        version: TREE_FILTERS_VERSION,
      }),
      {
        maxAge: 60 * 60 * 24 * 30,
      },
    );
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

    // Update nodes with statusView, density, short-name, focus dim/ring data
    const newNodes = layoutNodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        ...(dimmedIds?.has(node.id) ? { opacity: 0.15 } : {}),
      },
      data: {
        ...node.data,
        activeView: view,
        statusView: statusView,
        density: density,
        shortName: shortNames.get(node.id) ?? node.data.horse.firstName,
        focused: node.id === focusId,
      }
    }));

    setNodes(newNodes);
    setEdges(visibleEdges);
  }, [view, statusView, density, shortNames, visibleNodes, visibleEdges, dimmedIds, focusId]);
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

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: HorseNode) => {
      if (clickAction === "focus") {
        // Re-clicking the focused horse clears the highlight.
        setFocusId((prev) => (prev === node.id ? null : node.id));
      } else {
        router.push(`/horses/${node.id}`);
      }
    },
    [clickAction, router],
  );

  // Escape clears the focus highlight.
  useEffect(() => {
    if (!focusId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusId]);

  return (
    <div className={styles.container}>
      <SearchBar horses={horses} colors={colors} onPick={handleSearchPick} />
      {hiddenPickId && (
        <div
          style={{
            position: "absolute",
            top: 64,
            left: 16,
            zIndex: 120,
            backgroundColor: vars.color.parchment,
            border: `1px solid ${vars.color.goldSoft}`,
            borderRadius: vars.borderRadius.md,
            boxShadow: vars.shadow.md,
            padding: `${vars.spacing.sm} ${vars.spacing.md}`,
            fontFamily: vars.font.display,
            color: vars.color.ink,
            display: "flex",
            alignItems: "center",
            gap: 12,
            maxWidth: "calc(100vw - 360px)",
          }}
        >
          <span>
            {(() => {
              const h = horses.find((x) => x.id === hiddenPickId);
              return h ? `${getHorseFullName(h)} is hidden by the active filters.` : "That horse is hidden by the active filters.";
            })()}
          </span>
          <button type="button" onClick={handleRevealPick} style={{ cursor: "pointer", fontWeight: 700 }}>
            Reveal
          </button>
          <button
            type="button"
            onClick={() => setHiddenPickId(null)}
            style={{ cursor: "pointer" }}
            aria-label="Dismiss hidden horse notice"
          >
            ×
          </button>
        </div>
      )}
      <ViewMenu
        setView={setView}
        view={view}
        statusView={statusView}
        setStatusView={setStatusView}
        density={density}
        setDensity={setDensity}
        colorMode={colorMode}
        setColorMode={setColorMode}
        clickAction={clickAction}
        setClickAction={handleClickActionChange}
        focusDisplay={focusDisplay}
        setFocusDisplay={handleFocusDisplayChange}
        horses={horses}
        focusId={focusId}
        setFocusId={setFocusId}
        filters={activeFilters}
        updateFilters={updateFilters}
        resetFilters={resetFilters}
        families={families}
        colors={colors}
        genBounds={genBounds}
        visibleCount={effectiveIds.size}
        totalCount={horses.length}
      />
      {focusHorse && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            backgroundColor: vars.color.parchment,
            border: `1px solid ${vars.color.goldSoft}`,
            borderRadius: vars.borderRadius.md,
            boxShadow: vars.shadow.md,
            padding: `${vars.spacing.sm} ${vars.spacing.md}`,
            fontFamily: vars.font.display,
            color: vars.color.ink,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>
            Focused on {getHorseFullName(focusHorse)} · {focusSet?.size ?? 0} horse{(focusSet?.size ?? 0) === 1 ? "" : "s"}
            {focusDisplay === "dim" && " (others faded)"}
          </span>
          <Link
            href={`/horses/${focusHorse.id}`}
            style={{ fontWeight: 700, color: "inherit" }}
          >
            Open page →
          </Link>
          <button
            type="button"
            onClick={() =>
              handleFocusDisplayChange(focusDisplay === "dim" ? "isolate" : "dim")
            }
            style={{ cursor: "pointer" }}
            title="Toggle between fading and hiding outsiders"
          >
            {focusDisplay === "dim" ? "Isolate" : "Show all faded"}
          </button>
          <button
            type="button"
            onClick={() => setFocusId(null)}
            style={{ cursor: "pointer", fontWeight: 700 }}
          >
            × Clear
          </button>
        </div>
      )}

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
        {focusHorse && (
          <span className={styles.legendRow}>
            <span
              className={styles.legendSwatch}
              style={{ backgroundColor: "#FFD700" }}
            />{" "}
            Halo — focused horse
          </span>
        )}
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
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.05}
        maxZoom={2.0}
        nodesDraggable={false}
        nodesConnectable={false}
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
      {effectiveIds.size === 0 && (
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
