import multer from "multer";
import path from "path";
import fs from "fs";
import xlsx from "xlsx";
import {
  saveFileMetadata,
  getAllFichiers,
  getFichierById,
  deleteFichierById,
} from "../services/FichierService.js";

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

// Multer upload config
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowedExt = /csv|xlsx/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and XLSX files are allowed"));
    }
  },
}).single("file");

// ✅ Upload controller
export const uploadFile = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res
        .status(500)
        .json({ message: "Upload error", error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const { typeFichier, nomFichier, formatFichier, natureFichier } = req.body;

    if (!typeFichier || !natureFichier) {
      return res.status(400).json({ message: "typeFichier is required." });
    }

    try {
      const saved = await saveFileMetadata({
        nomFichier: nomFichier || req.file.originalname.split(".")[0],
        typeFichier,
        natureFichier,
        cheminFichier: req.file.path,
        formatFichier:
          formatFichier || path.extname(req.file.originalname).substring(1),
        tailleFichier: Math.round(req.file.size / 1024),
      });

      return res.status(201).json({
        message: "✅ File uploaded and saved to database.",
        data: saved,
      });
    } catch (saveErr) {
      return res.status(500).json({
        message: "❌ Database error",
        error: saveErr.message,
      });
    }
  });
};

// ✅ Get all fichiers
export const getFichiers = async (req, res) => {
  try {
    const fichiers = await getAllFichiers();
    res.status(200).json(fichiers);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get fichier by ID
export const readFichierById = async (req, res) => {
  try {
    const fichier = await getFichierById(req.params.id);
    if (!fichier) {
      return res.status(404).json({ error: "Fichier not found" });
    }
    res.json(fichier);
  } catch (error) {
    console.error("Error reading fichier:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Read file content
export const readFileContent = async (req, res) => {
  try {
    const fichier = await getFichierById(req.params.id);
    if (!fichier) {
      return res.status(404).json({ error: "Fichier not found" });
    }

    const fullPath = path.resolve(fichier.cheminFichier);
    const fileExt = path.extname(fullPath).toLowerCase();

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    // ✅ CSV parsing
    if (fileExt === ".csv") {
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length === 0) return res.json({ headers: [], rows: [] });

      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const cells = line.split(",").map((cell) => cell.trim());
        const row = {};
        headers.forEach((header, i) => {
          row[header] = cells[i] ?? "";
        });
        return row;
      });

      return res.json({ headers, rows });
    }

    // ✅ XLSX parsing
    if (fileExt === ".xlsx") {
      const workbook = xlsx.readFile(fullPath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rawMatrix = xlsx.utils.sheet_to_json(worksheet, {
        header: 1, // raw matrix format
        defval: "", // include empty cells as ""
        blankrows: false,
      });

      if (!Array.isArray(rawMatrix) || rawMatrix.length === 0) {
        return res.json({ headers: [], rows: [] });
      }

      const headers = rawMatrix[0]?.map((h) => String(h).trim()) || [];
      const rows = rawMatrix.slice(1).map((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] ?? "";
        });
        return obj;
      });

      return res.json({ headers, rows });
    }

    return res.status(400).json({ error: "Unsupported file format" });
  } catch (error) {
    console.error("Error reading file content:", error);
    res.status(500).json({ error: "Server error while reading file" });
  }
};

// ✅ Delete a fichier by ID
export const deleteFichier = async (req, res) => {
  try {
    const deleted = await deleteFichierById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Fichier not found" });
    }
    res.status(200).json({ message: "🗑️ Fichier deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
