import { Collection, Document, ObjectId, WithId } from "mongodb";
import { getMongoClient } from "./mongodb";
import { createHorseRequest, editHorseRequest, Horse } from "@/types/horse";
import { unstable_noStore as noStore } from "next/cache";

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? (n as number) : 0;
}

function toVariant(row: Document): number {
  // Writes use `variant`; older docs may carry `variantId`.
  return toNumber(row.variant ?? row.variantId);
}

function isValidId(id: string | undefined | null): id is string {
  return !!id && ObjectId.isValid(id);
}

export async function getRecentHorses(limit: number = 10): Promise<Horse[]> {
  noStore();
  try {
    const horses = await getCollection();
    const data = await horses.find({}).sort({ _id: -1 }).limit(limit).toArray();

    return data.map((row: WithId<Document>) => ({
      id: String(row._id).trim(),
      name: row.name || "Unknown",
      parentId1: row.parentId1 || null,
      parentId2: row.parentId2 || null,
      status: row.status,
      speed: toNumber(row.speed),
      jump: toNumber(row.jump),
      health: toNumber(row.health),
      variant: toVariant(row),
      generation: toNumber(row.generation),
      hexColor: row.hexColor || "#000000",
      dna: row.dna || {},
    }));
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

    const horseList: Horse[] = data.map((row: WithId<Document>) => ({
      id: String(row._id).trim(),
      name: row.name || "Unknown",
      parentId1: row.parentId1 || null,
      parentId2: row.parentId2 || null,
      status: row.status,
      speed: toNumber(row.speed),
      jump: toNumber(row.jump),
      health: toNumber(row.health),
      variant: toVariant(row),
      generation: toNumber(row.generation),
      hexColor: row.hexColor || "#000000",
      dna: row.dna || {},
    }));

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

    const horse: Horse = {
      id: String(response._id).trim(),
      name: response.name || "Unknown",
      parentId1: response.parentId1 || null,
      parentId2: response.parentId2 || null,
      status: response.status,
      speed: toNumber(response.speed),
      jump: toNumber(response.jump),
      health: toNumber(response.health),
      variant: toVariant(response),
      generation: toNumber(response.generation),
      dna: response.dna || {},
      hexColor: response.hexColor || "#000000",
    };

    return horse;
  } catch (error) {
    console.error("Error fetching horse by ID", error);
    return;
  }
}

export async function createHorse(
  request: createHorseRequest,
): Promise<string> {
  noStore();
  const horses = await getCollection();

  let response;
  try {
    response = await horses.insertOne(request);
  } catch (error) {
    console.error("Error creating horse", error);
    throw new Error("Could not write horse to MongoDB. Is it running?");
  }
  if (!response.acknowledged) {
    throw new Error("MongoDB did not acknowledge the horse write.");
  }
  return response.insertedId.toString();
}

export async function editHorse(
  id: string,
  request: editHorseRequest,
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

export async function deleteHorse(id: string): Promise<boolean> {
  noStore();
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
          alive: [{ $match: { status: { $ne: 0 } } }, { $count: "count" }],
          averages: [
            {
              $group: {
                _id: null,
                avgSpeed: { $avg: "$speed" },
                avgJump: { $avg: "$jump" },
              },
            },
          ],
        },
      },
    ]).toArray();

    const result = stats[0];
    return {
      total: result.total[0]?.count || 0,
      alive: result.alive[0]?.count || 0,
      avgSpeed: result.averages[0]?.avgSpeed || 0,
      avgJump: result.averages[0]?.avgJump || 0,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { total: 0, alive: 0, avgSpeed: 0, avgJump: 0 };
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
    const horseMap = new Map<string, Horse>(data.map((row: WithId<Document>) => [row._id.toString(), {
      id: row._id.toString(),
      name: row.name || "Unknown",
      parentId1: row.parentId1 || undefined,
      parentId2: row.parentId2 || undefined,
      status: row.status,
      speed: toNumber(row.speed),
      jump: toNumber(row.jump),
      health: toNumber(row.health),
      variant: toVariant(row),
      generation: toNumber(row.generation),
      hexColor: row.hexColor || "#000000",
      dna: row.dna || {},
    }]));

    return validIds.map(id => horseMap.get(id)).filter((h): h is Horse => !!h);
  } catch (error) {
    console.error("Error fetching horses by ids:", error);
    return [];
  }
}

async function getCollection(): Promise<Collection<Document>> {
  const db_name = process.env.DB_NAME;
  const collection_name = process.env.COLLECTION_NAME;
  if (!db_name || !collection_name)
    throw new Error(
      'DB_NAME or COLLECTION_NAME not set. For host dev copy .env.example to .env.local; ' +
        "in Docker they come from docker-compose.yml.",
    );

  const client = await getMongoClient();
  const db = client.db(db_name);
  const horses = db.collection(collection_name);
  if (!horses) throw new Error("Collection not found");
  return horses;
}
