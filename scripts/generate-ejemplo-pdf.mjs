import { jsPDF } from 'jspdf';
import sharp from 'sharp';
import fs from 'fs';

const svgPath = '/Users/Staberman/Downloads/Logo sv.svg';
const outputPath = '/Users/Staberman/Desktop/PresupuestadoPro/public/propuesta-ejemplo.pdf';

const BG       = [42, 45, 53];
const BAR      = [34, 37, 44];
const TXT      = [255, 255, 255];
const TXT2     = [176, 181, 192];
const TXT3     = [128, 136, 152];
const LINE_CLR = [52, 55, 65];
const ACCENT   = [60, 128, 230];

const W = 210, H = 297, lm = 18, rm = W - lm, cw = rm - lm;
const money = (n) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

// ── Watermark ──
const svgBuffer = fs.readFileSync(svgPath);
const rawPng = await sharp(svgBuffer)
  .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const px = rawPng.data;
for (let i = 3; i < px.length; i += 4) px[i] = Math.round(px[i] * 0.3);
const finalPng = await sharp(px, { raw: { width: rawPng.info.width, height: rawPng.info.height, channels: 4 } }).png().toBuffer();
const watermark = 'data:image/png;base64,' + finalPng.toString('base64');

// ── Fonts ──
const [regularBuf, boldBuf] = await Promise.all([
  fetch('https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_qU7NSg.ttf').then(r => r.arrayBuffer()),
  fetch('https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_TknNSg.ttf').then(r => r.arrayBuffer()),
]);

const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
pdf.addFileToVFS('PlusJakartaSans-Regular.ttf', Buffer.from(regularBuf).toString('base64'));
pdf.addFont('PlusJakartaSans-Regular.ttf', 'PlusJakartaSans', 'normal');
pdf.addFileToVFS('PlusJakartaSans-Bold.ttf', Buffer.from(boldBuf).toString('base64'));
pdf.addFont('PlusJakartaSans-Bold.ttf', 'PlusJakartaSans', 'bold');

function pg() {
  pdf.setFillColor(...BG);
  pdf.rect(0, 0, W, H, 'F');
  pdf.addImage(watermark, 'PNG', (W - 80) / 2, (H - 80) / 2, 80, 80, undefined, 'NONE');
}
function div(y) { pdf.setDrawColor(...LINE_CLR); pdf.setLineWidth(0.3); pdf.line(lm, y, rm, y); }

// ══════════════════════════════════════════
pg();

// ── HEADER BAR ──
pdf.setFillColor(...BAR);
pdf.rect(0, 0, W, 20, 'F');

let y = 28;

// ── CLIENT INFO + DATE ──
let clientInfo = [
  'Staberman S.A.S.',
  '11 6963-6114',
  'hola@staberman.com.ar',
];

pdf.setTextColor(...TXT3);
pdf.setFontSize(6.5);
pdf.setFont('PlusJakartaSans', 'bold');
pdf.text('FECHA', lm, y);
pdf.setTextColor(...TXT);
pdf.setFontSize(8);
pdf.setFont('PlusJakartaSans', 'normal');
pdf.text('6 de julio de 2026', lm, y + 4.5);

if (clientInfo.length) {
  pdf.setTextColor(...TXT3);
  pdf.setFontSize(6.5);
  pdf.setFont('PlusJakartaSans', 'bold');
  pdf.text('CLIENTE', rm - 90, y);
  pdf.setTextColor(...TXT);
  pdf.setFontSize(8);
  pdf.setFont('PlusJakartaSans', 'normal');
  let cy = y + 4.5;
  clientInfo.forEach(l => { pdf.text(l, rm - 90, cy); cy += 4; });
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
pdf.text(money(2000000), lm, y + 6);
y += 14;

div(y);
y += 5;

// ── Sections ──
function sec(num, title, desc, bullets) {
  const descLines = desc ? pdf.splitTextToSize(desc, cw) : [];
  const bHs = bullets.map(b => Math.max(5, pdf.splitTextToSize(b, cw - 12).length * 3.5 + 1));
  const estH = 4 + 7 + (descLines.length ? descLines.length * 4 + 3 : 0) + bHs.reduce((a, b) => a + b, 0) + 3;
  if (y + estH > 260) { pdf.addPage(); pg(); y = 24; }

  let iy = y;
  const prefix = num !== null ? `${num}. ` : '';
  pdf.setTextColor(...TXT);
  pdf.setFontSize(11);
  pdf.setFont('PlusJakartaSans', 'bold');
  const st = pdf.splitTextToSize(prefix + title, cw);
  pdf.text(st, lm, iy);
  iy += st.length * 5 + 2;

  if (desc) {
    pdf.setTextColor(...TXT3);
    pdf.setFontSize(8);
    pdf.setFont('PlusJakartaSans', 'normal');
    pdf.text(descLines, lm, iy);
    iy += descLines.length * 4 + 3;
  }

  for (const b of bullets) {
    if (iy > 270) { pdf.addPage(); pg(); iy = 28; }
    pdf.setTextColor(...ACCENT);
    pdf.setFontSize(6.5);
    pdf.text('•', lm, iy);
    pdf.setTextColor(...TXT2);
    pdf.setFontSize(8);
    pdf.setFont('PlusJakartaSans', 'normal');
    const bt = pdf.splitTextToSize(b, cw - 12);
    pdf.text(bt, lm + 6, iy);
    iy += Math.max(5, bt.length * 3.5 + 1);
  }
  y = iy + 6;
}

sec(1, 'Campaña de Meta Ads',
  'Incluye la planificación, configuración y puesta en marcha de una campaña publicitaria en Meta orientada a conversión.\n\nLa campaña inicial se plantea como una etapa de testeo e incluye:',
  [
    'Configuración completa de la campaña.', 'Creación de conjuntos de anuncios.',
    'Configuración de eventos de conversión.', 'Segmentación inicial de públicos.',
    'Testeo de horarios, edades e intereses.', 'Optimización inicial de la campaña.',
    'Análisis de resultados para determinar qué anuncios merecen ser escalados.',
    'Una vez validada la campaña, el presupuesto publicitario se incrementa únicamente sobre los anuncios que demuestren mejores resultados.',
  ]
);

sec(2, 'Producción de creativos', 'La campaña contempla la producción inicial de:', [
  '2 videos publicitarios de entre 15 y 20 segundos.', '1 imagen estática utilizando el mismo ángulo de venta.',
  'Antes de producir las piezas se define el enfoque comercial, el guion y la estrategia del mensaje.',
  'En caso de que los creativos iniciales no obtengan el rendimiento esperado, la producción de nuevas piezas no forma parte del presupuesto inicial y se cotiza por separado.',
]);

sec(3, 'Automatización inteligente de WhatsApp', 'Incluye la configuración completa de una automatización integrada con Meta.', [
  'Responder mensajes de texto.', 'Responder audios.',
  'Comprender preguntas abiertas mediante inteligencia artificial.', 'Brindar información sobre el evento o servicio.',
  'Resolver consultas frecuentes.', 'Guiar al usuario durante el proceso de compra.', 'Agendar llamadas.',
  'Gestionar reservas.', 'Cobrar entradas o productos mediante el medio de pago definido por el cliente.',
  'Realizar seguimiento automático de los interesados.',
  'Configuración del Portfolio Comercial de Meta y vinculación completa con WhatsApp.',
  'El flujo conversacional se diseña específicamente según el producto, servicio o evento.',
]);

sec(4, 'Landing page de conversión',
  'Desarrollo de una landing enfocada exclusivamente en convertir visitantes en consultas o ventas. La estructura contempla hasta cinco secciones principales para presentar toda la información necesaria sin generar sobrecarga de contenido.', [
  'Diseño responsive.', 'Optimización para dispositivos móviles.', 'Call To Actions estratégicos.',
  'Integración con Meta Pixel y los eventos necesarios.', 'Integración con la automatización de WhatsApp.',
  'Según la estrategia comercial, la landing puede desarrollarse en un formato tradicional o como una experiencia interactiva o cinematográfica, utilizando videos, animaciones y una navegación guiada que aumente la participación del usuario.',
]);

sec(5, 'Panel de administración y analítica', 'Se incluye un panel de administración donde es posible visualizar en tiempo real:', [
  'Conversaciones iniciadas.', 'Anuncio que originó cada conversación.', 'Rendimiento individual de cada anuncio.',
  'Costos por conversación.', 'Conversiones obtenidas.', 'Estado de cada lead.', 'Seguimiento comercial.',
  'El sistema puede enviar información de retorno a Meta sobre la calidad de las conversaciones y las conversiones obtenidas, permitiendo que el algoritmo optimice progresivamente la distribución del presupuesto publicitario.',
  'Toda la infraestructura queda integrada para que Meta pueda medir correctamente cada evento de conversión generado tanto desde la landing como desde WhatsApp.',
]);

sec(null, 'Mantenimiento', 'El servicio contempla un mantenimiento periódico para garantizar el correcto funcionamiento de toda la infraestructura.', [
  'Monitoreo de campañas.', 'Ajustes menores.', 'Mantenimiento de la automatización.', 'Supervisión del panel de administración.',
  'Verificación de eventos y conversiones.', 'Actualizaciones de funcionamiento cuando sean necesarias.',
]);

sec(null, 'Presupuesto publicitario', 'El presupuesto destinado a anuncios se invierte directamente en Meta y no forma parte del presente presupuesto.', [
  'Como referencia, la etapa inicial suele comenzar con una inversión diaria destinada a testear los distintos anuncios y públicos.',
  'Una vez identificados los anuncios con mejor rendimiento, el presupuesto puede incrementarse de manera progresiva para maximizar el retorno de la inversión.',
]);

sec(null, 'Consideraciones', 'El presente presupuesto contempla la implementación completa de la estructura de marketing.', [
  'Los resultados dependerán, entre otros factores, de la propuesta comercial, el público objetivo, el precio del producto o servicio, la calidad de los creativos y la respuesta del mercado.',
  'En caso de ser necesario producir nuevos anuncios o modificar significativamente la estrategia creativa luego del período de testeo, dichas tareas se presupuestarán por separado.',
]);

// ── FOOTER ──
pdf.setFillColor(...BAR);
pdf.rect(0, 282, W, 15, 'F');
pdf.setTextColor(...TXT3);
pdf.setFontSize(7);
pdf.setFont('PlusJakartaSans', 'normal');
pdf.text('Staberman · Marketing Digital', W / 2, 288, { align: 'center' });
pdf.setFontSize(6);
pdf.text('Generado con PresupuestoPro', W / 2, 293, { align: 'center' });

pdf.save(outputPath);
console.log('PDF generado: ' + outputPath);
