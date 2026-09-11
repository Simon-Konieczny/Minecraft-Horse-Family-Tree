"use client";
import { Horse } from "@/types/horse";
import { useRouter } from "next/navigation";
import * as styles from "./HorsePage.css";
import { translateStat, translateStatsForDisplay } from "@/utils/translateRawStats";
import { ChartCard, Donut, Radar } from "@/components/Charts/Charts";
import * as chartStyles from "@/components/Charts/Charts.css";
import Button from "../Common/Button/Button";
import HorsePageHeader from "./HorsePageHeader/HorsePageHeader";
import StatsShapeGrid from "./StatsShapeGrid/StatsShapeGrid";
import DetailsCard from "./DetailsCard/DetailsCard";
import { useState, useEffect } from "react";
import HorseEditModal from "@/components/Modals/HorseEditModal/HorseEditModal";
import editHorseAction from "@/actions/editHorseAction";
import HorseDeleteModal from "@/components/Modals/HorseDeleteModal/HorseDeleteModal";
import deleteHorseAction from "@/actions/deleteHorseAction";
import { getHorseFullName } from "@/utils/horseNames";
import { Folio } from "@/components/Book/Book";

export default function HorsePage({
  horse,
  horses,
  colors,
}: {
  horse: Horse;
  horses: Horse[];
  colors: Record<string, string>;
}) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const onEditClick = () => {
    setSaveError(null);
    setEditMode(!editMode);
  };

  const onDeleteClick = () => {
    setDeleteMode(true);
  };

  const onBackClick = () => {
    router.back();
  };
  const horseColor = horse.hexColor || "#1e293b";
  const { jump, health, speed, variant } = horse;
  const processedStats = translateStatsForDisplay({
    jump,
    health,
    speed,
    variant,
  });

  const onSaveEdits = async (formData: Horse, originBloodline?: string) => {
    if ((!!formData.parentId1 && !formData.parentId2) || (!formData.parentId1 && !!formData.parentId2)) {
      setSaveError("Record two parents, or none for a founder.");
      return;
    }
    try {
      await editHorseAction(horse, formData, originBloodline);
      setSaveError(null);
      setEditMode(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save changes.");
      console.error(err);
    }
  };

  const onDeleteConfirm = async () => {
    await deleteHorseAction(horse.id);
    router.push("/horses");
  };

  const parentNameOf = (id?: string) => {
    if (!id) return "None";
    const parent = horses.find((h) => h.id === id);
    return parent ? getHorseFullName(parent) : "Unknown";
  };
  const parent1Name = parentNameOf(horse.parentId1);
  const parent2Name = parentNameOf(horse.parentId2);

  // Herd-relative radar: this horse's translated stats against herd min/max.
  const mySpeed = translateStat("speed", horse.speed);
  const myJump = translateStat("jump", horse.jump);
  const myHealth = translateStat("health", horse.health);
  const herdValues = (field: "speed" | "jump" | "health") =>
    horses
      .map((h) => translateStat(field, h[field]))
      .filter((v) => Number.isFinite(v));
  const rangeOf = (values: number[]) =>
    values.length > 0
      ? { min: Math.min(...values), max: Math.max(...values) }
      : { min: 0, max: 0 };
  const speedRange = rangeOf(herdValues("speed"));
  const jumpRange = rangeOf(herdValues("jump"));
  const healthRange = rangeOf(herdValues("health"));
  const radarAxes = [
    {
      label: "Speed",
      value: mySpeed,
      ...speedRange,
      display: `${mySpeed.toFixed(2)} m/s`,
    },
    {
      label: "Jump",
      value: myJump,
      ...jumpRange,
      display: `${myJump.toFixed(2)} blocks`,
    },
    {
      label: "Health",
      value: myHealth,
      ...healthRange,
      display: `${myHealth.toFixed(1)} hp`,
    },
  ];

  // DNA breakdown for the donut.
  const dnaSegments = Object.entries(horse.dna || {})
    .filter((entry): entry is [string, number] => {
      const weight = entry[1];
      return typeof weight === "number" && Number.isFinite(weight) && weight > 0;
    })
    .map(([bloodline, weight]) => ({
      label: bloodline,
      value: Math.round(weight * 100) / 100,
      color: colors[bloodline] || "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);

  // Ancestor comparison: this horse vs the average of its known parents.
  const sire = horses.find((h) => h.id === horse.parentId1);
  const dam = horses.find((h) => h.id === horse.parentId2);
  const knownParents = [sire, dam].filter((p): p is Horse => !!p);
  const parentAvg = (field: "speed" | "jump" | "health"): number | null => {
    const values = knownParents
      .map((p) => translateStat(field, p[field]))
      .filter((v) => Number.isFinite(v));
    return values.length > 0
      ? values.reduce((t, v) => t + v, 0) / values.length
      : null;
  };
  const comparisons = [
    { label: "Speed", mine: mySpeed, parent: parentAvg("speed"), decimals: 2, unit: "m/s" },
    { label: "Jump", mine: myJump, parent: parentAvg("jump"), decimals: 2, unit: "blocks" },
    { label: "Health", mine: myHealth, parent: parentAvg("health"), decimals: 1, unit: "hp" },
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("recently-viewed-horses");
      let viewed: string[] = stored ? JSON.parse(stored) : [];
      
      // Remove current id if it already exists to move it to the front
      viewed = viewed.filter(id => id !== horse.id);
      
      // Add current id to the front
      viewed.unshift(horse.id);
      
      // Limit to 10
      const updated = viewed.slice(0, 10);
      
      localStorage.setItem("recently-viewed-horses", JSON.stringify(updated));
      
      // Dispatch a storage event so the sidebar can update immediately
      window.dispatchEvent(new Event("storage"));
    }
  }, [horse.id]);

  return (
    <main className={styles.pageWrapper}>
      <div className={styles.buttonRow}>
        <Button onClick={onBackClick} text="⬅ Back" />

        <div className={styles.buttonRow}>
          <Button onClick={onEditClick} text="Edit" />
          <Button
            onClick={onDeleteClick}
            text="Delete"
            className={styles.deleteButton}
          />
        </div>
      </div>

      <HorseEditModal
        horse={horse}
        horses={horses}
        isOpen={editMode}
        onClose={() => setEditMode(false)}
        onSave={onSaveEdits}
      />
      {saveError && <div role="alert">{saveError}</div>}

      <HorseDeleteModal
        isOpen={deleteMode}
        onClose={() => setDeleteMode(false)}
        onConfirm={onDeleteConfirm}
      />

      <HorsePageHeader horse={horse} horseColor={horseColor} />

      <StatsShapeGrid
        horse={horse}
        processedStats={processedStats}
        horseColor={horseColor}
      />

      <DetailsCard
        horse={horse}
        processedStats={processedStats}
        parent1Name={parent1Name}
        parent2Name={parent2Name}
      />

      <div className={chartStyles.chartGrid} style={{ marginTop: 24 }}>
        <ChartCard title="Stat Radar — vs Herd">
          <Radar axes={radarAxes} color={horseColor} />
          <p className={chartStyles.mutedNote}>
            Herd-relative: each axis spans the herd&apos;s min to max.
          </p>
        </ChartCard>
        <ChartCard title="DNA Breakdown">
          {dnaSegments.length > 0 ? (
            <Donut segments={dnaSegments} />
          ) : (
            <p className={chartStyles.mutedNote}>No DNA recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <div style={{ marginTop: 24 }}>
        <ChartCard title="Ancestor Comparison — vs Sire & Dam">
          {knownParents.length > 0 ? (
            <table className={chartStyles.ledgerTable}>
              <thead>
                <tr>
                  <th className={chartStyles.ledgerTh}>Stat</th>
                  <th className={chartStyles.ledgerTh}>This Horse</th>
                  <th className={chartStyles.ledgerTh}>Parents Avg</th>
                  <th className={chartStyles.ledgerTh}>Δ</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c) => {
                  const delta = c.parent !== null ? c.mine - c.parent : null;
                  const arrow =
                    delta === null ? "—" : delta > 0 ? "▲" : delta < 0 ? "▼" : "＝";
                  const color =
                    delta === null || delta === 0
                      ? "inherit"
                      : delta > 0
                        ? "#2d4a3e"
                        : "#8f2d22";
                  return (
                    <tr key={c.label}>
                      <td className={chartStyles.ledgerTd}>{c.label}</td>
                      <td className={chartStyles.ledgerTd}>
                        {c.mine.toFixed(c.decimals)} {c.unit}
                      </td>
                      <td className={chartStyles.ledgerTd}>
                        {c.parent !== null
                          ? `${c.parent.toFixed(c.decimals)} ${c.unit}`
                          : "—"}
                      </td>
                      <td
                        className={chartStyles.ledgerTd}
                        style={{ color, fontWeight: 700 }}
                      >
                        {delta !== null
                          ? `${(delta >= 0 ? "+" : "") + delta.toFixed(c.decimals)} ${arrow}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className={chartStyles.mutedNote}>
              Parents unknown — the comparison appears once parents are recorded.
            </p>
          )}
        </ChartCard>
      </div>
      <Folio text={`Entry · ${getHorseFullName(horse)}`} />
    </main>
  );
}
