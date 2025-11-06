// test-mongo.cjs
const { connectToDatabase } = require("./connect.cjs");

async function test() {
  try {
    const db = await connectToDatabase();
    console.log("Connection successful");
    const collections = await db.collections();
    console.log(collections.map((c) => c.collectionName));
  } catch (err) {
    console.error("Connection failed:", err);
  }
}
test();
