import jsPDF from 'jspdf';
import { Document, calcTotal } from '@/lib/documents';

function fmt(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

export function generatePDF(doc: Document, biz: {
  name: string;
  address: string;
  phone: string;
  email: string;
  cuit: string;
}, isPro: boolean) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const lm = 15;
  const rm = W - lm;
  const cw = rm - lm;
  let y = 0;

  // ── HEADER ──────────────────────────────────────────
  pdf.setFillColor(15, 45, 110);
  pdf.rect(0, 0, W, 42, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(biz.name || 'Tu Empresa', lm, 16);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(147, 173, 245);
  const bizLines = [biz.address, biz.phone, biz.email, biz.cuit ? `CUIT: ${biz.cuit}` : ''].filter(Boolean);
  bizLines.forEach((line, i) => pdf.text(line, lm, 24 + i * 4.5));

  // Doc type badge
  const typeLabel = doc.type === 'presupuesto' ? 'PRESUPUESTO' : 'FACTURA';
  pdf.setFillColor(26, 86, 232);
  pdf.roundedRect(rm - 52, 8, 52, 14, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(typeLabel, rm - 26, 16, { align: 'center' });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`N° ${doc.num || '0001'}`, rm - 26, 21, { align: 'center' });

  y = 52;

  // ── INFO ROW ─────────────────────────────────────────
  pdf.setFillColor(240, 244, 255);
  pdf.rect(lm, y, cw, 28, 'F');

  // Client info
  pdf.setTextColor(120, 136, 168);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLIENTE', lm + 4, y + 6);
  pdf.setTextColor(14, 27, 61);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(doc.clientName || '—', lm + 4, y + 13);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(120, 136, 168);
  if (doc.clientPhone) pdf.text(`Tel: ${doc.clientPhone}`, lm + 4, y + 19);
  if (doc.clientEmail) pdf.text(`Email: ${doc.clientEmail}`, lm + 4, y + 24);

  // Dates
  const dateX = rm - 55;
  pdf.setTextColor(120, 136, 168);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FECHA EMISIÓN', dateX, y + 6);
  pdf.setTextColor(14, 27, 61);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doc.dateIssue || '—', dateX, y + 12);
  if (doc.dateExpiry) {
    pdf.setTextColor(120, 136, 168);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VENCIMIENTO', dateX, y + 19);
    pdf.setTextColor(14, 27, 61);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.dateExpiry, dateX, y + 25);
  }

  y += 36;

  // ── ITEMS TABLE ──────────────────────────────────────
  // Header
  pdf.setFillColor(15, 45, 110);
  pdf.rect(lm, y, cw, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESCRIPCIÓN', lm + 3, y + 5.5);
  pdf.text('CANT.', lm + 98, y + 5.5, { align: 'center' });
  pdf.text('PRECIO UNIT.', lm + 124, y + 5.5, { align: 'center' });
  pdf.text('DESC.%', lm + 150, y + 5.5, { align: 'center' });
  pdf.text('TOTAL', rm - 3, y + 5.5, { align: 'right' });
  y += 8;

  // Rows
  doc.items.forEach((it, i) => {
    const lineTotal = it.qty * it.price;
    const lineDisc  = lineTotal * (it.disc || 0) / 100;
    const lineFinal = lineTotal - lineDisc;

    if (i % 2 === 0) {
      pdf.setFillColor(248, 250, 255);
      pdf.rect(lm, y, cw, 9, 'F');
    }

    pdf.setTextColor(14, 27, 61);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const descLines = pdf.splitTextToSize(it.desc, 85);
    pdf.text(descLines[0], lm + 3, y + 6);
    pdf.setTextColor(120, 136, 168);
    pdf.text(String(it.qty), lm + 98, y + 6, { align: 'center' });
    pdf.text(`$${fmt(it.price)}`, lm + 124, y + 6, { align: 'center' });
    pdf.text(it.disc ? `${it.disc}%` : '—', lm + 150, y + 6, { align: 'center' });
    pdf.setTextColor(14, 27, 61);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`$${fmt(lineFinal)}`, rm - 3, y + 6, { align: 'right' });
    y += 9;
  });

  // ── TOTALS ───────────────────────────────────────────
  y += 4;
  pdf.setDrawColor(221, 227, 245);
  pdf.line(lm, y, rm, y);
  y += 6;

  const totX = rm - 60;

  function totRow(label: string, value: string, bold = false) {
    pdf.setFontSize(bold ? 10 : 8.5);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(bold ? 14 : 120, bold ? 27 : 136, bold ? 61 : 168);
    pdf.text(label, totX, y);
    pdf.setTextColor(14, 27, 61);
    pdf.text(value, rm - 3, y, { align: 'right' });
    y += bold ? 8 : 6;
  }

  const sub = doc.items.reduce((a, it) => {
    const line = it.qty * it.price;
    return a + line - line * (it.disc || 0) / 100;
  }, 0);

  totRow('Subtotal:', `$${fmt(sub)}`);
  if (doc.discount) totRow(`Descuento (${doc.discount}%):`, `-$${fmt(sub * doc.discount / 100)}`);
  if (doc.ivaRate)  totRow(`IVA (${doc.ivaRate}%):`, `$${fmt((sub - sub * (doc.discount || 0) / 100) * doc.ivaRate / 100)}`);

  // Total box
  pdf.setFillColor(15, 45, 110);
  pdf.roundedRect(totX - 4, y - 2, rm - totX + 7, 12, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL:', totX, y + 7);
  pdf.text(`$${fmt(calcTotal(doc))}`, rm - 3, y + 7, { align: 'right' });
  y += 20;

  // ── NOTES ────────────────────────────────────────────
  if (doc.notes) {
    pdf.setFillColor(240, 244, 255);
    pdf.rect(lm, y, cw, 6, 'F');
    pdf.setTextColor(120, 136, 168);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOTAS Y CONDICIONES', lm + 3, y + 4.5);
    y += 8;
    pdf.setTextColor(54, 64, 97);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const noteLines = pdf.splitTextToSize(doc.notes, cw - 6);
    pdf.text(noteLines, lm + 3, y);
    y += noteLines.length * 5 + 4;
  }

  // ── WATERMARK (free plan) ────────────────────────────
  if (!isPro) {
    pdf.setTextColor(200, 200, 200);
    pdf.setFontSize(52);
    pdf.setFont('helvetica', 'bold');
    pdf.saveGraphicsState();
    pdf.text('PRESUPUESTOPRO.COM', W / 2, 148, {
      align: 'center',
      angle: 45,
    });
    pdf.restoreGraphicsState();
  }

  // ── FOOTER ───────────────────────────────────────────
  pdf.setFillColor(240, 244, 255);
  pdf.rect(0, 282, W, 15, 'F');
  pdf.setTextColor(120, 136, 168);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Generado con PresupuestoPro', W / 2, 291, { align: 'center' });

  const fname = `${doc.type}-${doc.num || '001'}-${(doc.clientName || 'cliente').replace(/[^a-z0-9]/gi, '_')}.pdf`;
  pdf.save(fname);
}