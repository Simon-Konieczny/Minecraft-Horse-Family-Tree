"use client";

import { useMemo } from "react";
import Select from "react-select";
import { useBloodlines } from "@/components/Bloodlines/BloodlineProvider";

interface BloodlineOption {
  value: string;
  label: string;
  hexColor: string;
}

/**
 * Explicit bloodline choice for founder (parentless) horses. The parent
 * decides visibility: rendered only when both parent slots are empty, so
 * horses with parents always keep inherited DNA. Clearing the pick falls
 * back to surname auto-seed, then Unknown.
 */
export default function FounderBloodlinePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const bloodlines = useBloodlines();
  const options = useMemo<BloodlineOption[]>(
    () =>
      bloodlines
        .filter((b) => !b.hidden)
        .map((b) => ({ value: b.name, label: b.name, hexColor: b.hexColor })),
    [bloodlines],
  );

  const selected = options.find((o) => o.value === value) ?? null;

  const dot = (hexColor: string) => (
    <span
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 3,
        backgroundColor: hexColor,
        marginRight: 8,
        verticalAlign: "baseline",
      }}
    />
  );

  return (
    <div>
      <Select<BloodlineOption>
        options={options}
        isClearable
        placeholder="Founder bloodline (optional)"
        value={selected}
        onChange={(opt) => onChange(opt?.value ?? "")}
        menuPortalTarget={null}
        formatOptionLabel={(opt) => (
          <span>
            {dot(opt.hexColor)}
            {opt.label}
          </span>
        )}
      />
      {selected && (
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          {dot(selected.hexColor)}
          Purebred of House {selected.label} — DNA 100%.
        </div>
      )}
    </div>
  );
}
