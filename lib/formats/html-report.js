/**
 * mill format: html-report
 *
 * Self-contained HTML report with inline CSS (dark theme).
 * Claims grouped by type with colored badges, filterable via CSS class toggles.
 * Zero dependencies — node built-in only.
 */

export const name = 'html-report';
export const extension = '.html';
export const mimeType = 'text/html; charset=utf-8';
export const description = 'Self-contained dark-theme HTML report with type filters and claim cards';

/**
 * Convert a compilation object to an HTML report.
 * @param {object} compilation - The compilation.json content
 * @returns {string} HTML output
 */
export function convert(compilation) {
  const meta = compilation.meta || {};
  const claims = compilation.claims || [];
  const conflicts = compilation.conflicts || [];
  const certificate = compilation.certificate || {};

  const title = meta.sprint || meta.question || 'Sprint Report';
  const compiled = certificate.compiled_at || new Date().toISOString();

  // Group claims by type (skip reverted)
  const byType = {};
  const typeCounts = {};
  for (const c of claims) {
    if (c.status === 'reverted') continue;
    const t = c.type || 'unknown';
    if (!byType[t]) byType[t] = [];
    byType[t].push(c);
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  const typeOrder = ['constraint', 'factual', 'recommendation', 'risk', 'estimate', 'feedback'];
  const sortedTypes = typeOrder.filter(t => byType[t]);
  for (const t of Object.keys(byType)) {
    if (!sortedTypes.includes(t)) sortedTypes.push(t);
  }

  const typeColors = {
    constraint: '#e74c3c',
    factual: '#3498db',
    recommendation: '#2ecc71',
    risk: '#f39c12',
    estimate: '#9b59b6',
    feedback: '#1abc9c',
    unknown: '#95a5a6',
  };

  const active = claims.filter(c => c.status === 'active').length;

  // Build filter buttons
  const filterButtons = sortedTypes.map(t => {
    const color = typeColors[t] || typeColors.unknown;
    return `<button class="filter-btn active" data-type="${esc(t)}" style="--badge-color:${color}" onclick="toggleType('${esc(t)}')">${capitalize(t)} (${typeCounts[t]})</button>`;
  }).join('\n      ');

  // Build type sections
  const sections = sortedTypes.map(t => {
    const group = byType[t];
    const color = typeColors[t] || typeColors.unknown;
    const cards = group.map(c => {
      const body = esc(c.content || c.text || '');
      const evidenceTier = typeof c.evidence === 'string' ? c.evidence : (c.evidence?.tier || c.evidence_tier || '');
      const conf = c.confidence != null ? Math.round(c.confidence * 100) : null;
      const tags = Array.isArray(c.tags) ? c.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('') : '';
      const confBar = conf != null
        ? `<div class="conf-bar"><div class="conf-fill" style="width:${conf}%"></div><span class="conf-label">${conf}%</span></div>`
        : '';
      return `
        <div class="claim-card">
          <div class="card-header">
            <span class="claim-id">${esc(c.id)}</span>
            ${evidenceTier ? `<span class="evidence-badge">${esc(evidenceTier)}</span>` : ''}
            <span class="status-badge status-${esc(c.status || 'active')}">${esc(c.status || 'active')}</span>
          </div>
          <p class="card-body">${body}</p>
          ${tags ? `<div class="card-tags">${tags}</div>` : ''}
          ${confBar}
        </div>`;
    }).join('\n');

    return `
    <section class="type-section" data-type="${esc(t)}">
      <h2 style="border-left:4px solid ${color};padding-left:12px">${capitalize(t)}s (${group.length})</h2>
      <div class="cards">${cards}
      </div>
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --bg:#0a0e1a; --surface:#111827; --border:#1e293b; --text:#e2e8f0; --muted:#94a3b8; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; line-height:1.6; padding:2rem; }
  header { margin-bottom:2rem; }
  header h1 { font-size:1.8rem; margin-bottom:0.5rem; }
  header p { color:var(--muted); font-size:0.9rem; }
  .stats-bar { display:flex; gap:1.5rem; padding:1rem; background:var(--surface); border-radius:8px; margin-bottom:1.5rem; flex-wrap:wrap; }
  .stat { text-align:center; }
  .stat .num { font-size:1.4rem; font-weight:700; }
  .stat .label { font-size:0.75rem; color:var(--muted); text-transform:uppercase; }
  .filters { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:2rem; }
  .filter-btn { background:var(--surface); color:var(--text); border:1px solid var(--border); padding:0.4rem 0.8rem; border-radius:4px; cursor:pointer; font-size:0.85rem; transition:opacity 0.2s; }
  .filter-btn.active { border-color:var(--badge-color); box-shadow:0 0 0 1px var(--badge-color); }
  .filter-btn:not(.active) { opacity:0.4; }
  .type-section { margin-bottom:2rem; }
  .type-section.hidden { display:none; }
  .type-section h2 { font-size:1.2rem; margin-bottom:1rem; }
  .cards { display:grid; gap:0.75rem; }
  .claim-card { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; }
  .card-header { display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; }
  .claim-id { font-weight:700; font-family:monospace; font-size:0.85rem; }
  .evidence-badge { background:#1e3a5f; color:#60a5fa; padding:0.15rem 0.5rem; border-radius:3px; font-size:0.75rem; }
  .status-badge { padding:0.15rem 0.5rem; border-radius:3px; font-size:0.7rem; text-transform:uppercase; }
  .status-active { background:#064e3b; color:#34d399; }
  .status-superseded { background:#4a3728; color:#fbbf24; }
  .card-body { color:var(--text); font-size:0.9rem; }
  .card-tags { display:flex; gap:0.3rem; flex-wrap:wrap; margin-top:0.5rem; }
  .tag { background:var(--border); padding:0.1rem 0.4rem; border-radius:3px; font-size:0.7rem; color:var(--muted); }
  .conf-bar { position:relative; height:6px; background:var(--border); border-radius:3px; margin-top:0.5rem; }
  .conf-fill { height:100%; background:#3b82f6; border-radius:3px; }
  .conf-label { position:absolute; right:0; top:-16px; font-size:0.7rem; color:var(--muted); }
  footer { margin-top:3rem; padding-top:1rem; border-top:1px solid var(--border); color:var(--muted); font-size:0.8rem; font-family:monospace; }
</style>
</head>
<body>
  <header>
    <h1>${esc(title)}</h1>
    ${meta.question ? `<p>${esc(meta.question)}</p>` : ''}
    <p>Compiled: ${esc(compiled)}${meta.audience ? ` | Audience: ${esc(meta.audience)}` : ''}</p>
  </header>

  <div class="stats-bar">
    <div class="stat"><div class="num">${claims.length}</div><div class="label">Total</div></div>
    <div class="stat"><div class="num">${active}</div><div class="label">Active</div></div>
    ${sortedTypes.map(t => `<div class="stat"><div class="num">${typeCounts[t]}</div><div class="label">${capitalize(t)}</div></div>`).join('\n    ')}
    ${conflicts.length ? `<div class="stat"><div class="num">${conflicts.length}</div><div class="label">Conflicts</div></div>` : ''}
  </div>

  <div class="filters">
    ${filterButtons}
  </div>

  ${sections}

  <footer>
    Certificate: ${certificate.claim_count || claims.length} claims | sha256:${(certificate.sha256 || 'unknown').slice(0, 16)}
  </footer>

  <script>
    function toggleType(type) {
      const btn = document.querySelector('.filter-btn[data-type="' + type + '"]');
      const section = document.querySelector('.type-section[data-type="' + type + '"]');
      if (!btn || !section) return;
      btn.classList.toggle('active');
      section.classList.toggle('hidden');
    }
  </script>
</body>
</html>`;
}

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
