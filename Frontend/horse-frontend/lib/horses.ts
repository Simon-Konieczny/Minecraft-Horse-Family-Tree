import { Collection, Document, ObjectId, WithId } from "mongodb";
import { getMongoClient, mongoUnavailable, ENV_HINT } from "./mongodb";
import { CreateHorseRequest, EditHorseRequest, Horse, parseHorseStatus } from "@/types/horse";
import { bloodlineSlug } from "@/utils/bloodlineValidation";
import {
  calculateColorFromDna,
  getSurnameFromDna,
  renameBloodlineInDna,
  renameBloodlineInFamilyName,
  type BloodlineReferenceCounts,
} from "@/utils/genetics/utils";
import { splitLegacyName } from "@/utils/horseNames";
import { unstable_noStore as noStore } from "next/cache";

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? (n as number) : 0;
}

function toHorse(row: WithId<Document>): Horse {
  const legacy = splitLegacyName(row.name);
  return {
    id: String(row._id).trim(),
    firstName: row.firstName || legacy.firstName,
    familyName:
      row.familyName || getSurnameFromDna(row.dna || {}),
    parentId1: row.parentId1 || null,
    parentId2: row.parentId2 || null,
    status: parseHorseStatus(row.status),
    speed: toNumber(row.speed),
    jump: toNumber(row.jump),
    health: toNumber(row.health),
    variant: toVariant(row),
    generation: toNumber(row.generation),
    hexColor: row.hexColor || "#000000",
    dna: row.dna || {},
    createdAt: toISOString(row.createdAt),
  };
}

function toVariant(row: Document): number {
  // Writes use `variant`; older docs may carry `variantId`.
  return toNumber(row.variant ?? row.variantId);
}

function toISOString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function isValidId(id: string | undefined | null): id is string {
  return !!id && ObjectId.isValid(id);
}

export async function getRecentHorses(limit: number = 10): Promise<Horse[]> {
  noStore();
  try {
    const horses = await getCollection();
    const data = await horses.find({}).sort({ _id: -1 }).limit(limit).toArray();

    return data.map(toHorse);
  } catch (error) {
    console.error("Error fetching recent horses:", error);
    return [];
  }
}

export async function getAllHorses(): Promise<Horse[]> {
  noStore();
  try {
    const horses = await getCollection();

    const data = await horses.find({}).toArray();

    const horseList: Horse[] = data.map(toHorse);

    return horseList;
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export async function getHorseById(id: string): Promise<Horse | undefined> {
  noStore();
  // Origin horses have empty parent ids — not an error, just no parent.
  if (!isValidId(id)) return;
  try {
    const horses = await getCollection();

    const response = await horses.findOne({ _id: new ObjectId(id) });
    if (!response) {
      return;
    }

    return toHorse(response);
  } catch (error) {
    console.error("Error fetching horse by ID", error);
    return;
  }
}

export async function createHorse(
  request: CreateHorseRequest,
): Promise<string> {
  noStore();
  const horses = await getCollection();

  let response;
  try {
    response = await horses.insertOne({ ...request, createdAt: new Date() });
  } catch (error) {
    console.error("Error creating horse", error);
    throw mongoUnavailable("save horse");
  }
  if (!response.acknowledged) {
    throw new Error("MongoDB did not acknowledge the horse write.");
  }
  return response.insertedId.toString();
}

export async function editHorse(
  id: string,
  request: EditHorseRequest,
): Promise<string | undefined> {
  noStore();
  try {
    const horses = await getCollection();

    const filter = { _id: new ObjectId(id) };
    const update = { $set: request };

    const result = await horses.updateOne(filter, update, { upsert: false });
    return result.modifiedCount > 0 ? id : undefined;
  } catch (error) {
    console.error("Error editing horse", error);
    return;
  }
}

export async function deleteHorse(id: string): Promise<boolean> {  noStore();
  try {
    const horses = await getCollection();

    const result = await horses.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error("Error deleting horse", error);
    return false;
  }
}

export async function getStablesStats() {
  noStore();
  try {
    const horses = await getCollection();
    const stats = await horses.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          alive: [{ $match: { status: { $in: ["Alive", "Retired"] } } }, { $count: "count" }],
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          averages: [
            {
              $group: {
                _id: null,
                avgSpeed: { $avg: "$speed" },
                minSpeed: { $min: "$speed" },
                maxSpeed: { $max: "$speed" },
                avgJump: { $avg: "$jump" },
                minJump: { $min: "$jump" },
                maxJump: { $max: "$jump" },
                avgHealth: { $avg: "$health" },
                minHealth: { $min: "$health" },
                maxHealth: { $max: "$health" },
              },
            },
          ],
        },
      },
    ]).toArray();

    const result = stats[0];
    // Buckets may hold legacy numeric codes — coerce via parseHorseStatus.
    const byStatus = { Alive: 0, Deceased: 0, Retired: 0 };
    for (const bucket of result.byStatus || []) {
      byStatus[parseHorseStatus(bucket._id)] += bucket.count || 0;
    }
    const avg = result.averages[0] || {};
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    return {
      total: result.total[0]?.count || 0,
      alive: result.alive[0]?.count || 0,
      byStatus,
      avgSpeed: num(avg.avgSpeed),
      avgJump: num(avg.avgJump),
      avgHealth: num(avg.avgHealth),
      speed: { avg: num(avg.avgSpeed), min: num(avg.minSpeed), max: num(avg.maxSpeed) },
      jump: { avg: num(avg.avgJump), min: num(avg.minJump), max: num(avg.maxJump) },
      health: { avg: num(avg.avgHealth), min: num(avg.minHealth), max: num(avg.maxHealth) },
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    const empty = { avg: 0, min: 0, max: 0 };
    return {
      total: 0,
      alive: 0,
      byStatus: { Alive: 0, Deceased: 0, Retired: 0 },
      avgSpeed: 0,
      avgJump: 0,
      avgHealth: 0,
      speed: empty,
      jump: empty,
      health: empty,
    };
  }
}

export async function getHorsesByIds(ids: string[]): Promise<Horse[]> {
  noStore();
  const validIds = ids.filter(isValidId);
  if (!validIds.length) return [];
  try {
    const horses = await getCollection();
    const objectIds = validIds.map((id) => new ObjectId(id));
    const data = await horses.find({ _id: { $in: objectIds } }).toArray();
    
    // Map back in the order requested
    const horseMap = new Map<string, Horse>(
      data.map((row: WithId<Document>) => {
        const horse = toHorse(row);
        return [horse.id, horse];
      }),
    );

    return validIds.map(id => horseMap.get(id)).filter((h): h is Horse => !!h);
  } catch (error) {
    console.error("Error fetching horses by ids:", error);
    return [];
  }
}

export async function bulkUpdateGenerations(  updates: { id: string; generation: number }[],
): Promise<void> {
  noStore();
  const valid = updates.filter((u) => isValidId(u.id));
  if (!valid.length) return;
  const horses = await getCollection();
  try {
    await horses.bulkWrite(
      valid.map((u) => ({
        updateOne: {
          filter: { _id: new ObjectId(u.id) },
          update: { $set: { generation: u.generation } },
        },
      })),
    );
  } catch (error) {
    console.error("Error bulk updating generations", error);
    throw new Error("Could not update descendant generations in MongoDB.");
  }
}

/**
 * Renames a bloodline across all horses: DNA keys whose slug matches
 * `oldName` become `newName` (mixes included — any map holding the key),
 * and `familyName` values follow per hyphen part ("Emberhoof-Frostmane"
 * becomes "Inferno-Frostmane"). When `colors` is supplied, affected
 * horses also get `hexColor` recalculated via calculateColorFromDna.
 * Returns the number of horses changed.
 */
export async function renameBloodlineInHorses(
  oldName: string,
  newName: string,
  colors?: Record<string, string>,
): Promise<number> {
  noStore();
  const horses = await getCollection();
  const docs = await horses.find({}).toArray();

  const ops = [];
  for (const doc of docs) {
    const dna = (doc.dna || {}) as Record<string, number>;
    const nextDna = renameBloodlineInDna(dna, oldName, newName);
    const family = renameBloodlineInFamilyName(
      doc.familyName,
      oldName,
      newName,
    );
    if (nextDna || family !== undefined) {
      const effectiveDna = nextDna || dna;
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              ...(nextDna ? { dna: nextDna } : {}),
              ...(family !== undefined ? { familyName: family } : {}),
              ...(colors ? { hexColor: calculateColorFromDna(effectiveDna, colors) } : {}),
            },
          },
        },
      });
    }
  }
  if (ops.length === 0) return 0;
  try {
    const result = await horses.bulkWrite(ops);
    return result.modifiedCount;
  } catch (error) {
    console.error("Error renaming bloodline in horses", error);
    throw new Error("Could not rename bloodline in horse records.");
  }
}

/**
 * Recalculates stored `hexColor` for every horse whose DNA references
 * `bloodlineName` (slug-compared): pure founders resolve to the flat
 * registry color, mixes re-blend via calculateColorFromDna.
 * Returns the number of horses changed.
 */
export async function recalcColorsForBloodline(
  bloodlineName: string,
  colors: Record<string, string>,
): Promise<number> {
  noStore();
  const slug = bloodlineSlug(bloodlineName);
  const horses = await getCollection();
  const docs = await horses.find({}).toArray();

  const ops = [];
  for (const doc of docs) {
    const dna = (doc.dna || {}) as Record<string, number>;
    if (!Object.keys(dna).some((k) => bloodlineSlug(k) === slug)) continue;
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { hexColor: calculateColorFromDna(dna, colors) } },
      },
    });
  }
  if (ops.length === 0) return 0;
  try {
    const result = await horses.bulkWrite(ops);
    return result.modifiedCount;
  } catch (error) {
    console.error("Error recalculating horse colors", error);
    throw new Error("Could not update horse colors in horse records.");
  }
}

export type { BloodlineReferenceCounts };

async function getCollection(): Promise<Collection<Document>> {
  const dbName = process.env.DB_NAME;
  const collectionName = process.env.COLLECTION_NAME;
  if (!dbName || !collectionName)
    throw new Error("DB_NAME or COLLECTION_NAME not set. " + ENV_HINT);

  const client = await getMongoClient();
  const db = client.db(dbName);
  const horses = db.collection(collectionName);
  if (!horses) throw new Error("Collection not found");
  return horses;
}
