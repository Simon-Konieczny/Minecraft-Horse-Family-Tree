"use client";
import { Horse } from "@/types/horse";
import { HorseStats } from "@/utils/parseHorseStats";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import * as styles from "./CreateHorseForm.css";
import StatsBox from "@/components/Common/StatsBox/StatsBox";
import Switch from "@/components/Common/Switch/Switch";
import { translateStat, untranslateStat } from "@/utils/translateRawStats";
import StatRow from "../../StatRow/StatRow";
import { createHorseData } from "../HorseCreateModal";
import VariantSelector from "@/components/Common/VariantSelector/VariantSelector";
import { getHorseFullName } from "@/utils/horseNames";
import { getSurnameFromDna, mergeDna } from "@/utils/genetics/utils";

export interface CreateHorseFormProps {
  horses: Horse[];
  setError: (val: boolean) => void;
  formData: createHorseData;
  setFormData: Dispatch<SetStateAction<createHorseData>>;
}

export default function CreateHorseForm({
  horses,
  formData,
  setFormData,
}: CreateHorseFormProps) {
  const [statsView, setStatsView] = useState(false);
  const [displayStats, setDisplayStats] = useState({
    speed: translateStat("speed", formData.speed).toString(),
    health: translateStat("health", formData.health).toString(),
    jump: translateStat("jump", formData.jump).toString(),
  });

  const handleSelectChange = (
    field: keyof createHorseData,
    value: string | number | undefined,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
  };

  const handleImportedStats = (newStats: HorseStats) => {
    setFormData((prev) => ({
      ...prev,
      speed: newStats.speed,
      health: newStats.health,
      jump: newStats.jump,
      variant: newStats.variant,
    }));
  };

  useEffect(() => {
    setDisplayStats({
      speed: (statsView ? formData.speed : translateStat("speed", formData.speed)).toString(),
      health: (statsView ? formData.health : translateStat("health", formData.health)).toString(),
      jump: (statsView ? formData.jump : translateStat("jump", formData.jump)).toString(),
    });
  }, [formData.speed, formData.health, formData.jump, statsView]);

  const handleTextChange = (
    field: string,
    textValue: string,
  ) => {
    setDisplayStats((prev) => ({ ...prev, [field]: textValue }));

    const numericValue = parseFloat(textValue);
    if (!isNaN(numericValue)) {
      setFormData((prev) => ({
        ...prev,
        [field]: statsView ? numericValue : untranslateStat(field, numericValue),
      }));
    }
  };

  const parentOptions = horses.map((horse) => ({
    value: horse.id.toString(),
    label: getHorseFullName(horse),
  }));
  const statusOptions = [
    { value: "Alive", label: "Alive" },
    { value: "Deceased", label: "Deceased" },
    { value: "Retired", label: "Retired" },
  ];

  // Known families for autocomplete (derived from DNA-derived names in the DB).
  const knownFamilies = useMemo(
    () =>
      Array.from(
        new Set(
          horses.map((h) => (h.familyName || "").trim()).filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [horses],
  );

  // Live DNA suggestion: once both parents are picked, suggest the foal's
  // family name from the merged DNA. Overwritable — typing keeps your value.
  const dnaSuggestion = useMemo(() => {
    const sire = horses.find((h) => h.id.toString() === formData.parentId1);
    const dam = horses.find((h) => h.id.toString() === formData.parentId2);
    if (!sire || !dam) return "";
    return getSurnameFromDna(mergeDna(sire.dna, dam.dna), {
      sireDna: sire.dna,
    });
  }, [horses, formData.parentId1, formData.parentId2]);

  const prevSuggestion = useRef("");
  useEffect(() => {
    if (
      dnaSuggestion &&
      (formData.familyName === "" || formData.familyName === prevSuggestion.current)
    ) {
      setFormData((prev) => ({ ...prev, familyName: dnaSuggestion }));
    }
    prevSuggestion.current = dnaSuggestion;
  }, [dnaSuggestion, formData.familyName, setFormData]);

  return (
    <div className={styles.container}>
      <form>
        <div className={styles.fields}>
          <div className={styles.nameRow}>
            <label className={styles.label}>First Name</label>
            <input
              value={formData.firstName}
              onChange={(e) => setFormData((prev: createHorseData) => ({...prev, firstName: e.target.value}))}
              placeholder="First name"
              className={styles.nameField}
            />
          </div>
          <div className={styles.nameRow}>
            <label className={styles.label}>Family Name</label>
            <input
              value={formData.familyName}
              list="family-name-options"
              onChange={(e) => setFormData((prev: createHorseData) => ({...prev, familyName: e.target.value}))}
              placeholder={dnaSuggestion || "Family name"}
              className={styles.nameField}
            />
            <datalist id="family-name-options">
              {knownFamilies.map((family) => (
                <option key={family} value={family} />
              ))}
            </datalist>
          </div>
          {dnaSuggestion && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              DNA suggestion: {dnaSuggestion} — you can overwrite it.
            </div>
          )}

          {statsView && <StatsBox onStatsParsed={handleImportedStats} />}

          {parentOptions.length > 1 && (
            <>
              <Select
                options={parentOptions}
                placeholder="Parent 1"
                value={parentOptions.find(o => o.value === formData.parentId1)}
                onChange={(val) => handleSelectChange("parentId1", val?.value)}
                className={styles.field}
                menuPortalTarget={null}
              />
              <Select
                options={parentOptions}
                placeholder="Parent 2"
                value={parentOptions.find(o => o.value === formData.parentId2)}
                onChange={(val) => handleSelectChange("parentId2", val?.value)}
                className={styles.field}
                menuPortalTarget={null}
              />
            </>
          )}

          <Select
            options={statusOptions}
            placeholder="Status"
            value={statusOptions.find(o => o.value === formData.status)}
            onChange={(val) => handleSelectChange("status", val?.value)}
            className={styles.field}
            menuPortalTarget={null}
          />

          <VariantSelector 
            selectedVariant={formData.variant} 
            onChange={(v) => handleSelectChange("variant", v)} 
          />

          <div style={{ marginTop: '16px' }}>
            <Switch
              label={statsView ? "Raw Stats" : "Processed Stats"}
              checked={!statsView}
              onChange={(checked) => setStatsView(!checked)}
              labelLeft={false}
            />
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <StatRow
              text="Speed"
              fieldName="speed"
              displayStats={displayStats}
              handleTextChange={handleTextChange}
            />
            <StatRow
              text="Health"
              fieldName="health"
              displayStats={displayStats}
              handleTextChange={handleTextChange}
            />
            <StatRow
              text="Jump"
              fieldName="jump"
              displayStats={displayStats}
              handleTextChange={handleTextChange}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
