import mongoose from "mongoose";

const fichierSchema = new mongoose.Schema({
  nomFichier: {
    type: String,
    required: true,
  },
  typeFichier: {
    type: String,
    enum: ["EVAC", "EVAF"],
    required: true,
  },
  natureFichier: {
    type: String,
    enum: ["globale", "detaillé"],
    required: true,
  },
  cheminFichier: {
    type: String,
    required: true,
  },
  dateImportation: {
    type: Date,
    default: Date.now,
  },
  formatFichier: {
    type: String,
  },
  tailleFichier: {
    type: Number,
  },
  statutValidation: {
    type: String,
    default: "Pending",
  },
  statutAnalyse: {
    type: String,
    default: "Not started",
  },
});

export default mongoose.model("Fichier", fichierSchema);
