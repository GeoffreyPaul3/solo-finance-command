import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReportPdfData {
  title: string;
  subtitle?: string;
  workspaceName: string;
  logoUrl?: string | null;
  periodLabel: string;
  currency: string;
  metrics: { label: string; value: string }[];
  tables: {
    title: string;
    headers: string[];
    rows: (string | number)[][];
  }[];
  generatedAt?: string;
}

/**
 * Loads an image from a URL into an HTMLImageElement or data URL.
 * Falls back gracefully to null on any network or CORS error.
 */
async function tryLoadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url || typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateReportPdf(data: ReportPdfData, filename?: string): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let currentY = margin;

  // 1. Header & Logo
  let logoLoaded = false;
  if (data.logoUrl) {
    try {
      const img = await tryLoadImage(data.logoUrl);
      if (img) {
        doc.addImage(img, "PNG", margin, currentY, 48, 48);
        logoLoaded = true;
      }
    } catch {
      // Graceful fallback: logo fails silently without blocking report generation
      logoLoaded = false;
    }
  }

  const textStartX = logoLoaded ? margin + 60 : margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(24, 24, 27); // #18181b
  doc.text(data.workspaceName, textStartX, currentY + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(82, 82, 91); // #52525b
  doc.text(data.title, textStartX, currentY + 36);

  currentY += 65;

  // Horizontal divider
  doc.setDrawColor(228, 228, 231); // #e4e4e7
  doc.setLineWidth(1);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 20;

  // Period and Generation info
  doc.setFontSize(10);
  doc.setTextColor(113, 113, 122); // #71717a
  doc.text(`Period: ${data.periodLabel}`, margin, currentY);
  doc.text(
    `Generated: ${data.generatedAt || new Date().toLocaleDateString()}`,
    pageWidth - margin,
    currentY,
    { align: "right" },
  );
  currentY += 25;

  // 2. Key Metrics Summary Cards
  if (data.metrics && data.metrics.length > 0) {
    const cardWidth =
      (pageWidth - margin * 2 - (data.metrics.length - 1) * 12) / data.metrics.length;
    data.metrics.forEach((metric, idx) => {
      const cardX = margin + idx * (cardWidth + 12);

      // Card background
      doc.setFillColor(244, 244, 245); // #f4f4f5
      doc.roundedRect(cardX, currentY, cardWidth, 48, 4, 4, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(113, 113, 122);
      doc.text(metric.label.toUpperCase(), cardX + 10, currentY + 16);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(24, 24, 27);
      doc.text(metric.value, cardX + 10, currentY + 36);
    });

    currentY += 65;
  }

  // 3. Tables
  for (const table of data.tables) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(24, 24, 27);
    doc.text(table.title, margin, currentY);
    currentY += 8;

    autoTable(doc, {
      startY: currentY,
      head: [table.headers],
      body: table.rows,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: {
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9.5,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [39, 39, 42],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
    });

    const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    currentY = (lastTable?.finalY ?? currentY + 40) + 25;
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170);
    doc.text(
      `SoloOS Financial Operating System — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  if (filename && typeof window !== "undefined") {
    doc.save(filename);
  }

  return doc;
}
