"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Horse } from "@/types/horse";
import type { PlannedPair } from "@/utils/analytics";
import {
  breedingPairKey,
  clearBreedingTicks,
  createBreedingRun,
  loadBreedingRuns,
  MAX_BREEDING_RUNS,
  removeBreedingPair,
  renameBreedingRun,
  saveBreedingRuns,
  setBreedingPairDone,
  suggestBreedingRunLabel,
  type BreedingRun,
} from "@/utils/breedingRuns";
import PairingPlanner from "@/components/Breeding/PairingPlanner";
import BreedingChecklist from "@/components/Breeding/BreedingChecklist";

interface BreedingBoardProps {
  horses: Horse[];
  colors: Record<string, string>;
  pairs: PlannedPair[];
  benched: string | null;
  triedKeys: string[];
  policyBlocksRelatives: boolean;
}

export default function BreedingBoard({
  horses,
  colors,
  pairs,
  benched,
  triedKeys,
  policyBlocksRelatives,
}: BreedingBoardProps) {
  const [runs, setRuns] = useState<BreedingRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Mount-only load: localStorage is unavailable during SSR, so the
  // stored runs hydrate after first paint. Suppression justified below:
  // one-shot external-store hydration, not a render loop.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = loadBreedingRuns(
      typeof window !== "undefined" ? window.localStorage : null,
    );
    setRuns(stored);
    setActiveRunId(stored.length > 0 ? stored[0].id : null);
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist after hydration.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    saveBreedingRuns(window.localStorage, runs);
  }, [runs, hydrated]);

  const byId = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);

  const livePairKeys = useMemo(
    () =>
      pairs
        .filter((p) => byId.has(p.sireId) && byId.has(p.damId))
        .map((p) => breedingPairKey(p.sireId, p.damId)),
    [pairs, byId],
  );

  const handleSnapshot = useCallback(() => {
    const valid = pairs.filter((p) => byId.has(p.sireId) && byId.has(p.damId));
    if (valid.length === 0) return;
    const label = suggestBreedingRunLabel(horses.map((h) => h.generation));
    const run = createBreedingRun(
      valid.map((p) => ({ sireId: p.sireId, damId: p.damId })),
      benched && byId.has(benched) ? benched : null,
      label,
    );
    setRuns((prev) => [run, ...prev].slice(0, MAX_BREEDING_RUNS));
    setActiveRunId(run.id);
  }, [pairs, byId, benched, horses]);

  const patchRun = useCallback((id: string, patch: (run: BreedingRun) => BreedingRun) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? patch(r) : r)));
  }, []);

  const handleTogglePair = useCallback(
    (runId: string, key: string) => {
      patchRun(runId, (run) => {
        const done = run.done[key] === true;
        return setBreedingPairDone(run, key, !done);
      });
    },
    [patchRun],
  );

  const handleRemovePair = useCallback(
    (runId: string, key: string) => {
      patchRun(runId, (run) => removeBreedingPair(run, key));
    },
    [patchRun],
  );

  const handleClearTicks = useCallback(
    (runId: string) => {
      patchRun(runId, clearBreedingTicks);
    },
    [patchRun],
  );

  const handleRenameRun = useCallback(
    (runId: string, label: string) => {
      patchRun(runId, (run) => renameBreedingRun(run, label));
    },
    [patchRun],
  );

  const handleDeleteRun = useCallback(
    (runId: string) => {
      const next = runs.filter((r) => r.id !== runId);
      setRuns(next);
      if (activeRunId === runId) {
        setActiveRunId(next.length > 0 ? next[0].id : null);
      }
    },
    [runs, activeRunId],
  );

  const handleDeleteAllRuns = useCallback(() => {
    setRuns([]);
    setActiveRunId(null);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PairingPlanner
        horses={horses}
        colors={colors}
        pairs={pairs}
        benched={benched}
        triedKeys={triedKeys}
        policyBlocksRelatives={policyBlocksRelatives}
        onSnapshot={handleSnapshot}
      />
      <BreedingChecklist
        horses={horses}
        triedKeys={triedKeys}
        runs={runs}
        activeRunId={activeRunId}
        livePairKeys={livePairKeys}
        onSelectRun={setActiveRunId}
        onTogglePair={handleTogglePair}
        onRemovePair={handleRemovePair}
        onClearTicks={handleClearTicks}
        onRenameRun={handleRenameRun}
        onDeleteRun={handleDeleteRun}
        onDeleteAllRuns={handleDeleteAllRuns}
      />
    </div>
  );
}
