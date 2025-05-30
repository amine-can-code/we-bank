import express from "express";
import cors from "cors";
import fileRoutes from "./routes/Fichier.routes.js";
import listeRoutes from "./routes/Liste.routes.js";

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads")); // serve uploaded files

// Routes
app.use("/api/files", fileRoutes);
app.use("/api/listes", listeRoutes);

// Root Test Route
app.get("/", (req, res) => {
  res.send("📦 File API is up and running!");
});

export default app;
