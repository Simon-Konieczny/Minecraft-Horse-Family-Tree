import { Collection } from "mongodb";
import { getMongoClient } from "./mongodb";
import { getAllHorses } from "./horses";
import { BLOODLINE_COLORS } from "@/utils/genetics/utils";
import { unstable_noStore as noStore } from "next/cache";

const BLOODLINES_COLLECTION = "bloodlines";

export interface Bloodline {
  name: string;
  hexColor: string;
  theme?: string;
}

interface BloodlineDoc {
  _id: string;
  name: string;
  hexColor: string;
  theme?: string;
}

function slug(name: string): string {
  return name.trim().toLowerCase();
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
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
        seed.map((b) => ({ _id: slug(b.name), ...b })),
      );
      docs = await collection.find({}).toArray();
    }
  }
  return docs
    .map((d) => ({ name: d.name || d._id, hexColor: d.hexColor, theme: d.theme }))
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
  const name = input.name?.trim();
  if (!name) throw new Error("Bloodline name is required.");
  if (name.includes(".") || name.includes("$")) {
    throw new Error('Bloodline names cannot contain "." or "$".');
  }
  if (!isValidHex(input.hexColor || "")) {
    throw new Error(`"${input.hexColor}" is not a valid #rrggbb color.`);
  }
  const collection = await getBloodlinesCollection();
  const existing = await collection.findOne({ _id: slug(name) });
  if (existing) throw new Error(`Bloodline "${name}" already exists.`);

  const bloodline: Bloodline = {
    name,
    hexColor: input.hexColor,
    ...(input.theme?.trim() ? { theme: input.theme.trim() } : {}),
  };
  try {
    await collection.insertOne({ _id: slug(name), name, hexColor: bloodline.hexColor, ...(bloodline.theme ? { theme: bloodline.theme } : {}) });
  } catch (error) {
    console.error("Error adding bloodline", error);
    throw new Error("Could not save bloodline. Is MongoDB running?");
  }
  return bloodline;
}

export async function updateBloodlineColor(
  name: string,
  hexColor: string,
): Promise<void> {
  noStore();
  if (!isValidHex(hexColor || "")) {
    throw new Error(`"${hexColor}" is not a valid #rrggbb color.`);
  }
  const collection = await getBloodlinesCollection();
  const result = await collection.updateOne(
    { _id: slug(name) },
    { $set: { hexColor } },
  );
  if (result.matchedCount === 0) {
    throw new Error(`Bloodline "${name}" not found.`);
  }
}

export async function deleteBloodline(name: string): Promise<void> {
  noStore();
  const collection = await getBloodlinesCollection();
  const doc = await collection.findOne({ _id: slug(name) });
  if (!doc) throw new Error(`Bloodline "${name}" not found.`);

  // Names are keys inside horses' DNA maps — refuse while referenced
  // (compared case-insensitively, since DNA keys predate the registry).
  const count = await countReferences(doc._id);
  if (count > 0) {
    throw new Error(
      `Cannot delete "${doc.name}": ${count} horse${count === 1 ? "" : "s"} still reference${count === 1 ? "s" : ""} it in their DNA.`,
    );
  }
  await collection.deleteOne({ _id: slug(name) });
}

async function countReferences(id: string): Promise<number> {
  const horses = await getAllHorses();
  return horses.filter((h) => {
    const dna = h.dna || {};
    return Object.keys(dna).some((k) => slug(k) === id);
  }).length;
}

async function getBloodlinesCollection(): Promise<Collection<BloodlineDoc>> {
  const dbName = process.env.DB_NAME;
  if (!dbName)
    throw new Error(
      "DB_NAME not set. For host dev copy .env.example to .env.local; " +
        "in Docker it comes from docker-compose.yml.",
    );
  const client = await getMongoClient();
  const collection = client.db(dbName).collection<BloodlineDoc>(BLOODLINES_COLLECTION);
  await collection.createIndex({ _id: 1 }, { unique: true }).catch(() => {});
  return collection;
}
