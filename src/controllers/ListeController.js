import {
  createListe,
  getListeByIdAsCSV,
  getListeByIdAsXLSX,
  getAllListes,
} from "../services/ListeService.js";

export const generateListe = async (req, res) => {
  try {
    const { listName, listType, participants } = req.body;

    if (!listName || !listType || !Array.isArray(participants)) {
      return res.status(400).json({ message: "Invalid payload." });
    }

    const saved = await createListe({ listName, listType, participants });

    res.status(201).json({
      message: "✅ Liste document created",
      data: saved,
    });
  } catch (error) {
    console.error("Error generating liste:", error);
    res.status(500).json({ error: "Server error while generating liste" });
  }
};

export const downloadListeAsCSV = async (req, res) => {
  try {
    const { csv, name } = await getListeByIdAsCSV(req.params.id);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${name}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    console.error("Error exporting liste as CSV:", error);
    res.status(500).json({ error: "Server error while generating CSV" });
  }
};

export const downloadListeAsXLSX = async (req, res) => {
  try {
    const { buffer, name } = await getListeByIdAsXLSX(req.params.id);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${name}.xlsx`);
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Error exporting liste as XLSX:", error);
    res.status(500).json({ error: "Server error while generating XLSX" });
  }
};

export const fetchAllListes = async (req, res) => {
  try {
    const listes = await getAllListes();
    res.status(200).json(listes);
  } catch (error) {
    console.error("Error fetching listes:", error);
    res.status(500).json({ error: "Server error while fetching listes" });
  }
};
