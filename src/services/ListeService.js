import Liste from "../models/Liste.js";
import { Parser } from "json2csv";
import * as XLSX from "xlsx";

export const createListe = async ({ listName, listType, participants }) => {
  const totalParticipants = participants.length;

  const completed = participants.filter(
    (p) => p.statut?.toLowerCase() === "terminé"
  ).length;

  const responseRate =
    totalParticipants > 0
      ? Number(((completed / totalParticipants) * 100).toFixed(2))
      : 0;

  return await Liste.create({
    listName,
    listType,
    participants,
    totalParticipants,
    responseRate,
  });
};

export const getListeByIdAsCSV = async (id) => {
  const liste = await Liste.findById(id);
  if (!liste) throw new Error("Liste not found");

  // 🔍 Filter participants with "en cours"
  const filtered = liste.participants.filter(
    (p) => p.statut?.toLowerCase() === "en cours"
  );

  const parser = new Parser();
  const csv = parser.parse(filtered);
  return { csv, name: liste.listName };
};

export const getListeByIdAsXLSX = async (id) => {
  const liste = await Liste.findById(id);
  if (!liste) throw new Error("Liste not found");

  // 🔍 Filter participants with "en cours"
  const filtered = liste.participants.filter(
    (p) => p.statut?.toLowerCase() === "en cours"
  );

  const headers = ["matricule", "nom", "prenom", "mail", "statut"];
  const data = filtered.map((p) => ({
    matricule: p.matricule,
    nom: p.nom,
    prenom: p.prenom,
    mail: p.mail,
    statut: p.statut,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Liste");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return { buffer, name: liste.listName };
};

export const getAllListes = async () => {
  return await Liste.find().sort({ createdAt: -1 });
};
