/**
 * Cached Mongoose connection for Next.js serverless routes (Vercel).
 */
import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var __makeBigMongo: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

function getMongoUri(): string | null {
  const uri = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
  return uri || null;
}

export function isMongoConfigured(): boolean {
  return Boolean(getMongoUri());
}

export async function connectMongoServer(): Promise<typeof mongoose | null> {
  const uri = getMongoUri();
  if (!uri) return null;

  if (!global.__makeBigMongo) {
    global.__makeBigMongo = { conn: null, promise: null };
  }

  if (global.__makeBigMongo.conn) {
    return global.__makeBigMongo.conn;
  }

  if (!global.__makeBigMongo.promise) {
    global.__makeBigMongo.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  global.__makeBigMongo.conn = await global.__makeBigMongo.promise;
  return global.__makeBigMongo.conn;
}
