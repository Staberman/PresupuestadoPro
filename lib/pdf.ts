import jsPDF from 'jspdf';
import { Document, DocItem, calcTotal, unitLabel } from '@/lib/documents';
import { statusLabel } from '@/lib/status';
import type { Proposal } from '@/lib/proposals';
import { LOGO_WATERMARK } from '@/lib/logo-watermark';
import { PLUS_JAKARTA_SANS_REGULAR, PLUS_JAKARTA_SANS_BOLD } from '@/lib/plus-jakarta-sans';

function fmt(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

export interface BizPdf {
  name:     string;
  address:  string;
  phone:    string;
  email:    string;
  cuit:     string;
  currency: string;
  footer:   string;
}

function lineTotal(it: DocItem): number {
  const line = it.qty * it.price;
  return line - line * (it.disc || 0) / 100;
}

const W = 210, H = 297;
const lm = 18;
const rm = W - lm;
const cw = rm - lm;

const BG      = [42, 45, 53] as const;
const BAR     = [34, 37, 44] as const;
const TXT     = [255, 255, 255] as const;
const TXT2    = [176, 181, 192] as const;
const TXT3    = [128, 136, 152] as const;
const LINE_CLR= [52, 55, 65] as const;
const ACCENT  = [60, 128, 230] as const;

function registerFonts(pdf: jsPDF) {
  pdf.addFileToVFS('PlusJakartaSans-Regular.ttf', PLUS_JAKARTA_SANS_REGULAR);
  pdf.addFont('PlusJakartaSans-Regular.ttf', 'PlusJakartaSans', 'normal');
  pdf.addFileToVFS('PlusJakartaSans-Bold.ttf', PLUS_JAKARTA_SANS_BOLD);
  pdf.addFont('PlusJakartaSans-Bold.ttf', 'PlusJakartaSans', 'bold');
}

function addWatermark(pdf: jsPDF) {
  const size = 80;
  pdf.addImage(LOGO_WATERMARK, 'PNG', (W - size) / 2, (H - size) / 2, size, size, undefined, 'NONE');
}

function addBg(pdf: jsPDF) {
  pdf.setFillColor(...BG);
  pdf.rect(0, 0, W, H, 'F');
}

function setupPage(pdf: jsPDF) {
  addBg(pdf);
  addWatermark(pdf);
}

function drawFooter(pdf: jsPDF, text: string) {
  pdf.setFillColor(...BAR);
  pdf.rect(0, 282, W, 15, 'F');
  pdf.setTextColor(...TXT3);
  pdf.setFontSize(7);
  pdf.setFont('PlusJakartaSans', 'normal');
  pdf.text(text || 'Generado con PresupuestoPro', W / 2, 288, { align: 'center' });
  pdf.setFontSize(6);
  pdf.text('Generado con PresupuestoPro', W / 2, 293, { align: 'center' });
}

function drawDivider(pdf: jsPDF, y: number) {
  pdf.setDrawColor(...LINE_CLR);
  pdf.setLineWidth(0.3);
  pdf.line(lm, y, rm, y);
}

function headerBar(pdf: jsPDF) {
  pdf.setFillColor(...BAR);
  pdf.rect(0, 0, W, 20, 'F');
}

export function generatePDF(doc: Document, biz: BizPdf) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerFonts(pdf);
  const cur = biz.currency || 'ARS';
  const money = (n: number) => `${cur === 'ARS' ? '$' : cur + ' '}${fmt(n)}`;
  let y = 0;

  setupPage(pdf);

  headerBar(pdf);

  // ── CLIENT INFO ──
  y = 28;

  const clientLines: string[] = [];
  if (doc.clientCompany) clientLines.push(doc.clientCompany);
  if (doc.clientCuit) clientLines.push(`CUIT/CUIL: ${doc.clientCuit}`);
  if (doc.clientFiscalCondition) clientLines.push(`Condición fiscal: ${doc.clientFiscalCondition}`);
  if (doc.clientAddr) clientLines.push(doc.clientAddr);
  const contactLine = [doc.clientContactName, doc.clientContactRole].filter(Boolean).join(' · ');
  if (contactLine) clientLines.push(contactLine);
  const contactLines: string[] = [];
  if (doc.clientPhone) contactLines.push(`Tel: ${doc.clientPhone}`);
  if (doc.clientEmail) contactLines.push(`Email: ${doc.clientEmail}`);

  pdf.setTextColor(...TXT3);
  pdf.setFontSize(6.5);
  pdf.setFont('PlusJakartaSans', 'bold');
  pdf.text('CLIENTE', lm, y);

  let cy = y + 4.5;
  if (doc.clientName) {
    pdf.setTextColor(...TXT);
    pdf.setFontSize(9.5);
    pdf.setFont('PlusJakartaSans', 'bold');
    pdf.text(doc.clientName, lm, cy);
    cy += 4.5;
  }
  pdf.setTextColor(...TXT2);
  pdf.setFontSize(7.5);
  pdf.setFont('PlusJakartaSans', 'normal');
  clientLines.forEach(l => { pdf.text(l, lm, cy); cy += 4; });
  contactLines.forEach(l => { pdf.text(l, lm, cy); cy += 4; });

  const clientH = cy - y + 2;

  // Dates right
  const dx = rm - 60;
  pdf.setTextColor(...TXT3);
  pdf.setFontSize(6.5);
  pdf.setFont('PlusJakartaSans', 'bold');
  pdf.text('FECHA EMISIÓN', dx, y);
  pdf.setTextColor(...TXT);
  pdf.setFontSize(8.5);
  pdf.setFont('PlusJakartaSans', 'normal');
  pdf.text(doc.dateIssue || '—', dx, y + 4.5);
  if (doc.dateExpiry) {
    pdf.setTextColor(...TXT3);
    pdf.setFontSize(6.5);
    pdf.setFont('PlusJakartaSans', 'bold');
    pdf.text('VENCIMIENTO', dx, y + 10);
    pdf.setTextColor(...TXT);
    pdf.setFontSize(8.5);
    pdf.setFont('PlusJakartaSans', 'normal');
    pdf.text(doc.dateExpiry, dx, y + 14.5);
  }
  pdf.setTextColor(...TXT3);
  pdf.setFontSize(6.5);
  pdf.setFont('PlusJakartaSans', 'bold');
  pdf.text('ESTADO', dx, y + (doc.dateExpiry ? 19 : 10));
  pdf.setTextColor(...TXT);
  pdf.setFontSize(8.5);
  pdf.setFont('PlusJakartaSans', 'normal');
  pdf.text(statusLabel(doc.status), dx, y + (doc.dateExpiry ? 23.5 : 14.5));

  y += Math.max(clientH, 26) + 6;
  drawDivider(pdf, y);
  y += 5;

  // ── ITEMS TABLE ──
  const xDesc  = lm;
  const xQty   = lm + 80;
  const xUnit  = lm + 100;
  const xPrice = lm + 122;
  const xDisc  = lm + 146;
  const xTotal = rm;

  if (y + 8 > 250) { pdf.addPage(); setupPage(pdf); y = 24; }

  pdf.setFillColor(...BAR);
  pdf.rect(lm, y, cw, 7, 'F');
  pdf.setTextColor(...TXT2);
  pdf.setFontSize(6);
  pdf.setFont('PlusJakartaSans', 'bold');
  pdf.text('DESCRIPCIÓN', xDesc, y + 5);
  pdf.text('CANT.', xQty, y + 5, { align: 'center' });
  pdf.text('UNIDAD', xUnit, y + 5, { align: 'center' });
  pdf.text('TARIFA', xPrice, y + 5, { align: 'center' });
  pdf.text('DESC.%', xDisc, y + 5, { align: 'center' });
  pdf.text('TOTAL', xTotal, y + 5, { align: 'right' });
  y += 7;

  doc.items.forEach((it, i) => {
    const lineFinal = lineTotal(it);
    const descLines = pdf.splitTextToSize(it.desc || '', 76);
    const rowH = Math.max(8, descLines.length * 3.5 + 3);

    if (y + rowH > 240) { pdf.addPage(); setupPage(pdf); y = 24; }

    if (i % 2 === 0) {
      pdf.setFillColor(...BAR);
      pdf.rect(lm, y, cw, rowH, 'F');
    }

    pdf.setTextColor(...TXT);
    pdf.setFontSize(7);
    pdf.setFont('PlusJakartaSans', 'normal');
    pdf.text(descLines, xDesc, y + 4);

    pdf.setTextColor(...TXT3);
    pdf.text(String(it.qty), xQty, y + 4, { align: 'center' });
    pdf.text(unitLabel(it.unit, it.qty) || '—', xUnit, y + 4, { align: 'center' });
    pdf.text(money(it.price), xPrice, y + 4, { align: 'center' });
    pdf.text(it.disc ? `${it.disc}%` : '—', xDisc, y + 4, { align: 'center' });

    pdf.setTextColor(...TXT);
    pdf.setFont('PlusJakartaSans', 'bold');
    pdf.text(money(lineFinal), xTotal, y + 4, { align: 'right' });
    y += rowH;
  });

  // ── TOTALS ──
  y += 3;
  drawDivider(pdf, y);
  y += 4;

  const totX = rm - 60;

  function totRow(label: string, value: string, bold = false) {
    pdf.setFontSize(bold ? 9 : 7.5);
    pdf.setFont('PlusJakartaSans', bold ? 'bold' : 'normal');
    pdf.setTextColor(bold ? TXT[0] : TXT2[0], bold ? TXT[1] : TXT2[1], bold ? TXT[2] : TXT2[2]);
    pdf.text(label, totX, y);
    pdf.setTextColor(...TXT);
    pdf.text(value, rm, y, { align: 'right' });
    y += bold ? 6.5 : 5;
  }

  const sub = doc.items.reduce((a, it) => a + lineTotal(it), 0);

  totRow('Subtotal:', money(sub));
  if (doc.discount) totRow(`Descuento (${doc.discount}%):`, `-${money(sub * doc.discount / 100)}`);
  if (doc.ivaRate) totRow(`IVA (${doc.ivaRate}%):`, money((sub - sub * (doc.discount || 0) / 100) * doc.ivaRate / 100));

  // Total: subtle, just a line above + bold text
  drawDivider(pdf, y - 1);
  y += 4;
  pdf.setTextColor(...TXT);
  pdf.setFontSize(10);
  pdf.setFont('PlusJakartaSans', 'bold');
  pdf.text('TOTAL:', totX, y);
  pdf.text(money(calcTotal(doc)), rm, y, { align: 'right' });
  y += 14;

  // ── NOTES ──
  if (doc.notes) {
    if (y + 14 > 270) { pdf.addPage(); setupPage(pdf); y = 24; }
    pdf.setTextColor(...TXT3);
    pdf.setFontSize(6.5);
    pdf.setFont('PlusJakartaSans', 'bold');
    pdf.text('NOTAS Y CONDICIONES', lm, y);
    y += 4.5;
    pdf.setTextColor(...TXT2);
    pdf.setFontSize(7.5);
    pdf.setFont('PlusJakartaSans', 'normal');
    const noteLines = pdf.splitTextToSize(doc.notes, cw);
    pdf.text(noteLines, lm, y);
    y += noteLines.length * 4 + 3;
  }

  drawFooter(pdf, biz.footer || '');

  const fname = `${doc.type}-${doc.num || '001'}-${(doc.clientName || 'cliente').replace(/[^a-z0-9]/gi, '_')}.pdf`;
  pdf.save(fname);
}

export function generateProposalPDF(proposal: Proposal, biz: BizPdf) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerFonts(pdf);
  const cur = biz.currency || 'ARS';
  const money = (n: number) => `${cur === 'ARS' ? '$' : cur + ' '}${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  let y = 0;

  setupPage(pdf);

  headerBar(pdf);

  y = 28;

  // ── CLIENT INFO + DATE ──
  pdf.setTextColor(...TXT3);
  pdf.setFontSize(6.5);
  pdf.setFont('PlusJakartaSans', 'bold');
  pdf.text('FECHA', lm, y);

  pdf.setTextColor(...TXT);
  pdf.setFontSize(8);
  pdf.setFont('PlusJakartaSans', 'normal');
  pdf.text(proposal.dateIssue || '—', lm, y + 4.5);

  const clientLinesRight: string[] = [];
  if (proposal.clientName) clientLinesRight.push(proposal.clientName);
  if (proposal.clientCompany) clientLinesRight.push(proposal.clientCompany);
  if (proposal.clientPhone) clientLinesRight.push(`Tel: ${proposal.clientPhone}`);
  if (proposal.clientEmail) clientLinesRight.push(`Email: ${proposal.clientEmail}`);

  if (clientLinesRight.length) {
    pdf.setTextColor(...TXT3);
    pdf.setFontSize(6.5);
    pdf.setFont('PlusJakartaSans', 'bold');
    pdf.text('CLIENTE', rm - 90, y);

    pdf.setTextColor(...TXT);
    pdf.setFontSize(8);
    pdf.setFont('PlusJakartaSans', 'normal');
    let cy = y + 4.5;
    clientLinesRight.forEach(l => { pdf.text(l, rm - 90, cy); cy += 4; });
  }

  y += 18;

  // ── MONTO TOTAL ── just text, no card
  pdf.setTextColor(...TXT3);
  pdf.setFontSize(7);
  pdf.setFont('PlusJakartaSans', 'bold');
  pdf.text('MONTO TOTAL', lm, y);
  pdf.setTextColor(...TXT);
  pdf.setFontSize(13);
  pdf.setFont('PlusJakartaSans', 'bold');
  pdf.text(money(proposal.totalAmount), lm, y + 6);
  y += 14;

  drawDivider(pdf, y);
  y += 5;

  // ── SECCIONES ──
  let numberedCount = 0;
  for (const s of proposal.sections) {
    if (!s.isInfo) numberedCount++;

    const descLines = s.description ? pdf.splitTextToSize(s.description, cw) : [];
    const bulletHeights = s.bullets.map(b => Math.max(5, pdf.splitTextToSize(b, cw - 12).length * 3.5 + 1));
    const estH = 4 + (s.title ? 7 : 0) + (descLines.length ? descLines.length * 4 + 3 : 0) + bulletHeights.reduce((a, b) => a + b, 0) + 3;

    if (y + estH > 260) { pdf.addPage(); setupPage(pdf); y = 24; }

    let iy = y;
    const sectionNum = s.isInfo ? '' : `${numberedCount}. `;
    pdf.setTextColor(...TXT);
    pdf.setFontSize(11);
    pdf.setFont('PlusJakartaSans', 'bold');
    const stLines = pdf.splitTextToSize(`${sectionNum}${s.title}`, cw);
    pdf.text(stLines, lm, iy);
    iy += stLines.length * 5 + 2;

    if (s.description) {
      pdf.setTextColor(...TXT3);
      pdf.setFontSize(8);
      pdf.setFont('PlusJakartaSans', 'normal');
      pdf.text(descLines, lm, iy);
      iy += descLines.length * 4 + 3;
    }

    for (const b of s.bullets) {
      if (iy > 270) { pdf.addPage(); setupPage(pdf); iy = 28; }
      pdf.setTextColor(...ACCENT);
      pdf.setFontSize(6.5);
      pdf.text('•', lm, iy);
      pdf.setTextColor(...TXT2);
      pdf.setFontSize(8);
      pdf.setFont('PlusJakartaSans', 'normal');
      const bText = pdf.splitTextToSize(b, cw - 12);
      pdf.text(bText, lm + 6, iy);
      iy += Math.max(5, bText.length * 3.5 + 1);
    }

    y = iy + 6;
  }

  // ── NOTES ──
  if (proposal.notes) {
    if (y + 14 > 260) { pdf.addPage(); setupPage(pdf); y = 24; }
    pdf.setTextColor(...TXT3);
    pdf.setFontSize(6.5);
    pdf.setFont('PlusJakartaSans', 'bold');
    pdf.text('NOTAS INTERNAS', lm, y);
    y += 4.5;
    pdf.setTextColor(...TXT2);
    pdf.setFontSize(7.5);
    pdf.setFont('PlusJakartaSans', 'normal');
    const noteLines = pdf.splitTextToSize(proposal.notes, cw);
    pdf.text(noteLines, lm, y);
    y += noteLines.length * 4 + 3;
  }

  drawFooter(pdf, biz.footer || '');

  const fname = `propuesta-${proposal.num || '001'}-${(proposal.clientName || 'cliente').replace(/[^a-z0-9]/gi, '_')}.pdf`;
  pdf.save(fname);
}
