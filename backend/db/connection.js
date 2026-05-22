import mongoose from "mongoose";

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!MONGODB_URI) {
    if (process.env.NODE_ENV === "production") {
      console.error("❌ MONGODB_URI is required in production");
      process.exit(1);
    }
    console.warn("[db] MONGODB_URI not set — using local fallback");
  }

  const uri = MONGODB_URI || "mongodb://localhost:27017/make-big";

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const safeUri = uri.replace(/:[^:@]+@/, ":****@");
    console.log("✅ MongoDB Connected:", safeUri);
    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log("✅ MongoDB Disconnected");
  } catch (error) {
    console.error("❌ MongoDB Disconnection Error:", error.message);
  }
}

export default mongoose;
