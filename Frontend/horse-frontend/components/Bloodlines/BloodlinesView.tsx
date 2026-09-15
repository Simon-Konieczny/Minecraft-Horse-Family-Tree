"use client";

import { useMemo, useState } from "react";
import type { Horse } from "@/types/horse";
import type { Bloodline } from "@/lib/bloodlines";
import { filterHorsesByScope, generationCounts } from "@/utils/analytics";
import { buildFamilyRecords } from "@/utils/studbook";
import GenerationScopeBar, {
  type GenerationScopeValue,
} from "@/components/Common/GenerationScopeBar/GenerationScopeBar";
import FamilyRecords from "@/components/Bloodlines/FamilyRecords";
import HerdGenetics from "@/components/Bloodlines/HerdGenetics";

/**
 * Client wrapper owning the generation-scope filter for the bloodlines
 * chapter. Family records and all herd-genetics figures recompute from
 * the horses in scope. Set From to the earliest generation for cumulative
 * history up to To.
 */
export default function BloodlinesView({
  horses,
  bloodlines,
  colors,
}: {
  horses: Horse[];
  bloodlines: Bloodline[];
  colors: Record<string, string>;
}) {
  const genOptions = useMemo(
    () => generationCounts(horses).map((g) => g.generation),
    [horses],
  );
  const defaultScope: GenerationScopeValue = {
    from: genOptions.length > 0 ? genOptions[0] : 0,
    to: genOptions.length > 0 ? genOptions[genOptions.length - 1] : 0,
    status: "All",
  };
  const [scope, setScope] = useState<GenerationScopeValue>(defaultScope);

  const handleScopeChange = (next: GenerationScopeValue) => {
    setScope({
      from: Math.min(next.from, next.to),
      to: Math.max(next.from, next.to),
      status: next.status,
    });
  };

  const filtered = useMemo(
    () => filterHorsesByScope(horses, scope),
    [horses, scope],
  );
  const records = useMemo(() => buildFamilyRecords(filtered), [filtered]);

  return (
    <section>
      <GenerationScopeBar
        generations={genOptions}
        value={scope}
        inScopeCount={filtered.length}
        totalCount={horses.length}
        onChange={handleScopeChange}
        onReset={() => setScope(defaultScope)}
      />
      <FamilyRecords bloodlines={bloodlines} records={records} />
      <HerdGenetics horses={filtered} bloodlines={bloodlines} colors={colors} />
    </section>
  );
}
