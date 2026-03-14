'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Export claims.json to JSON-LD format.
 * Maps wheat claim types to schema.org vocabulary where possible.
 */

const CONTEXT = {
  '@context': {
    '@vocab': 'https://schema.org/',
    wheat: 'https://grainulator.dev/ns/wheat#',
    claim: 'wheat:Claim',
    confidence: 'wheat:confidence',
    evidenceTier: 'wheat:evidenceTier',
    claimType: 'wheat:claimType',
    sprintId: 'wheat:sprintId',
  },
};

function claimToJsonLd(claim) {
  return {
    '@type': 'claim',
    '@id': `wheat:claim/${claim.id}`,
    identifier: claim.id,
    claimType: claim.type,
    text: claim.text,
    confidence: claim.confidence,
    evidenceTier: claim.evidence?.tier ?? claim.evidence_tier ?? null,
    dateCreated: claim.created || null,
    description: claim.text,
    ...(claim.tags?.length ? { keywords: claim.tags.join(', ') } : {}),
    ...(claim.status ? { status: claim.status } : {}),
  };
}

function deriveOutputPath(inputPath, explicit) {
  if (explicit) return explicit;
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${base}.jsonld`);
}

async function exportJsonLd(inputPath, outputPath) {
  const raw = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(raw);
  const claims = Array.isArray(data) ? data : (data.claims || []);

  if (claims.length === 0) {
    throw new Error('No claims found in input file.');
  }

  const doc = {
    ...CONTEXT,
    '@type': 'ItemList',
    name: 'Wheat Sprint Claims',
    numberOfItems: claims.length,
    itemListElement: claims.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: claimToJsonLd(c),
    })),
  };

  const out = deriveOutputPath(inputPath, outputPath);
  fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n', 'utf-8');

  return { outputPath: out, message: `JSON-LD written to ${out} (${claims.length} claims)` };
}

module.exports = {
  name: 'json-ld',
  description: 'Export claims JSON to JSON-LD for semantic web',
  export: exportJsonLd,
};
