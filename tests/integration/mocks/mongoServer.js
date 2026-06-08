import mongoose from 'mongoose';

export function isMongoConfigured() {
  return Boolean((process.env.MONGODB_URI || process.env.MONGO_URI || '').trim());
}

export async function connectMongoServer() {
  if (mongoose.connection.readyState === 1) return mongoose;
  return null;
}
