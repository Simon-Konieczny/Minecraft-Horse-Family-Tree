"use client";
import { Horse } from "@/types/horse";
import { HorseStats } from "@/utils/parseHorseStats";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import * as styles from "./CreateHorseForm.css";
import StatsBox from "@/components/Common/StatsBox/StatsBox";
import Switch from "@/components/Common/Switch/Switch";
import { untranslateStat, formatStatsForView } from "@/utils/translateRawStats";
import StatRow from "../../StatRow/StatRow";
import { createHorseData } from "../HorseCreateModal";
import VariantSelector from "@/components/Common/VariantSelector/VariantSelector";
import { getHorseFullName } from "@/utils/horseNames";
import { getSurnameFromDna, mergeDna } from "@/utils/genetics/utils";
import FounderBloodlinePicker from "@/components/Bloodlines/FounderBloodlinePicker";
import { ancestryOverlap } from "@/utils/analytics";
import { useHiddenBloodlineSlugs } from "@/components/Bloodlines/BloodlineProvider";
import FamilyNameBloodlineLink from "@/components/Bloodlines/FamilyNameBloodlineLink";
import { bloodlineSlug } from "@/utils/bloodlineValidation";

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
  const [statsView, setStatsView] = useState(true);
  const [displayStats, setDisplayStats] = useState(() =>
    formatStatsForView(formData.speed, formData.health, formData.jump, true),
  );

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
      // Pasted CustomName fills blank name fields only — never clobbers
      // typed values (same overwritable philosophy as the DNA suggestion).
      firstName:
        (prev.firstName || "").trim() || !newStats.firstName
          ? prev.firstName
          : newStats.firstName,
      familyName:
        (prev.familyName || "").trim() || !newStats.familyName
          ? prev.familyName
          : newStats.familyName,
    }));
    // The text fields mirror the import immediately (no sync effect).
    setDisplayStats(
      formatStatsForView(newStats.speed, newStats.health, newStats.jump, statsView),
    );
  };

  const handleStatsViewChange = (checked: boolean) => {
    const rawView = !checked;
    setStatsView(rawView);
    setDisplayStats(
      formatStatsForView(formData.speed, formData.health, formData.jump, rawView),
    );
  };

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

  // Known families for autocomplete (DNA-derived names in the DB,
  // minus hidden bloodlines).
  const hiddenSlugs = useHiddenBloodlineSlugs();
  const knownFamilies = useMemo(
    () =>
      Array.from(
        new Set(
          horses
            .map((h) => (h.familyName || "").trim())
            .filter(
              (f) => f && !hiddenSlugs.includes(bloodlineSlug(f)),
            ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [horses, hiddenSlugs],
  );

  // Live DNA suggestion: once both parents are picked, suggest the foal's
  // family name from the merged DNA. Overwritable — typing keeps your value.
  const dnaSuggestion = useMemo(() => {
    const sire = horses.find((h) => h.id.toString() === formData.parentId1);
    const dam = horses.find((h) => h.id.toString() === formData.parentId2);
    if (!sire || !dam) return "";
    return getSurnameFromDna(mergeDna(sire.dna, dam.dna));
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

  // Live inbreeding flag (never a block — see breeding policy).
  const overlap = useMemo(() => {
    if (
      !formData.parentId1 ||
      !formData.parentId2 ||
      formData.parentId1 === formData.parentId2
    ) {
      return null;
    }
    return ancestryOverlap(horses, formData.parentId1, formData.parentId2);
  }, [horses, formData.parentId1, formData.parentId2]);

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
          <FamilyNameBloodlineLink familyName={formData.familyName} />

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
          {!formData.parentId1 && !formData.parentId2 && (
            <div>
              <label className={styles.label}>Founder Bloodline</label>
              <FounderBloodlinePicker
                value={formData.originBloodline}
                onChange={(v) => handleSelectChange("originBloodline", v)}
              />
            </div>
          )}
          {overlap && (
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {overlap.shared > 0 ? (
                <span>
                  Shared ancestry (3 gens): {overlap.shared} ancestor
                  {overlap.shared === 1 ? "" : "s"},{" "}
                  {(overlap.pct * 100).toFixed(0)}% overlap — allowed,
                  flagged for review.
                </span>
              ) : (
                <span>No shared ancestry in the last 3 generations.</span>
              )}
            </div>
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
              onChange={handleStatsViewChange}
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
