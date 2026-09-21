import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { ClickAction, ColorMode, FocusDisplay, TreeOrientation, ViewMode } from "../HorseTreeView";
import { DENSITY_LABELS, DENSITY_LEVELS, NodeDensity } from "@/utils/layout";
import { ALL_STATUSES, applyTreeFilters, type TreeFilters } from "@/utils/treeFilters";
import { searchHorses } from "@/utils/horseSearch";
import type { FamilyCount } from "@/utils/studbook";
import type { Horse, HorseStatus } from "@/types/horse";
import { getHorseFullName } from "@/utils/horseNames";
import { FALLBACK_HEX_COLOR } from "@/utils/bloodlineValidation";
import * as styles from "./ViewMenu.css";
import { setCookie } from "cookies-next";
import { useReactFlow } from "@xyflow/react";
import Button from "@/components/Common/Button/Button";
import Switch from "@/components/Common/Switch/Switch";

interface ViewMenuProps {
  setView: Dispatch<SetStateAction<ViewMode>>;
  view: ViewMode;
  orientation: TreeOrientation;
  setOrientation: (mode: TreeOrientation) => void;
  statusView: boolean;
  setStatusView: Dispatch<SetStateAction<boolean>>;
  density: NodeDensity;
  setDensity: Dispatch<SetStateAction<NodeDensity>>;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  clickAction: ClickAction;
  setClickAction: (mode: ClickAction) => void;
  focusDisplay: FocusDisplay;
  setFocusDisplay: (mode: FocusDisplay) => void;
  horses: Horse[];
  focusId: string | null;
  setFocusId: Dispatch<SetStateAction<string | null>>;
  filters: TreeFilters;
  updateFilters: (patch: Partial<TreeFilters>) => void;
  resetFilters: () => void;
  families: FamilyCount[];
  colors: Record<string, string>;
  genBounds: { min: number; max: number };
  visibleCount: number;
  totalCount: number;
}

const LAYOUT_MODES = [
  { mode: "base", label: "Traditional" },
  { mode: "speed", label: "Speed" },
  { mode: "jump", label: "Jump" },
  { mode: "health", label: "Health" },
  { mode: "family", label: "Family Lanes" },
  { mode: "lineage", label: "Lineage" },
] as const;

const ORIENTATIONS: { mode: TreeOrientation; label: string; hint: string }[] = [
  { mode: "TB", label: "Top-Down", hint: "Generations flow downward." },
  { mode: "LR", label: "Left-Right", hint: "Generations flow rightward. Better for wide herds." },
];

const COLOR_MODES: { mode: ColorMode; label: string; hint: string }[] = [
  { mode: "stored", label: "Stored", hint: "Snapshot saved with each horse." },
  { mode: "live", label: "Blended", hint: "Live blend from the current registry colors." },
  { mode: "dominant", label: "Dominant", hint: "Flat dominant-bloodline color." },
];

const CLICK_ACTIONS: { mode: ClickAction; label: string; hint: string }[] = [
  { mode: "open", label: "Open", hint: "Clicking a horse opens its page." },
  { mode: "focus", label: "Focus", hint: "Clicking a horse highlights its ancestors and descendants in place." },
];

const FOCUS_DISPLAYS: { mode: FocusDisplay; label: string; hint: string }[] = [
  { mode: "dim", label: "Fade others", hint: "Outsiders stay in the tree, translucent." },
  { mode: "isolate", label: "Hide others", hint: "Outsiders are removed from the layout." },
];

export default function ViewMenu({
  setView,
  view,
  orientation,
  setOrientation,
  statusView,
  setStatusView,
  density,
  setDensity,
  colorMode,
  setColorMode,
  clickAction,
  setClickAction,
  focusDisplay,
  setFocusDisplay,
  horses,
  focusId,
  setFocusId,
  filters,
  updateFilters,
  resetFilters,
  families,
  colors,
  genBounds,
  visibleCount,
  totalCount,
}: ViewMenuProps) {
  const { fitView } = useReactFlow();
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"view" | "filters">("view");

  const toggleView = (mode: ViewMode) => {
    setView(mode);
    setCookie("horse-tree-view", mode, { maxAge: 60 * 60 * 24 * 30 }); // Save for 30 days

    setTimeout(() => fitView({ duration: 800 }), 50);
  };

  const handleStatusToggle = (checked: boolean) => {
    setStatusView(checked);
    setCookie("horse-status-view", checked ? "true" : "false", { maxAge: 60 * 60 * 24 * 30 });
  };

  const handleDensityChange = (level: NodeDensity) => {
    setDensity(level);
    setCookie("horse-node-density", level, { maxAge: 60 * 60 * 24 * 30 });
  };

  const handleColorChange = (mode: ColorMode) => {
    setColorMode(mode);
    setCookie("horse-tree-color", mode, { maxAge: 60 * 60 * 24 * 30 });
  };

  const focusOptions = [...horses]
    .map((h) => ({ id: h.id, name: getHorseFullName(h) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const refit = () => setTimeout(() => fitView({ duration: 800 }), 50);

  // Ranked search hits among the currently visible horses (other filter
  // dimensions still apply) for the match count + focus-first action.
  const searchHits = useMemo(
    () => searchHorses(horses, filters.search, 50),
    [horses, filters.search],
  );
  const visibleSearchHits = useMemo(() => {
    const visible = applyTreeFilters(horses, { ...filters, search: "" });
    return searchHits.filter((hit) => visible.has(String(hit.horse.id)));
  }, [horses, filters, searchHits]);
  const hasSearchQuery = filters.search.trim().length > 0;

  const focusFirstSearchHit = () => {
    const first = visibleSearchHits[0];
    if (!first) return;
    setFocusId(String(first.horse.id));
    setTimeout(
      () => fitView({ nodes: [{ id: String(first.horse.id) }], duration: 600, padding: 0.3 }),
      50,
    );
  };

  const toggleFamily = (family: string) => {
    const has = filters.families.includes(family);
    updateFilters({
      families: has
        ? filters.families.filter((f) => f !== family)
        : [...filters.families, family],
    });
    refit();
  };

  const toggleStatus = (status: HorseStatus) => {
    const has = filters.statuses.includes(status);
    updateFilters({
      statuses: has
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status],
    });
    refit();
  };

  const clampGen = (value: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.trunc(value), genBounds.min), genBounds.max);
  };

  const setGenBound = (which: "genMin" | "genMax", raw: string) => {
    const fallback = which === "genMin" ? genBounds.min : genBounds.max;
    let next = { ...filters, [which]: clampGen(parseInt(raw, 10), fallback) };
    if (next.genMin > next.genMax) {
      next = which === "genMin"
        ? { ...next, genMax: next.genMin }
        : { ...next, genMin: next.genMax };
    }
    updateFilters({ genMin: next.genMin, genMax: next.genMax });
    refit();
  };

  return (
    <>
      <button
        className={styles.toggleButton}
        onClick={() => setIsOpen(true)}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <span>⚙️</span> View Options
      </button>

      <div className={`${styles.menuWrapper} ${!isOpen ? styles.menuClosed : ''}`}>
        <div className={styles.menuHeader}>
          <p className={styles.menuLabel} style={{ marginBottom: 0 }}>Layout & View</p>
          <button className={styles.closeButton} onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className={styles.tabBar} role="tablist" aria-label="View menu pages">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "view"}
            onClick={() => setActiveTab("view")}
            className={activeTab === "view" ? styles.segmentActive : styles.segmentInactive}
          >
            View
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "filters"}
            onClick={() => setActiveTab("filters")}
            className={activeTab === "filters" ? styles.segmentActive : styles.segmentInactive}
          >
            Filters
          </button>
        </div>

        <div className={styles.menuBody}>
          {activeTab === "view" ? (
          <>
        <section className={styles.section} style={{ marginTop: 0 }}>
          <p className={styles.menuLabel}>Layout Mode</p>
          <div className={styles.segmentGrid}>
            {LAYOUT_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => toggleView(mode)}
                className={view === mode ? styles.segmentActive : styles.segmentInactive}
              >
                {label}
              </button>
            ))}
          </div>
          <p className={styles.sectionCaption} style={{ marginTop: 6 }}>
            Traditional draws the pedigree; stat modes reorder each
            generation row left to right. Family Lanes groups each
            bloodline into its own column. Lineage centers the focused
            horse with ancestors left and descendants right.
          </p>
        </section>

        <section className={styles.section}>
          <p className={styles.menuLabel}>Direction</p>
          <div className={styles.segmentGrid}>
            {ORIENTATIONS.map(({ mode, label, hint }) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setOrientation(mode); refit(); }}
                title={view === "lineage" ? "Lineage always flows left to right." : hint}
                disabled={view === "lineage"}
                className={orientation === mode ? styles.segmentActive : styles.segmentInactive}
              >
                {label}
              </button>
            ))}
          </div>
          <p className={styles.sectionCaption} style={{ marginTop: 6 }}>
            {view === "lineage"
              ? "Lineage always flows left to right."
              : "Left-Right turns generations into columns — better for wide herds."}
          </p>
        </section>

        <section className={styles.section}>
          <p className={styles.menuLabel}>Click action</p>
          <div className={styles.segmentGrid}>
            {CLICK_ACTIONS.map(({ mode, label, hint }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setClickAction(mode)}
                title={hint}
                className={clickAction === mode ? styles.segmentActive : styles.segmentInactive}
              >
                {label}
              </button>
            ))}
          </div>
          <p className={styles.sectionCaption} style={{ marginTop: 6 }}>
            {clickAction === "focus"
              ? "Click a horse to highlight its lineage. Click it again (or press Esc) to clear."
              : "Click a horse to open its page."}
          </p>
        </section>

        <section className={styles.section}>
          <p className={styles.menuLabel}>Focused outsiders</p>
          <div className={styles.segmentGrid}>
            {FOCUS_DISPLAYS.map(({ mode, label, hint }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFocusDisplay(mode)}
                title={hint}
                className={focusDisplay === mode ? styles.segmentActive : styles.segmentInactive}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.menuLabel}>Focus horse</p>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={focusId ?? ""}
              onChange={(e) => { setFocusId(e.target.value || null); refit(); }}
              aria-label="Focus lineage on a horse"
              className={styles.searchInput}
              style={{ flex: 1 }}
            >
              <option value="">Whole herd…</option>
              {focusOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            {focusId && (
              <button
                type="button"
                className={styles.resetTextButton}
                onClick={() => { setFocusId(null); refit(); }}
              >
                Clear
              </button>
            )}
          </div>
          <p className={styles.sectionCaption} style={{ marginTop: 6 }}>
            Isolates the focused horse plus its ancestors and descendants.
          </p>
        </section>

        <section className={styles.section}>
          <p className={styles.menuLabel}>Node color</p>
          <div className={styles.segmentGrid}>
            {COLOR_MODES.map(({ mode, label, hint }) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleColorChange(mode)}
                title={hint}
                className={colorMode === mode ? styles.segmentActive : styles.segmentInactive}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.menuLabel}>Nodes</p>
          <div className={styles.sectionBody}>
            <div>
              <p className={styles.menuLabel} style={{ margin: "0 0 4px" }}>
                Node Density: {DENSITY_LABELS[density]}
              </p>
              <input
                type="range"
                min={0}
                max={DENSITY_LEVELS.length - 1}
                step={1}
                value={DENSITY_LEVELS.indexOf(density)}
                onChange={(e) => handleDensityChange(DENSITY_LEVELS[Number(e.target.value)])}
                aria-label="Node density"
                title="Full: detailed cards. Compact: smaller cards. Minimal: name chips (hover for full name)."
                className={styles.densitySlider}
              />
              <div className={styles.sliderLabels}>
                {DENSITY_LEVELS.map((level) => (
                  <span key={level}>{DENSITY_LABELS[level]}</span>
                ))}
              </div>
            </div>
            <Switch
              label="Deceased Highlight"
              checked={statusView}
              onChange={handleStatusToggle}
            />
          </div>
        </section>

        <section className={styles.section}>
          <Button
            onClick={() => fitView({ duration: 800, padding: 0.2 })}
            className={styles.resetButton}
            text="🔍 Reset Zoom"
          />
        </section>
          </>
          ) : (
        <section className={styles.section} style={{ marginTop: 0 }}>
          <p className={styles.menuLabel}>Tree Filters</p>
          <div className={styles.sectionBody}>
            <div className={styles.countRow}>
              <span className={styles.countPill}>
                Showing {visibleCount} of {totalCount}
              </span>
              <button
                type="button"
                className={styles.resetTextButton}
                onClick={() => { resetFilters(); refit(); }}
              >
                Reset
              </button>
            </div>
            <input
              type="search"
              placeholder="Search names, families, gen:2, speed>12…"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              aria-label="Search horses by name, family, generation, or stats"
              className={styles.searchInput}
            />
            {hasSearchQuery && (
              <div className={styles.countRow}>
                <span className={styles.countPill}>
                  {visibleSearchHits.length} search match{visibleSearchHits.length === 1 ? "" : "es"}
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={styles.resetTextButton}
                    onClick={() => updateFilters({ search: "" })}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className={styles.resetTextButton}
                    onClick={focusFirstSearchHit}
                    disabled={visibleSearchHits.length === 0}
                    title={visibleSearchHits.length === 0 ? "No visible matches to focus" : "Highlight the lineage of the top match and fly to it"}
                  >
                    Focus first
                  </button>
                </span>
              </div>
            )}
            <div>
              <p className={styles.menuLabel} style={{ margin: "4px 0" }}>Bloodlines</p>
              <div className={styles.scrollList}>
                {families.map((f) => (
                  <label key={f.family} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    className={styles.checkBox}
                    checked={filters.families.includes(f.family)}
                    onChange={() => toggleFamily(f.family)}
                  />
                    <span
                      className={styles.checkDot}
                      style={{ backgroundColor: colors[f.family] || FALLBACK_HEX_COLOR }}
                    />
                    {f.family} ({f.count})
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className={styles.menuLabel} style={{ margin: "4px 0" }}>Status</p>
              {ALL_STATUSES.map((status) => (
                <label key={status} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    className={styles.checkBox}
                    checked={filters.statuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                  />
                  {status}
                </label>
              ))}
            </div>
            <div>
              <p className={styles.menuLabel} style={{ margin: "4px 0" }}>Generations</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  aria-label="Minimum generation"
                  min={genBounds.min}
                  max={genBounds.max}
                  value={filters.genMin}
                  onChange={(e) => setGenBound("genMin", e.target.value)}
                  className={styles.numberInput}
                />
                <span style={{ fontSize: 13, opacity: 0.7 }}>to</span>
                <input
                  type="number"
                  aria-label="Maximum generation"
                  min={genBounds.min}
                  max={genBounds.max}
                  value={filters.genMax}
                  onChange={(e) => setGenBound("genMax", e.target.value)}
                  className={styles.numberInput}
                />
              </div>
            </div>
          </div>
        </section>
          )}
        </div>

        <div className={styles.pagerFooter}>
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "view" ? "filters" : "view")}
            className={styles.segmentInactive}
            style={{ width: "auto", padding: "7px 12px" }}
          >
            {activeTab === "view" ? "Filters →" : "← View"}
          </button>
          <span className={styles.pageIndicator} aria-live="polite">
            {activeTab === "view" ? "1 / 2" : "2 / 2"}
          </span>
        </div>
      </div>
    </>
  );
}
