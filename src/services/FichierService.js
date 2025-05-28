// src/services/FichierService.js
import Fichier from "../models/Fichier.js";

// ✅ Save new file metadata
export const saveFileMetadata = async ({
  nomFichier,
  typeFichier,
  natureFichier,
  cheminFichier,
  formatFichier,
  tailleFichier,
}) => {
  const file = new Fichier({
    nomFichier,
    typeFichier,
    natureFichier,
    cheminFichier,
    formatFichier,
    tailleFichier,
  });

  return await file.save();
};

// ✅ Get all fichiers
export const getAllFichiers = async () => {
  return await Fichier.find().sort({ dateImportation: -1 });
};

// ✅ Get fichier by ID
export const getFichierById = async (id) => {
  return await Fichier.findById(id);
};

// ✅ Delete a fichier by ID
export const deleteFichierById = async (id) => {
  return await Fichier.findByIdAndDelete(id);
};
