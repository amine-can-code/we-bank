import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import * as docx from "docx";
import Report from "../models/Report.js";
import xlsx from "xlsx";
import Fichier from "../models/Fichier.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Chart, registerables } from "chart.js";

// Register Chart.js components
Chart.register(...registerables);

// Register the plugin
Chart.register(ChartDataLabels);

const reportsDir =
  process.env.NODE_ENV === "production"
    ? "/tmp/generated-reports"
    : path.join(process.cwd(), "generated-reports");

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const generatePDF = async (
  title,
  kpis,
  criteria,
  filename,
  fileType,
  fileId
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const pdfPath = path.join(reportsDir, filename);
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc.fontSize(20).text(title, { align: "center" }).moveDown(1.5);

      if (kpis.length) {
        doc.fontSize(14).text("KPIs");
        kpis.forEach((kpi, i) => {
          doc.text(`   ${String.fromCharCode(65 + i)}. ${kpi}`);
        });
        doc.moveDown();
      }

      const subpoints =
        fileType === "EVAC"
          ? {
              "Contenu et pédagogie": [
                "Adaptation de la formation aux besoins",
                "Atteintes des objectifs",
                "Transposition des connaissances fournies",
                "Méthodes pédagogiques utilisées",
                "Pertinence de la documentation reçue",
                "Clarté et qualité des explications",
              ],
              "Participants et groupe": [
                "Composition du groupe (nombre, niveau, homogénéité, etc.)",
              ],
              Formateurs: [
                "L'expertise du formateur sur le sujet",
                "Animation de la formation (rythme, dynamisme, engagement, etc.)",
              ],
              "Organisation logistique": [
                "Durée de la formation",
                "Logistique (salle, matériel, outils, environnement, etc.)",
                "Accueil et assistance (support, communication, accès, disponibilité, etc.)",
              ],
            }
          : {};

      const file = await Fichier.findById(fileId);
      if (!file) throw new Error("Fichier introuvable");
      const filePath = path.normalize(file.cheminFichier);

      let chartCount = 0;

      for (let i = 0; i < criteria.length; i++) {
        const crit = criteria[i];
        doc.fontSize(14).text(`${String.fromCharCode(65 + i)}. ${crit}`);
        const details = subpoints[crit] || [];

        for (let j = 0; j < details.length; j++) {
          const item = details[j];
          doc.moveDown(0.5).text(`   ${j + 1}. ${item}`);

          let stats = {};
          let chartBuffer;

          // Match the function for each criterion
          switch (item) {
            case "Adaptation de la formation aux besoins":
              stats = getAdaptationNotationCounts(filePath);
              chartBuffer = await renderPieChartBuffer(stats);
              break;
            case "Atteintes des objectifs":
              stats = getAtteinteObjectifsCounts(filePath);
              chartBuffer = await renderDonutChartBuffer(stats);
              break;
            case "Transposition des connaissances fournies":
              stats = getTranspositionNotationCounts(filePath);
              chartBuffer = await renderBarChartBuffer(stats);
              break;
            case "Méthodes pédagogiques utilisées":
              stats = getMethodesPedagogiquesCounts(filePath);
              chartBuffer = await renderBarChartBuffer(stats);
              break;
            case "Pertinence de la documentation reçue":
              stats = getPertinenceDocumentationCounts(filePath);
              chartBuffer = await renderPieChartBuffer(stats);
              break;
            case "Clarté et qualité des explications":
              stats = getClarteQualiteExplicationsCounts(filePath);
              chartBuffer = await renderPieChartBuffer(stats);
              break;
            case "L'expertise du formateur sur le sujet":
              stats = getExpertiseFormateurCounts(filePath);
              chartBuffer = await renderPieChartBuffer(stats);
              break;
            case "Animation de la formation (rythme, dynamisme, engagement, etc.)":
              stats = getAnimationFormationCounts(filePath);
              chartBuffer = await renderPieChartBuffer(stats);
              break;
            case "Composition du groupe (nombre, niveau, homogénéité, etc.)":
              stats = getCompositionGroupeCounts(filePath);
              chartBuffer = await renderBarChartBuffer(stats);
              break;
            case "Durée de la formation":
              stats = getDureeFormationCounts(filePath);
              chartBuffer = await renderBarChartBuffer(stats);
              break;
            case "Logistique (salle, matériel, outils, environnement, etc.)":
              stats = getLogistiqueCounts(filePath);
              chartBuffer = await renderPieChartBuffer(stats);
              break;
            case "Accueil et assistance (support, communication, accès, disponibilité, etc.)":
              stats = getAccueilAssistanceCounts(filePath);
              chartBuffer = await renderDonutChartBuffer(stats);
              break;
          }

          if (Object.keys(stats).length && chartBuffer) {
            doc.moveDown(0.5);
            doc.image(chartBuffer, {
              fit: [350, 240],
              align: "center",
              valign: "center",
            });

            chartCount++;
            if (chartCount % 2 === 0) {
              doc.addPage();
            } else {
              doc.moveDown(1);
            }
          }
        }

        doc.moveDown();
      }

      doc.end();
      stream.on("finish", () => resolve(filename));
      stream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

const generateWord = async (
  title,
  kpis,
  criteria,
  filename,
  fileType,
  fileId
) => {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;

  const paragraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true, size: 36 })],
      spacing: { after: 300 },
    }),
  ];

  if (kpis.length) {
    paragraphs.push(new Paragraph({ text: "KPIs", bold: true }));
    kpis.forEach((kpi, i) => {
      paragraphs.push(
        new Paragraph({ text: `   ${String.fromCharCode(65 + i)}. ${kpi}` })
      );
    });
  }

  paragraphs.push(new Paragraph({ text: "Critères d’évaluation", bold: true }));

  const subpoints = {
    "Contenu et pédagogie": [
      ...(fileType === "EVAC"
        ? ["Adaptation de la formation aux besoins"]
        : []),
      ...(fileType === "EVAC" ? ["Atteintes des objectifs"] : []),
      "Transposition des connaissances fournies",
      "Méthodes pédagogiques utilisées",
      "Pertinence de la documentation reçue",
      "Clarté et qualité des explications",
    ],
    Formateurs: [
      "L'expertise du formateur sur le sujet",
      "Animation de la formation (rythme, dynamisme, engagement, etc.)",
    ],
    "Participants et groupe": [
      "Composition du groupe (nombre, niveau, homogénéité, etc.)",
    ],
    "Organisation logistique": [
      "Durée de la formation",
      "Logistique (salle, matériel, outils, environnement, etc.)",
      "Accueil et assistance (support, communication, accès, disponibilité, etc.)",
    ],
  };
  const file = await Fichier.findById(fileId);
  if (!file) throw new Error("Fichier introuvable");
  const filePath = path.normalize(file.cheminFichier);
  for (let i = 0; i < criteria.length; i++) {
    const crit = criteria[i];
    paragraphs.push(
      new Paragraph({ text: `   ${String.fromCharCode(65 + i)}. ${crit}` })
    );

    const details = subpoints[crit] || [];
    for (let j = 0; j < details.length; j++) {
      const item = details[j];
      paragraphs.push(new Paragraph({ text: `      ${j + 1}. ${item}` }));

      if (
        fileType === "EVAC" &&
        crit === "Contenu et pédagogie" &&
        item === "Adaptation de la formation aux besoins"
      ) {
        const stats = getAdaptationNotationCounts(filePath); // keep as-is for now
        if (Object.keys(stats).length) {
          const chartBuffer = await renderPieChartBuffer(stats);

          paragraphs.push(
            new Paragraph({
              children: [
                new docx.ImageRun({
                  data: chartBuffer,
                  transformation: {
                    width: 400,
                    height: 400,
                  },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200 },
            })
          );
        }
      }
      if (
        fileType === "EVAC" &&
        crit === "Contenu et pédagogie" &&
        item === "Atteintes des objectifs"
      ) {
        const stats = getAtteinteObjectifsCounts(filePath);
        if (Object.keys(stats).length) {
          const total = Object.values(stats).reduce((sum, val) => sum + val, 0);
          paragraphs.push(new Paragraph({ text: "Résultats:", bold: true }));
          Object.entries(stats).forEach(([note, count]) => {
            const percent = ((count / total) * 100).toFixed(1);
            paragraphs.push(
              new Paragraph({
                text: `   - ${note}: ${count} réponses (${percent}%)`,
              })
            );
          });

          // ✅ add this chart code here:
          const chartBuffer = await renderDonutChartBuffer(stats);
          paragraphs.push(
            new Paragraph({
              children: [
                new docx.ImageRun({
                  data: chartBuffer,
                  transformation: {
                    width: 400,
                    height: 400,
                  },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200 },
            })
          );
        }
      }
      if (
        fileType === "EVAC" &&
        crit === "Contenu et pédagogie" &&
        item === "Transposition des connaissances fournies"
      ) {
        const stats = getTranspositionNotationCounts(filePath);
        if (Object.keys(stats).length) {
          const total = Object.values(stats).reduce((sum, val) => sum + val, 0);
          paragraphs.push(new Paragraph({ text: "Résultats:", bold: true }));
          Object.entries(stats).forEach(([note, count]) => {
            const percent = ((count / total) * 100).toFixed(1);
            paragraphs.push(
              new Paragraph({
                text: `   - ${note}: ${count} réponses (${percent}%)`,
              })
            );
          });

          // ✅ render and insert bar chart
          const chartBuffer = await renderBarChartBuffer(stats);
          paragraphs.push(
            new Paragraph({
              children: [
                new docx.ImageRun({
                  data: chartBuffer,
                  transformation: {
                    width: 400,
                    height: 300,
                  },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200 },
            })
          );
        }
      }
    }
  }

  const doc = new Document({ sections: [{ children: paragraphs }] });
  const buffer = await Packer.toBuffer(doc);
  const wordPath = path.join(reportsDir, filename);
  fs.writeFileSync(wordPath, buffer);
  return filename;
};

// 📥 Create report
export const createReport = async ({
  title,
  kpis,
  criteria,
  fileId,
  fileType,
}) => {
  const baseName = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const timestamp = Date.now();

  const pdfFilename = `${baseName}_${timestamp}.pdf`;
  const wordFilename = `${baseName}_${timestamp}.docx`;

  const pdfPath = await generatePDF(
    title,
    kpis,
    criteria,
    pdfFilename,
    fileType,
    fileId
  );
  const wordPath = await generateWord(
    title,
    kpis,
    criteria,
    wordFilename,
    fileType,
    fileId
  );

  const saved = await Report.create({
    title,
    kpis,
    criteria,
    pdfPath,
    wordPath,
    fileId,
    fileType,
  });

  return saved;
};

// 📃 Get all
export const getAllReports = async () => {
  return await Report.find().sort({ createdAt: -1 });
};

// 🔎 Get one
export const getReportById = async (id) => {
  return await Report.findById(id);
};

// Optional: specific paths
export const getPDFPathById = async (id) => {
  const report = await Report.findById(id);
  return report?.pdfPath;
};

export const getWordPathById = async (id) => {
  const report = await Report.findById(id);
  return report?.wordPath;
};

// helper functions critères d'évaluation

export const getAdaptationNotationCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "Adaptation de la formation aux besoins";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    data.forEach((row) => {
      if (row[critKey]?.trim() === targetLabel) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error("❌ Failed to extract adaptation ratings:", err);
    return {};
  }
};

export const getAtteinteObjectifsCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "Atteintes des objectifs";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    data.forEach((row) => {
      if (row[critKey]?.trim() === targetLabel) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error(
      "❌ Failed to extract 'Atteinte des objectifs' ratings:",
      err
    );
    return {};
  }
};

export const getTranspositionNotationCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "Transposition des connaissances fournies";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error(
      "❌ Failed to extract 'Transposition des connaissances fournies' ratings:",
      err
    );
    return {};
  }
};

export const getMethodesPedagogiquesCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "Méthodes pédagogiques utilisées";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error(
      "❌ Failed to extract 'Méthodes pédagogiques utilisées' ratings:",
      err
    );
    return {};
  }
};

export const getPertinenceDocumentationCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "Pertinence de la documentation reçue";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error(
      "❌ Failed to extract 'Pertinence de la documentation reçue' ratings:",
      err
    );
    return {};
  }
};

export const getClarteQualiteExplicationsCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "La clarté et la qualité des explications";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error(
      "❌ Failed to extract 'Clarté et qualité des explications' ratings:",
      err
    );
    return {};
  }
};

export const getExpertiseFormateurCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "L'expertise du formateur sur le sujet";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error(
      "❌ Failed to extract 'L’expertise du formateur sur le sujet' ratings:",
      err
    );
    return {};
  }
};

export const getAnimationFormationCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "L'animation de la formation (rythme, ...)";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error(
      "❌ Failed to extract 'Animation de la formation' ratings:",
      err
    );
    return {};
  }
};

export const getCompositionGroupeCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "Composition du groupe (nbr, niveau, ...)";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error("❌ Failed to extract 'Composition du groupe' ratings:", err);
    return {};
  }
};

export const getDureeFormationCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "Durée";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error("❌ Failed to extract 'Durée de la formation' ratings:", err);
    return {};
  }
};

export const getLogistiqueCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "Logistique (salle, matériel, ...)";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error("❌ Failed to extract 'Logistique' ratings:", err);
    return {};
  }
};

export const getAccueilAssistanceCounts = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const targetLabel = "Accueil et assistance";
    const critKey = "Critères";
    const notationKey = "Notation à chaud";

    const result = {};

    const normalize = (s) =>
      s?.toString().trim().toLowerCase().replace(/\s+/g, " ");

    data.forEach((row) => {
      if (normalize(row[critKey]) === normalize(targetLabel)) {
        const note = row[notationKey]?.trim();
        if (note) {
          result[note] = (result[note] || 0) + 1;
        }
      }
    });

    return result;
  } catch (err) {
    console.error("❌ Failed to extract 'Accueil et assistance' ratings:", err);
    return {};
  }
};

// charts

const renderPieChartBuffer = async (stats) => {
  const width = 500;
  const height = 500;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const total = Object.values(stats).reduce((sum, val) => sum + val, 0);

  const configuration = {
    type: "pie",
    data: {
      labels: Object.keys(stats).map((label) => {
        const value = stats[label];
        const percentage = ((value / total) * 100).toFixed(1);
        return `${label} (${percentage}%)`;
      }),
      datasets: [
        {
          data: Object.values(stats),
          backgroundColor: [
            "#FF9800",
            "#4CAF50",
            "#2196F3",
            "#9C27B0",
            "#FFC107",
            "#03A9F4",
          ],
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            font: { size: 12 },
          },
        },
        title: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || "";
              const value = context.raw || 0;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
        datalabels: {
          formatter: (value) => {
            const percentage = ((value / total) * 100).toFixed(1);
            return `${percentage}%`;
          },
          color: "#fff",
          font: {
            weight: "bold",
            size: 14,
          },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};

export const renderDonutChartBuffer = async (stats) => {
  const width = 500;
  const height = 500;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const total = Object.values(stats).reduce((sum, val) => sum + val, 0);

  const configuration = {
    type: "doughnut",
    data: {
      labels: Object.keys(stats).map((label) => {
        const value = stats[label];
        const percentage = ((value / total) * 100).toFixed(1);
        return `${label} (${percentage}%)`;
      }),
      datasets: [
        {
          data: Object.values(stats),
          backgroundColor: [
            "#FF9800",
            "#4CAF50",
            "#2196F3",
            "#9C27B0",
            "#FFC107",
            "#03A9F4",
          ],
        },
      ],
    },
    options: {
      cutout: "50%", // 👈 this makes it a donut
      plugins: {
        legend: {
          display: true,
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || "";
              const value = context.raw || 0;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
        datalabels: {
          formatter: (value) => {
            const percentage = ((value / total) * 100).toFixed(1);
            return `${percentage}%`;
          },
          color: "#fff",
          font: {
            weight: "bold",
            size: 14,
          },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};

export const renderBarChartBuffer = async (stats) => {
  const width = 600;
  const height = 400;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const total = Object.values(stats).reduce((sum, val) => sum + val, 0);

  const labelsWithCounts = Object.entries(stats).map(
    ([label, count]) => `${label} (${count})`
  );

  const configuration = {
    type: "bar",
    data: {
      labels: labelsWithCounts, // ✅ use the new labels with counts
      datasets: [
        {
          label: "Nombre de réponses",
          data: Object.values(stats),
          backgroundColor: "#2196F3",
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "x",
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: "Nombre de réponses",
          },
        },
        x: {
          title: {
            display: true,
            text: "Notation",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw;
              const percent = ((value / total) * 100).toFixed(1);
              return `${value} réponses (${percent}%)`;
            },
          },
        },
        datalabels: {
          anchor: "end",
          align: "top",
          color: "#000",
          font: {
            weight: "bold",
          },
          formatter: (value) => `${value}`,
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};
