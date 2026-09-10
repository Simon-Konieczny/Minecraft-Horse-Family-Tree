/**
 * One-time migration: splits legacy `name` into `firstName` + `familyName`.
 *
 * - Single-word names ("Tester") become firstName as-is.
 * - Multi-word names keep everything except the last token as firstName
 *   (last token assumed an ad-hoc surname, superseded by the DNA surname).
 * - familyName is DERIVED from each horse's DNA via the same rule as
 *   getSurnameFromDna (top 2 bloodlines >= 15%, hyphenated, sire tie-break),
 *   never parsed from the old string.
 * - Docs that already have firstName/familyName are left untouched.
 * - Creates an index on familyName for filter/sort.
 *
 * Usage (from Frontend/horse-frontend):
 *   node scripts/migrate-horse-names.mjs            # dry run, no writes
 *   node scripts/migrate-horse-names.mjs --apply    # perform the migration
 *
 * Env: MONGODB_URI, DB_NAME, COLLECTION_NAME (same as .env.local).
 */
import { MongoClient } from "mongodb";

const SURNAME_THRESHOLD = 0.15;
const SURNAME_TIE_EPSILON = 0.02;

function splitLegacyName(name) {
  const tokens = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "Unknown";
  if (tokens.length === 1) return tokens[0];
  return tokens.slice(0, -1).join(" ");
}

function surnameFromDna(dna, sireDna = {}) {
  const qualifying = Object.entries(dna || {})
    .filter(([, w]) => typeof w === "number" && w >= SURNAME_THRESHOLD)
    .sort(([, a], [, b]) => b - a);
  if (qualifying.length === 0) return "Unknown";
  const parts = qualifying.slice(0, 2).map(([name]) => name);
  if (
    parts.length === 2 &&
    Math.abs(qualifying[0][1] - qualifying[1][1]) < SURNAME_TIE_EPSILON
  ) {
    const [first, second] = parts;
    const sireFirst = sireDna[first] || 0;
    const sireSecond = sireDna[second] || 0;
    if (sireSecond > sireFirst) parts.reverse();
    else if (sireSecond === sireFirst && second < first) parts.reverse();
  }
  return parts.join("-");
}

const apply = process.argv.includes("--apply");
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.DB_NAME || "horse";
const collectionName = process.env.COLLECTION_NAME || "horse";

const client = new MongoClient(uri);
await client.connect();
const col = client.db(dbName).collection(collectionName);
const docs = await col.find({}).toArray();
const byId = new Map(docs.map((d) => [String(d._id), d]));

let updated = 0;
for (const doc of docs) {
  const id = String(doc._id);
  const firstName = doc.firstName || splitLegacyName(doc.name);
  let familyName = doc.familyName;
  if (!familyName) {
    const sire = doc.parentId1 ? byId.get(String(doc.parentId1)) : undefined;
    familyName = surnameFromDna(doc.dna, sire?.dna || {});
  }
  if (doc.firstName !== firstName || doc.familyName !== familyName) {
    console.log(`${apply ? "UPDATE" : "WOULD UPDATE"} ${id}: ${JSON.stringify(doc.name)} -> first=${JSON.stringify(firstName)} family=${JSON.stringify(familyName)}`);
    if (apply) {
      await col.updateOne(
        { _id: doc._id },
        { $set: { firstName, familyName } },
      );
    }
    updated++;
  }
}

if (apply) {
  await col.createIndex({ familyName: 1 });
  console.log("Created index on familyName.");
}
console.log(`${apply ? "Updated" : "Would update"} ${updated} of ${docs.length} horses.${apply ? "" : " Re-run with --apply to write."}`);
await client.close();
