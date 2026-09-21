import { MongoClient } from "mongodb";

/** Hint appended to missing-env errors (same wording everywhere). */
export const ENV_HINT =
  "For host dev copy Frontend/horse-frontend/.env.example to .env.local; " +
  "in Docker it is provided by docker-compose.yml.";

/** Uniform "Mongo is down" error. Pass the action, e.g. "save horse". */
export function mongoUnavailable(action: string): Error {
  return new Error(`Could not ${action}. Is MongoDB running?`);
}

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'Invalid/Missing environment variable: "MONGODB_URI". ' + ENV_HINT,
    );
  }
  return uri;
}

// Lazy client promise: never cache a rejected connection (e.g. app started
// before Mongo was healthy), so a later retry can reconnect.
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(getUri());
      globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
        globalWithMongo._mongoClientPromise = undefined;
        throw err;
      });
    }
    return globalWithMongo._mongoClientPromise;
  }

  if (!clientPromise) {
    const client = new MongoClient(getUri());
    clientPromise = client.connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export function getMongoClient(): Promise<MongoClient> {
  return getClientPromise();
}

// Back-compat default export. Defers connecting (and env validation) until
// first awaited, so `next build` without env vars doesn't crash at import.
const lazyClientPromise = {
  then: (
    onFulfilled?: (value: MongoClient) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => getClientPromise().then(onFulfilled, onRejected),
  catch: (onRejected?: (reason: unknown) => unknown) =>
    getClientPromise().catch(onRejected),
  finally: (onFinally?: () => void) => getClientPromise().finally(onFinally),
} as unknown as Promise<MongoClient>;

export default lazyClientPromise;
