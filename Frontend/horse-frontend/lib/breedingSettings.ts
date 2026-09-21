import { Collection } from "mongodb";
import { getMongoClient } from "./mongodb";
import { unstable_noStore as noStore } from "next/cache";

/** Mongo collection for settings. Configurable via env, defaults to "settings". */
function getSettingsCollectionName(): string {
  const name = process.env.SETTINGS_COLLECTION_NAME?.trim();
  return name ? name : "settings";
}
const BREEDING_SETTINGS_ID = "breeding";

export interface BreedingSettings {
  allowCloseRelativeBreeding: boolean;
}

interface BreedingSettingsDoc {
  _id: string;
  allowCloseRelativeBreeding?: boolean;
}

const DEFAULTS: BreedingSettings = {
  allowCloseRelativeBreeding: true,
};

/** Global breeding policy, stored in Mongo so it survives restarts. */
export async function getBreedingSettings(): Promise<BreedingSettings> {
  noStore();
  const settings = await getSettingsCollection();
  const doc = await settings.findOne({ _id: BREEDING_SETTINGS_ID });
  if (doc && typeof doc.allowCloseRelativeBreeding === "boolean") {
    return { allowCloseRelativeBreeding: doc.allowCloseRelativeBreeding };
  }
  // First run: seed the defaults.
  await settings.updateOne(
    { _id: BREEDING_SETTINGS_ID },
    { $setOnInsert: { ...DEFAULTS } },
    { upsert: true },
  );
  return { ...DEFAULTS };
}

export async function setBreedingSettings(
  settings: BreedingSettings,
): Promise<BreedingSettings> {
  noStore();
  const collection = await getSettingsCollection();
  try {
    await collection.updateOne(
      { _id: BREEDING_SETTINGS_ID },
      { $set: { ...settings } },
      { upsert: true },
    );
  } catch (error) {
    console.error("Error saving breeding settings", error);
    throw new Error("Could not save breeding rule. Is MongoDB running?");
  }
  return settings;
}

async function getSettingsCollection(): Promise<Collection<BreedingSettingsDoc>> {
  const dbName = process.env.DB_NAME;
  if (!dbName)
    throw new Error(
      "DB_NAME not set. For host dev copy .env.example to .env.local; " +
        "in Docker it comes from docker-compose.yml.",
    );
  const client = await getMongoClient();
  return client.db(dbName).collection(getSettingsCollectionName());
}
