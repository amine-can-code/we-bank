import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fichier",
      required: true,
    },
    fileType: {
      type: String,
      enum: ["EVAC", "EVAF"],
      required: true,
    },
    kpis: {
      type: [String],
      default: [],
    },
    criteria: {
      type: [String],
      default: [],
    },
    pdfPath: {
      type: String,
      required: true,
    },
    wordPath: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "reports",
  }
);

export default mongoose.model("Report", ReportSchema);
