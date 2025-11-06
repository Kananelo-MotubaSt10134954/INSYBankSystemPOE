const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "./config.env" });

let client;
let db;

async function connectToDatabase() {
  if (db) return db;

  try {
    client = new MongoClient(process.env.ATLAS_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      tls: true, // Explicitly enable TLS
      tlsAllowInvalidCertificates: false, // Enforce valid certificates
    });
    await client.connect();
    db = client.db("Bank-Systems");
    console.log("Connected to MongoDB Atlas");

    // Print collections
    const collections = await db.collections();
    console.log("📂 Collections in Bank-Systems:");
    collections.forEach((c) => console.log(" -", c.collectionName));

    return db;
  } catch (e) {
    console.error("MongoDB connection error:", e.message);
    throw e;
  }
}

async function closeDatabase() {
  if (client) {
    await client.close();
    console.log("🔌 MongoDB connection closed");
    client = null;
    db = null;
  }
}

module.exports = { connectToDatabase, closeDatabase };
