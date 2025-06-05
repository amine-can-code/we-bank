import multer from "multer";
import path from "path";
import fs from "fs";
import xlsx from "xlsx";
import { Buffer } from "buffer";

// 🔧 Ensure uploads folder exists (IMPORTANT for Render)
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

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
    const baseName = Buffer.from(file.originalname, "latin1").toString("utf8"); // Fix encoding
    const uniqueName = Date.now() + "-" + baseName;
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

// ✅ Analyze fichier by ID
export const analyzeFichierById = async (req, res) => {
  try {
    const fichier = await getFichierById(req.params.id);
    if (!fichier) return res.status(404).json({ error: "Fichier not found" });

    const fullPath = path.resolve(fichier.cheminFichier);
    const fileExt = path.extname(fullPath).toLowerCase();
    if (!fs.existsSync(fullPath))
      return res.status(404).json({ error: "File not found on disk" });

    let dataMatrix = [];

    // Read Excel or CSV file
    if (fileExt === ".csv") {
      const raw = fs.readFileSync(fullPath, "utf8");
      const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== "");
      dataMatrix = lines.map((line) => line.split(",").map((v) => v.trim()));
    } else if (fileExt === ".xlsx") {
      const workbook = xlsx.readFile(fullPath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      dataMatrix = xlsx.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });
    }

    if (dataMatrix.length === 0)
      return res.json({ message: "Empty file", analysis: {} });

    const headers = dataMatrix[0].map((h) => String(h).trim());
    const rows = dataMatrix.slice(1);

    // Convert to structured object array
    const records = rows.map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i]]))
    );

    // Use helper to process stats
    const analysis = analyzeColumns(headers, records, fichier);

    return res.json({
      fileId: fichier._id,
      fileName: fichier.nomFichier,
      typeFichier: fichier.typeFichier,
      natureFichier: fichier.natureFichier,
      formatFichier: fichier.formatFichier,
      tailleFichier: fichier.tailleFichier,
      ...analysis,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: "Failed to analyze file" });
  }
};

// Helper function to analyze columns
function analyzeColumns(headers, records, file) {
  const stats = {
    totalRows: records.length,
    totalColumns: headers.length,
    columnDataTypes: {},
    missingValuesPerColumn: {},
    missingPercentPerColumn: {},
    uniqueValuesPerColumn: {},
    mostFrequentValuePerColumn: {},
    numericalStats: {},
    dateRanges: {},
    booleanRatios: {},
    stringLengthStats: {},
  };

  headers.forEach((header) => {
    const colValues = records
      .map((r) => r[header])
      .filter((v) => v !== undefined);
    const cleaned = colValues
      .map((v) => (typeof v === "string" ? v.trim() : v))
      .filter(Boolean);

    // Data type
    const sample = cleaned[0];
    let type = typeof sample;
    if (!isNaN(Date.parse(sample))) type = "date";
    else if (!isNaN(parseFloat(sample)) && isFinite(sample)) type = "number";
    else if (["true", "false"].includes(String(sample).toLowerCase()))
      type = "boolean";
    stats.columnDataTypes[header] = type;

    // Missing values
    const missing = records.length - cleaned.length;
    stats.missingValuesPerColumn[header] = missing;
    stats.missingPercentPerColumn[header] = +(
      (missing / records.length) *
      100
    ).toFixed(2);

    // Unique values
    stats.uniqueValuesPerColumn[header] = new Set(cleaned).size;

    // Most frequent
    const freqMap = {};
    cleaned.forEach((v) => (freqMap[v] = (freqMap[v] || 0) + 1));
    stats.mostFrequentValuePerColumn[header] = cleaned.length
      ? Object.entries(freqMap).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
      : null;

    // Stats based on type
    if (type === "number") {
      const nums = cleaned.map(Number).filter((v) => !isNaN(v));
      nums.sort((a, b) => a - b);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const median = nums[Math.floor(nums.length / 2)];
      const std = Math.sqrt(meanOfSquares(nums, mean));
      stats.numericalStats[header] = {
        min: nums[0],
        max: nums[nums.length - 1],
        mean: +mean.toFixed(2),
        median: +median.toFixed(2),
        stdDev: +std.toFixed(2),
      };
    }

    if (type === "date") {
      const dates = cleaned.map((v) => new Date(v)).filter((d) => !isNaN(d));
      dates.sort((a, b) => a - b);
      stats.dateRanges[header] = {
        min: dates[0]?.toISOString().split("T")[0] ?? null,
        max: dates[dates.length - 1]?.toISOString().split("T")[0] ?? null,
      };
    }

    if (type === "boolean") {
      const bools = cleaned.map((v) => String(v).toLowerCase() === "true");
      const trueCount = bools.filter(Boolean).length;
      stats.booleanRatios[header] = {
        truePercent: +((trueCount / bools.length) * 100).toFixed(2),
        falsePercent: +(
          ((bools.length - trueCount) / bools.length) *
          100
        ).toFixed(2),
      };
    }

    if (type === "string") {
      const lengths = cleaned.map((v) => String(v).length);
      stats.stringLengthStats[header] = {
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
        avgLength: +(
          lengths.reduce((a, b) => a + b, 0) / lengths.length
        ).toFixed(2),
      };
    }
  });

  // Extra charts
  const charts = {};
  let category1, category2, category3;

  // Determine chart keys based on file type
  if (file.typeFichier === "EVAC") {
    category1 = "Etablissement";
    category2 = "Emploi";
    category3 = "Organisme de formation";
  } else if (file.typeFichier === "EVAF") {
    category1 = "Service";
    category2 = "Type de formation";
    category3 = "Libellé du stage";
  }

  [category1, category2, category3].forEach((key) => {
    if (headers.includes(key)) {
      const counts = {};
      records.forEach((r) => {
        const value = r[key] || "Inconnu";
        counts[value] = (counts[value] || 0) + 1;
      });

      charts[key] = Object.entries(counts).map(([label, value]) => ({
        name: label,
        value,
      }));
    }
  });

  stats.chartData = charts;

  return stats;
}

function meanOfSquares(arr, mean) {
  return (
    arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length
  );
}
