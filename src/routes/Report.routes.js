import express from "express";
import {
  createReport,
  getAllReports,
  getReportById,
  downloadPDFReport,
  downloadWordReport,
} from "../controllers/ReportController.js";

const router = express.Router();

// Create report
router.post("/", createReport);

// Get all reports
router.get("/", getAllReports);

// Get one report
router.get("/:id", getReportById);

// ✅ Download PDF by report ID
router.get("/:id/download/pdf", downloadPDFReport);

// ✅ Download Word by report ID
router.get("/:id/download/word", downloadWordReport);

export default router;
