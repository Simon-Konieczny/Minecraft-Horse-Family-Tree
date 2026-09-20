export const colors: Record<number, string> = {
  0: "White",
  1: "Creamy",
  2: "Chestnut",
  3: "Brown",
  4: "Black",
  5: "Gray",
  6: "Darkbrown",
};

export const patterns: Record<number, string> = {
  0: "",
  1: "with_White_Stockings",
  2: "with_White_Field",
  3: "with_White_Spots",
  4: "with_Black_Dots",
};

export const VARIANT_COLOR_COUNT = 7;
export const VARIANT_PATTERN_COUNT = 5;

/**
 * Canonical create/edit order (color-major): White + its 5 patterns,
 * then Creamy + its 5, and so on. Variant id = color + pattern * 256.
 * Records census reuses this order so gaps are scannable.
 */
export const ALL_VARIANTS: number[] = (() => {
  const out: number[] = [];
  for (let color = 0; color < VARIANT_COLOR_COUNT; color++) {
    for (let pattern = 0; pattern < VARIANT_PATTERN_COUNT; pattern++) {
      out.push(color + pattern * 256);
    }
  }
  return out;
})();

export function getHorseVariantImage(variantId: number): string {
  const colorId = variantId % 256;
  const patternId = Math.floor(variantId / 256);

  const color = colors[colorId] ?? "White";
  const pattern = patterns[patternId] ?? "";

  if (pattern === "") {
    return `/images/horses/${color}_Horse.webp`;
  }

  return `/images/horses/${color}_Horse_${pattern}.webp`;
}

export function getVariantName(variantId: number): string {
  const colorId = variantId % 256;
  const patternId = Math.floor(variantId / 256);

  const colorsDisplay: Record<number, string> = {
    0: "White",
    1: "Creamy",
    2: "Chestnut",
    3: "Brown",
    4: "Black",
    5: "Gray",
    6: "Dark Brown",
  };
  
  const patternsDisplay: Record<number, string> = {
    0: "None",
    1: "White Stockings",
    2: "White Field",
    3: "White Dots",
    4: "Black Dots",
  };

  const color = colorsDisplay[colorId] ?? "Unknown";
  const pattern = patternsDisplay[patternId] ?? "None";

  if (pattern === "None") return color;
  return `${color} w/ ${pattern}`;
}
