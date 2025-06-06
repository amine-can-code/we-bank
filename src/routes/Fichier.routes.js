import express from "express";
import {
  uploadFile,
  getFichiers,
  readFichierById,
  deleteFichier,
  readFileContent,
  analyzeFichierById,
} from "../controllers/FichierController.js";

const router = express.Router();

// ✅ Upload a new file
router.post("/upload", uploadFile);

// ✅ Get all fichiers
router.get("/", getFichiers);

// ✅ Read file content by ID
router.get("/read/:id", readFileContent);

// ✅ Get a fichier by ID
router.get("/:id", readFichierById);

// ✅ Delete a fichier by ID
router.delete("/:id", deleteFichier);

// ✅ Analyze a fichier by ID
router.get("/analyze/:id", analyzeFichierById);

export default router;
