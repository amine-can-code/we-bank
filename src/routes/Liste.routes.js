import express from "express";
import {
  generateListe,
  downloadListeAsCSV,
  downloadListeAsXLSX,
  fetchAllListes,
} from "../controllers/ListeController.js";

const router = express.Router();

// ✅ Generate and save a list of participants
router.post("/generate", generateListe);

// ✅ Download a list as CSV by ID
router.get("/download/:id", downloadListeAsCSV);

// ✅ Download a list as XLSX by ID
router.get("/download-xlsx/:id", downloadListeAsXLSX);

// ✅ Get all listes
router.get("/", fetchAllListes);

export default router;
