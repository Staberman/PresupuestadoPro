import jsPDF from 'jspdf';
import { Document, DocItem, calcTotal, unitLabel } from '@/lib/documents';
import { statusLabel } from '@/lib/status';

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

export function generatePDF(doc: Document, biz: BizPdf, isPro: boolean) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const lm = 15;
  const rm = W - lm;
  const cw = rm - lm;
  const cur = biz.currency || 'ARS';
  const money = (n: number) => `${cur === 'ARS' ? '$' : cur + ' '}${fmt(n)}`;
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
  const bizLines = [
    biz.address,
    biz.phone,
    biz.email,
    biz.cuit ? `CUIT: ${biz.cuit}` : '',
  ].filter(Boolean);
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

  y = 50;

  // ── INFO ROW ─────────────────────────────────────────
  // La altura depende de cuántos datos del cliente haya
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

  const infoHeight = Math.max(28, 14 + (doc.clientName ? 5 : 0) + clientLines.length * 4.2 + contactLines.length * 4.2 + 4);

  pdf.setFillColor(240, 244, 255);
  pdf.rect(lm, y, cw, infoHeight, 'F');

  // Client info (left)
  pdf.setTextColor(120, 136, 168);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLIENTE', lm + 4, y + 6);

  let cy = y + 12;
  if (doc.clientName) {
    pdf.setTextColor(14, 27, 61);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(doc.clientName, lm + 4, cy);
    cy += 5;
  }
  pdf.setTextColor(120, 136, 168);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  clientLines.forEach(line => {
    pdf.text(line, lm + 4, cy);
    cy += 4.2;
  });
  contactLines.forEach(line => {
    pdf.text(line, lm + 4, cy);
    cy += 4.2;
  });

  // Dates + status (right)
  const dateX = rm - 60;
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
  // Estado
  pdf.setTextColor(120, 136, 168);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ESTADO', dateX, y + (doc.dateExpiry ? 32 : 19));
  pdf.setTextColor(14, 27, 61);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(statusLabel(doc.status), dateX, y + (doc.dateExpiry ? 38 : 25));

  y += infoHeight + 8;

  // ── ITEMS TABLE ──────────────────────────────────────
  // Columnas: Descripción | Cant. | Unidad | Tarifa | Desc.% | Total
  // posiciones x absolutas:
  const xDesc  = lm + 3;
  const xQty   = lm + 96;
  const xUnit  = lm + 114;
  const xPrice = lm + 138;
  const xDisc  = lm + 162;
  const xTotal = rm - 3;

  pdf.setFillColor(15, 45, 110);
  pdf.rect(lm, y, cw, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESCRIPCIÓN', xDesc, y + 5.5);
  pdf.text('CANT.', xQty, y + 5.5, { align: 'center' });
  pdf.text('UNIDAD', xUnit, y + 5.5, { align: 'center' });
  pdf.text('TARIFA', xPrice, y + 5.5, { align: 'center' });
  pdf.text('DESC.%', xDisc, y + 5.5, { align: 'center' });
  pdf.text('TOTAL', xTotal, y + 5.5, { align: 'right' });
  y += 8;

  // Rows (con altura dinámica según descripción)
  doc.items.forEach((it, i) => {
    const lineFinal = lineTotal(it);
    const descLines = pdf.splitTextToSize(it.desc || '', 88);
    const rowH = Math.max(9, descLines.length * 4 + 4);

    if (y + rowH > 240) {
      pdf.addPage();
      y = 20;
    }

    if (i % 2 === 0) {
      pdf.setFillColor(248, 250, 255);
      pdf.rect(lm, y, cw, rowH, 'F');
    }

    pdf.setTextColor(14, 27, 61);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(descLines, xDesc, y + 5);

    pdf.setTextColor(120, 136, 168);
    pdf.text(String(it.qty), xQty, y + 5, { align: 'center' });
    pdf.text(unitLabel(it.unit, it.qty) || '—', xUnit, y + 5, { align: 'center' });
    pdf.text(money(it.price), xPrice, y + 5, { align: 'center' });
    pdf.text(it.disc ? `${it.disc}%` : '—', xDisc, y + 5, { align: 'center' });

    pdf.setTextColor(14, 27, 61);
    pdf.setFont('helvetica', 'bold');
    pdf.text(money(lineFinal), xTotal, y + 5, { align: 'right' });
    y += rowH;
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

  const sub = doc.items.reduce((a, it) => a + lineTotal(it), 0);

  totRow('Subtotal:', money(sub));
  if (doc.discount) totRow(`Descuento (${doc.discount}%):`, `-${money(sub * doc.discount / 100)}`);
  if (doc.ivaRate)  totRow(`IVA (${doc.ivaRate}%):`, money((sub - sub * (doc.discount || 0) / 100) * doc.ivaRate / 100));

  // Total box
  pdf.setFillColor(15, 45, 110);
  pdf.roundedRect(totX - 4, y - 2, rm - totX + 7, 12, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL:', totX, y + 7);
  pdf.text(money(calcTotal(doc)), rm - 3, y + 7, { align: 'right' });
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
  const footerText = biz.footer || 'Generado con PresupuestoPro';
  pdf.text(footerText, W / 2, 288, { align: 'center' });
  pdf.setFontSize(6);
  pdf.setTextColor(160, 170, 195);
  pdf.text('Generado con PresupuestoPro', W / 2, 293, { align: 'center' });

  const fname = `${doc.type}-${doc.num || '001'}-${(doc.clientName || 'cliente').replace(/[^a-z0-9]/gi, '_')}.pdf`;
  pdf.save(fname);
}
