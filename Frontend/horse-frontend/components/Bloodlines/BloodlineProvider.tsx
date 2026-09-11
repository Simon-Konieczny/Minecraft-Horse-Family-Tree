"use client";

import { createContext, useContext, useMemo } from "react";
import { BLOODLINE_COLORS } from "@/utils/genetics/utils";
import { bloodlineSlug } from "@/utils/bloodlineValidation";
import type { Bloodline } from "@/lib/bloodlines";

interface BloodlineContextValue {
  colors: Record<string, string>;
  bloodlines: Bloodline[];
}

const BloodlineContext = createContext<BloodlineContextValue | null>(null);

export function BloodlineProvider({
  bloodlines,
  children,
}: {
  bloodlines: Bloodline[];
  children: React.ReactNode;
}) {
  const value = useMemo<BloodlineContextValue>(() => {
    const colors: Record<string, string> = { ...BLOODLINE_COLORS };
    for (const b of bloodlines) {
      colors[b.name] = b.hexColor;
    }
    return { colors, bloodlines };
  }, [bloodlines]);
  return (
    <BloodlineContext.Provider value={value}>
      {children}
    </BloodlineContext.Provider>
  );
}

/** Registry colors, falling back to the built-in map when unavailable. */
export function useBloodlineColors(): Record<string, string> {
  return useContext(BloodlineContext)?.colors ?? BLOODLINE_COLORS;
}

/** Slugs of hidden bloodlines (slug-compared: DNA keys predate the registry). */
export function useHiddenBloodlineSlugs(): string[] {
  const ctx = useContext(BloodlineContext);
  return useMemo(() => {
    const bloodlines = ctx?.bloodlines ?? [];
    return bloodlines.filter((b) => b.hidden).map((b) => bloodlineSlug(b.name));
  }, [ctx]);
}
