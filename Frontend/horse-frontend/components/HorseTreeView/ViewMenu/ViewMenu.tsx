import { Dispatch, SetStateAction, useState } from "react";
import { ViewMode } from "../HorseTreeView";
import { DENSITY_LABELS, DENSITY_LEVELS, NodeDensity } from "@/utils/layout";
import { ALL_STATUSES, type TreeFilters } from "@/utils/treeFilters";
import type { FamilyCount } from "@/utils/studbook";
import type { HorseStatus } from "@/types/horse";
import * as styles from "./ViewMenu.css";
import { setCookie } from "cookies-next";
import { useReactFlow } from "@xyflow/react";
import Button from "@/components/Common/Button/Button";
import Switch from "@/components/Common/Switch/Switch";

interface ViewMenuProps {
  setView: Dispatch<SetStateAction<ViewMode>>;
  view: ViewMode;
  statusView: boolean;
  setStatusView: Dispatch<SetStateAction<boolean>>;
  density: NodeDensity;
  setDensity: Dispatch<SetStateAction<NodeDensity>>;
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
] as const;

export default function ViewMenu({
  setView,
  view,
  statusView,
  setStatusView,
  density,
  setDensity,
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

  const refit = () => setTimeout(() => fitView({ duration: 800 }), 50);

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
            generation row left to right.
          </p>
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
              placeholder="Search names…"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              aria-label="Search horses by name"
              className={styles.searchInput}
            />
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
                      style={{ backgroundColor: colors[f.family] || "#94a3b8" }}
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

        <section className={styles.section}>
          <Button
            onClick={() => fitView({ duration: 800, padding: 0.2 })}
            className={styles.resetButton}
            text="🔍 Reset Zoom"
          />
        </section>
      </div>
    </>
  );
}
