// Convierte un HTML local a PDF usando Edge headless. No lee Firestore.
// Uso: npx tsx scripts/html-to-pdf.ts <entrada.html> <salida.pdf>

import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Uso: html-to-pdf <entrada.html> <salida.pdf>');

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(input)).href, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: output,
    format: 'letter',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  await browser.close();
  console.log(`PDF generado: ${output}`);
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
