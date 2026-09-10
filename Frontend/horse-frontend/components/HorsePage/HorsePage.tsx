"use client";
import { Horse } from "@/types/horse";
import { useRouter } from "next/navigation";
import * as styles from "./HorsePage.css";
import { translateStatsForDisplay } from "@/utils/translateRawStats";
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

export default function HorsePage({
  horse,
  horses,
}: {
  horse: Horse;
  horses: Horse[];
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

  const onSaveEdits = async (formData: Horse) => {
    try {
      await editHorseAction(horse, formData);
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
    </main>
  );
}
