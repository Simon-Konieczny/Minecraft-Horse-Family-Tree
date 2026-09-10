"use client";

import { createContext, useContext } from "react";
import { BLOODLINE_COLORS } from "@/utils/genetics/utils";
import type { Bloodline } from "@/lib/bloodlines";

const BloodlineColorsContext = createContext<Record<string, string> | null>(null);

export function BloodlineProvider({
  bloodlines,
  children,
}: {
  bloodlines: Bloodline[];
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = { ...BLOODLINE_COLORS };
  for (const b of bloodlines) {
    colors[b.name] = b.hexColor;
  }
  return (
    <BloodlineColorsContext.Provider value={colors}>
      {children}
    </BloodlineColorsContext.Provider>
  );
}

/** Registry colors, falling back to the built-in map when unavailable. */
export function useBloodlineColors(): Record<string, string> {
  return useContext(BloodlineColorsContext) ?? BLOODLINE_COLORS;
}
