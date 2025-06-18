import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import path from "path";
import fs from "fs";

const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export async function generateContenuPedagogieChart(data, filename) {
  const configuration = {
    type: "bar",
    data: {
      labels: [
        "Adaptation aux besoins",
        "Atteinte des objectifs",
        "Transposition",
        "Méthodes pédagogiques",
        // Skip "Équilibre entre théorique/pratique"
        "Documentation reçue",
        "Clarté des explications",
      ],
      datasets: [
        {
          label: "Scores Moyens (%)",
          data: data,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Contenu et pédagogie",
          font: {
            size: 22,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  const filePath = path.join("generated-reports", filename);
  fs.writeFileSync(filePath, image);
  return filePath;
}
