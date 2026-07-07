import { jsPDF } from 'jspdf';
import sharp from 'sharp';
import fs from 'fs';

const svgPath = '/Users/Staberman/Downloads/Logo sv.svg';
const outputPath = '/Users/Staberman/Desktop/PresupuestadoPro/public/logo-ejemplo.pdf';

const svgBuffer = fs.readFileSync(svgPath);

// Convert SVG to RGBA PNG at high resolution
const rawPng = await sharp(svgBuffer)
  .resize(800, 800, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Reduce alpha to 30% to simulate 30% opacity
const pixels = rawPng.data;
for (let i = 3; i < pixels.length; i += 4) {
  pixels[i] = Math.round(pixels[i] * 0.3);
}

// Create PNG from modified RGBA data
const finalPng = await sharp(pixels, { raw: { width: rawPng.info.width, height: rawPng.info.height, channels: 4 } })
  .png()
  .toBuffer();

const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const W = 210, H = 297;

const logoW = 80, logoH = 80;
const x = (W - logoW) / 2;
const y = (H - logoH) / 2;

const pngBase64 = finalPng.toString('base64');
const dataUri = 'data:image/png;base64,' + pngBase64;

pdf.addImage(dataUri, 'PNG', x, y, logoW, logoH);

pdf.save(outputPath);
console.log('PDF generado con logo al 30% de opacidad: ' + outputPath);
