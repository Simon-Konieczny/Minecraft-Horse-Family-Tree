/**
 * One-time migration: numeric `status` codes to HorseStatus strings.
 *
 * Mapping: 0 -> "Deceased", anything else -> "Alive".
 * "Retired" has no legacy equivalent and is assigned by hand later.
 * Docs already holding a valid HorseStatus string are left untouched.
 *
 * Usage (from Frontend/horse-frontend):
 *   node scripts/migrate-horse-status.mjs            # dry run, no writes
 *   node scripts/migrate-horse-status.mjs --apply    # perform the migration
 *
 * Env: MONGODB_URI, DB_NAME, COLLECTION_NAME (same as .env.local).
 */
import { MongoClient } from "mongodb";

const VALID = new Set(["Alive", "Deceased", "Retired"]);

function toHorseStatus(value) {
  if (value === 0 || value === "0") return "Deceased";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "deceased" || normalized === "dead") return "Deceased";
    if (normalized === "retired") return "Retired";
  }
  return "Alive";
}

const apply = process.argv.includes("--apply");
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.DB_NAME || "horse";
const collectionName = process.env.COLLECTION_NAME || "horse";

const client = new MongoClient(uri);
await client.connect();
const col = client.db(dbName).collection(collectionName);
const docs = await col.find({}).toArray();

let updated = 0;
for (const doc of docs) {
  if (VALID.has(doc.status)) continue;
  const next = toHorseStatus(doc.status);
  console.log(`${apply ? "UPDATE" : "WOULD UPDATE"} ${String(doc._id)}: ${JSON.stringify(doc.status)} -> ${JSON.stringify(next)}`);
  if (apply) {
    await col.updateOne({ _id: doc._id }, { $set: { status: next } });
  }
  updated++;
}

console.log(`${apply ? "Updated" : "Would update"} ${updated} of ${docs.length} horses.${apply ? "" : " Re-run with --apply to write."}`);
await client.close();
