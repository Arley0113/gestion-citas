import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const GREEN     = [57, 169, 0];
const GRAY_DARK = [17, 24, 39];
const GRAY      = [107, 114, 128];
const MARGIN    = 40;

function ensureSpace(doc, y, needed) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 50) {
    doc.addPage();
    return 60;
  }
  return y;
}

function sectionTitle(doc, text, y) {
  doc.setTextColor(...GRAY_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(text, MARGIN, y);
  return y + 6;
}

function statTable(doc, y, head, rows) {
  autoTable(doc, {
    startY: y + 6,
    head: [head],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 6, textColor: GRAY_DARK },
    margin: { left: MARGIN, right: MARGIN },
  });
  return doc.lastAutoTable.finalY + 26;
}

// data: { total, byStatus:[{status,count}], byDep:[{name,count}], monthly:[{month,total}], byProgram:[{name,count,pct}] }
// statusLabels: mismo STATUS_CONFIG de ReportsDashboard.jsx, { [status]: { label } }
export function generateReportPDF(data, periodLabel, statusLabels) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  // ── Encabezado ──
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageWidth, 92, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("Bienestar SENA", MARGIN, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Panel de reportes — Sistema de citas", MARGIN, 60);

  doc.setFontSize(9);
  doc.text(`Período: ${periodLabel}`, pageWidth - MARGIN, 40, { align: "right" });
  doc.text(`Generado: ${format(now, "d 'de' MMMM yyyy, h:mm a", { locale: es })}`, pageWidth - MARGIN, 54, { align: "right" });

  let y = 118;

  // ── KPIs ──
  const completed = data.byStatus.find(s => s.status === "completed")?.count ?? 0;
  const pendingTotal = (data.byStatus.find(s => s.status === "pending")?.count ?? 0)
    + (data.byStatus.find(s => s.status === "confirmed")?.count ?? 0);
  const noShow = data.byStatus.find(s => s.status === "no_show")?.count ?? 0;
  const attendanceRate = data.total ? Math.round((completed / data.total) * 100) : 0;

  const kpis = [
    { label: "Total citas",     value: String(data.total) },
    { label: "Completadas",     value: String(completed) },
    { label: "Pendientes",      value: String(pendingTotal) },
    { label: "No asistieron",   value: String(noShow) },
    { label: "Tasa asistencia", value: `${attendanceRate}%` },
  ];
  const gap  = 8;
  const kpiW = (pageWidth - MARGIN * 2 - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (kpiW + gap);
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, y, kpiW, 54, 5, 5, "FD");
    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(k.label, x + 8, y + 18, { maxWidth: kpiW - 16 });
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(k.value, x + 8, y + 41);
  });
  y += 78;

  // ── Citas por estado ──
  y = sectionTitle(doc, "Citas por estado", y);
  const statusRows = data.byStatus
    .slice()
    .sort((a, b) => b.count - a.count)
    .map(s => {
      const label = statusLabels?.[s.status]?.label || s.status;
      const pct = data.total ? Math.round((s.count / data.total) * 100) : 0;
      return [label, String(s.count), `${pct}%`];
    });
  y = statTable(doc, y, ["Estado", "Cantidad", "% del total"], statusRows);

  // ── Citas por dependencia ──
  y = ensureSpace(doc, y, 120);
  y = sectionTitle(doc, "Citas por dependencia", y);
  const depRows = data.byDep.map(d => {
    const pct = data.total ? Math.round((d.count / data.total) * 100) : 0;
    return [d.name, String(d.count), `${pct}%`];
  });
  y = statTable(doc, y, ["Dependencia", "Cantidad", "% del total"], depRows);

  // ── Tendencia mensual ──
  if (data.monthly?.length) {
    y = ensureSpace(doc, y, 120);
    y = sectionTitle(doc, "Tendencia mensual", y);
    y = statTable(doc, y, ["Mes", "Total citas"], data.monthly.map(m => [m.month, String(m.total)]));
  }

  // ── Top programas ──
  const programs = data.byProgram?.length ? data.byProgram : [];
  if (programs.length) {
    y = ensureSpace(doc, y, 140);
    y = sectionTitle(doc, "Top programas con más citas", y);
    statTable(doc, y, ["Programa de formación", "Citas", "%"], programs.map(p => [p.name, String(p.count), `${p.pct}%`]));
  }

  // ── Pie de página en cada hoja ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN, pageHeight - 34, pageWidth - MARGIN, pageHeight - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("Bienestar SENA — Sistema de citas", MARGIN, pageHeight - 20);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - MARGIN, pageHeight - 20, { align: "right" });
  }

  return doc;
}
