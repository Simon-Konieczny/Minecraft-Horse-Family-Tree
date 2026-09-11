import { Horse } from "@/types/horse";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import * as modalStyles from "../Modals.css";
import * as styles from "./HorseEditModal.css";
import * as createFormStyles from "../HorseCreateModal/CreateHorseForm/CreateHorseForm.css";
import Button from "@/components/Common/Button/Button";
import Switch from "@/components/Common/Switch/Switch";
import { translateStat, untranslateStat } from "@/utils/translateRawStats";
import { HorseStats } from "@/utils/parseHorseStats";
import StatsBox from "@/components/Common/StatsBox/StatsBox";
import StatRow from "../StatRow/StatRow";
import VariantSelector from "@/components/Common/VariantSelector/VariantSelector";
import { getDescendantIds } from "@/utils/lineage";
import { getHorseFullName } from "@/utils/horseNames";
import { ancestryOverlap } from "@/utils/analytics";
import { useHiddenBloodlineSlugs } from "@/components/Bloodlines/BloodlineProvider";
import { bloodlineSlug } from "@/utils/bloodlineValidation";

import * as statRowStyles from "../StatRow/StatRow.css";

interface HorseEditModalProps {
  horse: Horse;
  horses: Horse[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedHorse: Horse) => void;
}

export default function HorseEditModal({
  horse,
  horses,
  isOpen,
  onClose,
  onSave,
}: HorseEditModalProps) {
  const [formData, setFormData] = useState({ ...horse });
  const [rawStatsView, setRawStatsView] = useState(false);
  const [displayStats, setDisplayStats] = useState({
    speed: translateStat("speed", horse.speed).toString(),
    health: translateStat("health", horse.health).toString(),
    jump: translateStat("jump", horse.jump).toString(),
  });

  useEffect(() => {
    setDisplayStats({
      speed: (rawStatsView ? formData.speed : translateStat("speed", formData.speed)).toString(),
      health: (rawStatsView ? formData.health : translateStat("health", formData.health)).toString(),
      jump: (rawStatsView ? formData.jump : translateStat("jump", formData.jump)).toString(),
    });
  }, [formData.speed, formData.health, formData.jump, rawStatsView]);

  const handleTextChange = (field: string, textValue: string) => {
    setDisplayStats((prev) => ({ ...prev, [field]: textValue }));

    const numericValue = parseFloat(textValue);
    if (!isNaN(numericValue)) {
      setFormData((prev) => ({
        ...prev,
        [field]: rawStatsView ? numericValue : untranslateStat(field, numericValue),
      }));
    }
  };

  // A horse can never be parented to itself or to one of its own
  // descendants — those options would loop the family tree.
  const blockedIds = useMemo(
    () => getDescendantIds(horses, horse.id),
    [horses, horse.id],
  );
  const parentOptions = useMemo(
    () =>
      horses
        .filter((h) => h.id !== horse.id && !blockedIds.has(h.id))
        .map((h) => ({
          value: h.id.toString(),
          label: getHorseFullName(h),
        })),
    [horses, horse.id, blockedIds],
  );

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

  if (!isOpen) return null;

  const onCancel = () => {
    setFormData({ ...horse });
    onClose();
  };

  const statusOptions = [
    { value: "Alive", label: "Alive" },
    { value: "Deceased", label: "Deceased" },
    { value: "Retired", label: "Retired" },
  ];

  const handleImportedStats = (newStats: HorseStats) => {
    setFormData((prev) => ({
      ...prev,
      speed: newStats.speed,
      health: newStats.health,
      jump: newStats.jump,
      variant: newStats.variant,
    }));
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleViewChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRawStatsView(!event.target.checked);
  };

  return (
    <div className={modalStyles.overlay}>
      <div className={modalStyles.modal}>
        <h2>Edit Horse</h2>
        <div className={createFormStyles.container} style={{ margin: 0, padding: 0 }}>
          <div className={createFormStyles.nameRow}>
            <label className={createFormStyles.label}>First Name</label>
            <input
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              placeholder="First name"
              className={createFormStyles.nameField}
            />
          </div>
          <div className={createFormStyles.nameRow}>
            <label className={createFormStyles.label}>Family Name</label>
            <input
              value={formData.familyName}
              list="edit-family-name-options"
              onChange={(e) => handleChange("familyName", e.target.value)}
              placeholder="Family name"
              className={createFormStyles.nameField}
            />
            <datalist id="edit-family-name-options">
              {knownFamilies.map((family) => (
                <option key={family} value={family} />
              ))}
            </datalist>
          </div>

          {rawStatsView && <StatsBox onStatsParsed={handleImportedStats} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {parentOptions.length > 1 && (
              <>
                <label className={statRowStyles.label}>Parent 1</label>
                <Select
                  options={parentOptions}
                  isClearable={false}
                  defaultValue={parentOptions.find(
                    (opt) => opt.value === horse.parentId1,
                  )}
                  onChange={(selected) => {
                    if (selected) {
                      handleChange("parentId1", selected.value);
                    }
                  }}
                  menuPortalTarget={null}
                />
                <label className={statRowStyles.label}>Parent 2</label>
                <Select
                  options={parentOptions}
                  defaultValue={parentOptions.find(
                    (opt) => opt.value === horse.parentId2,
                  )}
                  onChange={(selected) => {
                    if (selected) {
                      handleChange("parentId2", selected.value);
                    }
                  }}
                  menuPortalTarget={null}
                />
              </>
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
            <label className={statRowStyles.label}>Status</label>
                <Select
                  options={statusOptions}
                  defaultValue={statusOptions.find(
                    (opt) => opt.value === horse.status,
                  )}
              onChange={(selected) => {
                if (selected) {
                  handleChange("status", selected.value);
                }
              }}
              menuPortalTarget={null}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <Switch
              label={rawStatsView ? "Raw Stats" : "Processed Stats"}
              checked={!rawStatsView}
              onChange={(checked) => setRawStatsView(!checked)}
              labelLeft={false}
            />
          </div>

          <VariantSelector 
            selectedVariant={formData.variant} 
            onChange={(v) => handleChange("variant", v)} 
          />

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
        <div className={styles.buttonRow}>
          <Button onClick={onCancel} text="Cancel" />
          <Button onClick={() => onSave(formData)} text="Save Changes" />
        </div>
      </div>
    </div>
  );
}
