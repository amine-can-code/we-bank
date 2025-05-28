// src/server.js
import "dotenv/config";
import { connectToDatabase } from "./configuration/database.js";
import app from "./app.js";

await connectToDatabase();

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
