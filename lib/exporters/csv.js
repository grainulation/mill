'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Export claims.json to CSV.
 * Handles nested fields by flattening to dot-notation columns.
 */

const CSV_COLUMNS = [
  'id',
  'type',
  'text',
  'confidence',
  'evidence_tier',
  'source',
  'status',
  'created',
  'tags',
];

function escapeCsvField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function claimToRow(claim) {
  return CSV_COLUMNS.map((col) => {
    if (col === 'tags') {
      return escapeCsvField(Array.isArray(claim.tags) ? claim.tags.join('; ') : '');
    }
    if (col === 'evidence_tier') {
      return escapeCsvField(claim.evidence?.tier ?? claim.evidence_tier ?? '');
    }
    if (col === 'source') {
      return escapeCsvField(claim.evidence?.source ?? claim.source ?? '');
    }
    return escapeCsvField(claim[col]);
  }).join(',');
}

function deriveOutputPath(inputPath, explicit) {
  if (explicit) return explicit;
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${base}.csv`);
}

async function exportCsv(inputPath, outputPath) {
  const raw = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(raw);

  // Accept either an array or { claims: [...] }
  const claims = Array.isArray(data) ? data : (data.claims || []);

  if (claims.length === 0) {
    throw new Error('No claims found in input file.');
  }

  const header = CSV_COLUMNS.join(',');
  const rows = claims.map(claimToRow);
  const csv = [header, ...rows].join('\n') + '\n';

  const out = deriveOutputPath(inputPath, outputPath);
  fs.writeFileSync(out, csv, 'utf-8');

  return { outputPath: out, message: `CSV written to ${out} (${claims.length} claims)` };
}

module.exports = {
  name: 'csv',
  description: 'Export claims JSON to CSV',
  export: exportCsv,
};
