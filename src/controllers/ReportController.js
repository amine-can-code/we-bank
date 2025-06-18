import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createReport as createReportService,
  getAllReports as getAllReportsService,
  getReportById as getReportByIdService,
} from "../services/ReportService.js";

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Points to src/generated-reports
const reportsDir = path.join(__dirname, "../generated-reports");

export const createReport = async (req, res) => {
  try {
    const { title, kpis, criteria, fileId, fileType } = req.body;

    if (!title || !Array.isArray(kpis) || !Array.isArray(criteria)) {
      return res.status(400).json({ message: "Invalid report data" });
    }

    const savedReport = await createReportService({
      title,
      kpis,
      criteria,
      fileId,
      fileType,
    });

    return res.status(201).json({
      message: "Report created successfully",
      reportId: savedReport._id,
    });
  } catch (error) {
    console.error("Error creating report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const reports = await getAllReportsService();
    return res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await getReportByIdService(id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.status(200).json(report);
  } catch (error) {
    console.error("Error fetching report by ID:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const downloadPDFReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await getReportByIdService(id);

    if (!report || !report.pdfPath) {
      return res.status(404).json({ message: "PDF report not found" });
    }

    const absolutePath = path.join(reportsDir, path.basename(report.pdfPath));
    console.log("📁 Looking for file at:", absolutePath);
    console.log("📄 Report object:", report);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "PDF file missing on disk" });
    }

    return res.download(absolutePath, `${report.title}.pdf`);
  } catch (error) {
    console.error("Download PDF error:", error);
    return res.status(500).json({ message: "Failed to download PDF" });
  }
};

export const downloadWordReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await getReportByIdService(id);

    if (!report || !report.wordPath) {
      return res.status(404).json({ message: "Word report not found" });
    }

    const absolutePath = path.join(reportsDir, path.basename(report.wordPath));
    console.log("📁 Looking for file at:", absolutePath);
    console.log("📄 Report object:", report);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "Word file missing on disk" });
    }

    return res.download(absolutePath, `${report.title}.docx`);
  } catch (error) {
    console.error("Download Word error:", error);
    return res.status(500).json({ message: "Failed to download Word file" });
  }
};
