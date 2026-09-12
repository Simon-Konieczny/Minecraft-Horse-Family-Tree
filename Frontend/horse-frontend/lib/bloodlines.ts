import { Collection } from "mongodb";
import { getMongoClient } from "./mongodb";
import {
  countBloodlineReferencesInList,
  getAllHorses,
  recalcColorsForBloodline,
  renameBloodlineInHorses,
  type BloodlineReferenceCounts,
} from "./horses";
import { BLOODLINE_COLORS } from "@/utils/genetics/utils";
import {
  bloodlineSlug,
  isValidHex,
  validateBloodlineInput,
} from "@/utils/bloodlineValidation";
import { unstable_noStore as noStore } from "next/cache";

const BLOODLINES_COLLECTION = "bloodlines";

export interface Bloodline {
  name: string;
  hexColor: string;
  theme?: string;
  hidden?: boolean;
}

interface BloodlineDoc {
  _id: string;
  name: string;
  hexColor: string;
  theme?: string;
  hidden?: boolean;
}

function cleanTheme(theme?: string): string | undefined {
  const trimmed = theme?.trim();
  return trimmed ? trimmed : undefined;
}

/** Seed entries mirroring the built-in map (used on first run). */
function seedBloodlines(): Bloodline[] {
  return Object.entries(BLOODLINE_COLORS)
    .filter(([name]) => name !== "Unknown")
    .map(([name, hexColor]) => ({ name, hexColor }));
}

/** All bloodlines, name-sorted. Seeds the collection on first run. */
export async function getBloodlines(): Promise<Bloodline[]> {
  noStore();
  const collection = await getBloodlinesCollection();
  let docs = await collection.find({}).toArray();
  if (docs.length === 0) {
    const seed = seedBloodlines();
    if (seed.length > 0) {
      await collection.insertMany(
        seed.map((b) => ({ _id: bloodlineSlug(b.name), ...b })),
      );
      docs = await collection.find({}).toArray();
    }
  }
  return docs
    .map((d) => ({
      name: d.name || d._id,
      hexColor: d.hexColor,
      theme: d.theme,
      ...(d.hidden ? { hidden: true } : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Name -> hex map for genetics lookups. */
export async function getBloodlineColors(): Promise<Record<string, string>> {
  const bloodlines = await getBloodlines();
  const colors: Record<string, string> = { ...BLOODLINE_COLORS };
  for (const b of bloodlines) {
    colors[b.name] = b.hexColor;
  }
  return colors;
}

export async function addBloodline(input: Bloodline): Promise<Bloodline> {
  noStore();
  const { name, hexColor } = validateBloodlineInput(input);
  const collection = await getBloodlinesCollection();
  const existing = await collection.findOne({ _id: bloodlineSlug(name) });
  if (existing) throw new Error(`Bloodline "${name}" already exists.`);

  const theme = cleanTheme(input.theme);
  const bloodline: Bloodline = {
    name,
    hexColor,
    ...(theme ? { theme } : {}),
  };
  try {
    await collection.insertOne({ _id: bloodlineSlug(name), name, hexColor, ...(theme ? { theme } : {}) });
  } catch (error) {
    console.error("Error adding bloodline", error);
    throw new Error("Could not save bloodline. Is MongoDB running?");
  }
  return bloodline;
}

export interface UpdateBloodlineInput {
  oldName: string;
  name: string;
  hexColor: string;
  theme?: string;
}

export interface UpdateBloodlineResult extends Bloodline {
  /** Horses whose DNA/familyName/color followed the edit. */
  affectedHorses: number;
}

/**
 * Edits a bloodline (name, color, theme). A rename propagates to every
 * horse: matching DNA keys (pure + mixes) and familyName values
 * (including hyphen parts) follow the new name, and affected horses get
 * `hexColor` recalculated against the updated registry colors. A
 * color-only edit likewise recalculates every referencing horse.
 * Ordered writes (horses first, old registry doc deleted last) because
 * standalone Mongo has no transactions.
 */
export async function updateBloodline(
  input: UpdateBloodlineInput,
): Promise<UpdateBloodlineResult> {
  noStore();
  const collection = await getBloodlinesCollection();
  const doc = await collection.findOne({ _id: bloodlineSlug(input.oldName) });
  if (!doc) throw new Error(`Bloodline "${input.oldName}" not found.`);

  const { name, hexColor } = validateBloodlineInput(input);
  const theme = cleanTheme(input.theme);
  const renamed = bloodlineSlug(name) !== doc._id;

  let affectedHorses = 0;
  if (renamed) {
    const clash = await collection.findOne({ _id: bloodlineSlug(name) });
    if (clash) throw new Error(`Bloodline "${name}" already exists.`);
    // Colors for recalc: current registry with the edited entry swapped in.
    const colors = await getBloodlineColors();
    colors[name] = hexColor;
    delete colors[doc.name];
    affectedHorses = await renameBloodlineInHorses(doc.name, name, colors);
    await collection.insertOne({
      _id: bloodlineSlug(name),
      name,
      hexColor,
      ...(theme ? { theme } : {}),
      ...(doc.hidden ? { hidden: true } : {}),
    });
    await collection.deleteOne({ _id: doc._id });
  } else {
    const update: Record<string, unknown> = { name, hexColor };
    if (theme !== undefined) update.theme = theme;
    await collection.updateOne(
      { _id: doc._id },
      {
        $set: update,
        ...(theme === undefined ? { $unset: { theme: "" } } : {}),
      },
    );
    const colors = await getBloodlineColors();
    affectedHorses = await recalcColorsForBloodline(name, colors);
  }
  return { name, hexColor, ...(theme ? { theme } : {}), affectedHorses };
}

/** Flips visibility only — edits never touch this flag implicitly. */
export async function setBloodlineVisibility(
  name: string,
  hidden: boolean,
): Promise<void> {
  noStore();
  const collection = await getBloodlinesCollection();
  const result = await collection.updateOne(
    { _id: bloodlineSlug(name) },
    hidden ? { $set: { hidden: true } } : { $unset: { hidden: "" } },
  );
  if (result.matchedCount === 0) {
    throw new Error(`Bloodline "${name}" not found.`);
  }
}

/**
 * Recolors a bloodline and recalculates every referencing horse's stored
 * `hexColor` (pure founders → flat color, mixes → re-blended).
 * Returns the number of horses updated.
 */
export async function updateBloodlineColor(
  name: string,
  hexColor: string,
): Promise<number> {
  noStore();
  if (!isValidHex(hexColor || "")) {
    throw new Error(`"${hexColor}" is not a valid #rrggbb color.`);
  }
  const collection = await getBloodlinesCollection();
  const result = await collection.updateOne(
    { _id: bloodlineSlug(name) },
    { $set: { hexColor } },
  );
  if (result.matchedCount === 0) {
    throw new Error(`Bloodline "${name}" not found.`);
  }
  const colors = await getBloodlineColors();
  return recalcColorsForBloodline(name, colors);
}

/** Pure/mixed/total horse counts referencing a bloodline (for previews). */
export async function getBloodlineReferenceCounts(
  name: string,
): Promise<BloodlineReferenceCounts> {
  noStore();
  const horses = await getAllHorses();
  return countBloodlineReferencesInList(horses, name);
}

export async function deleteBloodline(name: string): Promise<void> {
  noStore();
  const collection = await getBloodlinesCollection();
  const doc = await collection.findOne({ _id: bloodlineSlug(name) });
  if (!doc) throw new Error(`Bloodline "${name}" not found.`);

  // Names are keys inside horses' DNA maps — refuse while referenced
  // (compared case-insensitively, since DNA keys predate the registry).
  const count = await countReferences(doc._id);
  if (count > 0) {
    throw new Error(
      `Cannot delete "${doc.name}": ${count} horse${count === 1 ? "" : "s"} still reference${count === 1 ? "s" : ""} it in their DNA.`,
    );
  }
  await collection.deleteOne({ _id: bloodlineSlug(name) });
}

async function countReferences(id: string): Promise<number> {
  const horses = await getAllHorses();
  return countBloodlineReferencesInList(horses, id).total;
}

async function getBloodlinesCollection(): Promise<Collection<BloodlineDoc>> {
  const dbName = process.env.DB_NAME;
  if (!dbName)
    throw new Error(
      "DB_NAME not set. For host dev copy .env.example to .env.local; " +
        "in Docker it comes from docker-compose.yml.",
    );
  const client = await getMongoClient();
  // Note: no explicit index setup — _id is uniquely indexed by Mongo
  // itself (an explicit createIndex({_id: 1}) call throws here).
  return client.db(dbName).collection<BloodlineDoc>(BLOODLINES_COLLECTION);
}

