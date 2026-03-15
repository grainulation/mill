/**
 * mill format: json-ld
 *
 * Wraps compilation.json in JSON-LD using schema.org/Report vocabulary.
 * Zero dependencies — node built-in only.
 */

export const name = 'json-ld';
export const extension = '.jsonld';
export const mimeType = 'application/ld+json; charset=utf-8';
export const description = 'JSON-LD semantic export (schema.org/Report)';

const CONTEXT = {
  '@vocab': 'https://schema.org/',
  wheat: 'https://grainulation.dev/ns/wheat#',
  claim: 'wheat:Claim',
  confidence: 'wheat:confidence',
  evidenceTier: 'wheat:evidenceTier',
  claimType: 'wheat:claimType',
  sprintId: 'wheat:sprintId',
};

/**
 * Convert a compilation object to JSON-LD.
 * @param {object} compilation - The compilation.json content
 * @returns {string} JSON-LD string
 */
export function convert(compilation) {
  const meta = compilation.meta || {};
  const claims = compilation.claims || [];
  const certificate = compilation.certificate || {};

  const doc = {
    '@context': CONTEXT,
    '@type': 'Report',
    '@id': `wheat:sprint/${meta.sprint || 'unknown'}`,
    name: meta.sprint || meta.question || 'Wheat Sprint Report',
    description: meta.question || '',
    dateCreated: certificate.compiled_at || new Date().toISOString(),
    ...(meta.audience ? { audience: { '@type': 'Audience', name: meta.audience } } : {}),
    hasPart: {
      '@type': 'ItemList',
      numberOfItems: claims.length,
      itemListElement: claims.map((claim, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: claimToJsonLd(claim),
      })),
    },
    ...(certificate.sha256 ? {
      identifier: {
        '@type': 'PropertyValue',
        name: 'certificate-sha256',
        value: certificate.sha256,
      },
    } : {}),
  };

  return JSON.stringify(doc, null, 2);
}

function claimToJsonLd(claim) {
  const body = claim.content || claim.text || '';
  const evidenceTier = typeof claim.evidence === 'string'
    ? claim.evidence
    : (claim.evidence?.tier ?? claim.evidence_tier ?? null);

  return {
    '@type': 'claim',
    '@id': `wheat:claim/${claim.id}`,
    identifier: claim.id,
    claimType: claim.type,
    text: body,
    description: body,
    confidence: claim.confidence ?? null,
    evidenceTier,
    dateCreated: claim.created || claim.timestamp || null,
    ...(claim.tags?.length ? { keywords: claim.tags.join(', ') } : {}),
    ...(claim.status ? { status: claim.status } : {}),
  };
}
