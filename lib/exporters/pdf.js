'use strict';

const path = require('node:path');
const { execFile } = require('node:child_process');

/**
 * Export HTML or Markdown files to PDF.
 * Uses npx md-to-pdf for Markdown, npx puppeteer for HTML.
 * Zero installed deps -- delegates to npx at runtime.
 */

function deriveOutputPath(inputPath, explicit) {
  if (explicit) return explicit;
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${base}.pdf`);
}

function exec(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 120_000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} failed: ${stderr || err.message}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function exportFromMarkdown(inputPath, outputPath) {
  const out = deriveOutputPath(inputPath, outputPath);
  // md-to-pdf reads from file, writes pdf alongside or to --dest
  await exec('npx', [
    '--yes', 'md-to-pdf', inputPath,
    '--dest', out,
  ]);
  return { outputPath: out, message: `PDF written to ${out}` };
}

async function exportFromHtml(inputPath, outputPath) {
  const out = deriveOutputPath(inputPath, outputPath);
  // Use a small inline puppeteer script via npx
  const script = `
    const puppeteer = require('puppeteer');
    (async () => {
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.goto('file://${inputPath.replace(/'/g, "\\'")}', { waitUntil: 'networkidle0' });
      await page.pdf({ path: '${out.replace(/'/g, "\\'")}', format: 'A4', printBackground: true });
      await browser.close();
    })();
  `;
  await exec('node', ['-e', script]);
  return { outputPath: out, message: `PDF written to ${out}` };
}

async function exportPdf(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.md' || ext === '.markdown') {
    return exportFromMarkdown(inputPath, outputPath);
  }
  return exportFromHtml(inputPath, outputPath);
}

module.exports = {
  name: 'pdf',
  description: 'Export HTML or Markdown to PDF',
  export: exportPdf,
};
