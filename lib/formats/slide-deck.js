/**
 * mill format: slide-deck
 *
 * Self-contained HTML with CSS scroll-snap. One slide per claim type group.
 * Dark theme matching grainulation design tokens.
 * Zero dependencies — node built-in only.
 */

export const name = 'slide-deck';
export const extension = '.html';
export const mimeType = 'text/html; charset=utf-8';
export const description = 'Scroll-snap slide deck: one slide per type group with keyboard navigation';

/**
 * Convert a compilation object to a slide deck HTML page.
 * @param {object} compilation - The compilation.json content
 * @returns {string} HTML output
 */
export function convert(compilation) {
  const meta = compilation.meta || {};
  const claims = compilation.claims || [];
  const conflicts = compilation.conflicts || [];
  const certificate = compilation.certificate || {};

  const title = meta.sprint || meta.question || 'Sprint Deck';
  const compiled = certificate.compiled_at || new Date().toISOString();
  const active = claims.filter(c => c.status === 'active').length;

  // Group by type (skip reverted)
  const byType = {};
  for (const c of claims) {
    if (c.status === 'reverted') continue;
    const t = c.type || 'unknown';
    if (!byType[t]) byType[t] = [];
    byType[t].push(c);
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

  // Title slide
  const slides = [];
  slides.push(`
    <section class="slide">
      <div class="slide-content title-slide">
        <h1>${esc(title)}</h1>
        ${meta.question ? `<p class="question">${esc(meta.question)}</p>` : ''}
        <p class="meta">${esc(compiled)} | ${claims.length} claims</p>
      </div>
    </section>`);

  // Summary slide
  const typeStats = sortedTypes.map(t => {
    const color = typeColors[t] || typeColors.unknown;
    return `<div class="type-stat"><span class="dot" style="background:${color}"></span>${capitalize(t)}: ${byType[t].length}</div>`;
  }).join('\n          ');

  slides.push(`
    <section class="slide">
      <div class="slide-content">
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="big-stat"><span class="num">${claims.length}</span><span class="label">Total</span></div>
          <div class="big-stat"><span class="num">${active}</span><span class="label">Active</span></div>
          ${conflicts.length ? `<div class="big-stat"><span class="num">${conflicts.length}</span><span class="label">Conflicts</span></div>` : ''}
        </div>
        <div class="type-stats">
          ${typeStats}
        </div>
      </div>
    </section>`);

  // One slide per type group
  for (const t of sortedTypes) {
    const group = byType[t];
    const color = typeColors[t] || typeColors.unknown;
    const items = group.map(c => {
      const body = esc(c.content || c.text || '');
      const conf = c.confidence != null ? ` (${Math.round(c.confidence * 100)}%)` : '';
      return `<li><strong>${esc(c.id)}</strong>${conf}: ${body}</li>`;
    }).join('\n            ');

    slides.push(`
    <section class="slide">
      <div class="slide-content">
        <h2 style="border-left:4px solid ${color};padding-left:12px">${capitalize(t)}s (${group.length})</h2>
        <ul class="claim-list">
            ${items}
        </ul>
      </div>
    </section>`);
  }

  // Conflicts slide (if any)
  if (conflicts.length > 0) {
    const conflictItems = conflicts.map(c => {
      const ids = c.ids?.join(' vs ') || 'unknown';
      const resolved = c.resolution ? ' [resolved]' : '';
      return `<li><strong>${esc(ids)}</strong>${resolved}: ${esc(c.description || c.reason || '')}</li>`;
    }).join('\n            ');

    slides.push(`
    <section class="slide">
      <div class="slide-content">
        <h2 style="border-left:4px solid #e74c3c;padding-left:12px">Conflicts (${conflicts.length})</h2>
        <ul class="claim-list">
            ${conflictItems}
        </ul>
      </div>
    </section>`);
  }

  // Certificate slide
  slides.push(`
    <section class="slide">
      <div class="slide-content title-slide">
        <h2>Certificate</h2>
        <p class="mono">${certificate.claim_count || claims.length} claims</p>
        <p class="mono">sha256:${esc((certificate.sha256 || 'unknown').slice(0, 24))}</p>
        <p class="meta">${esc(compiled)}</p>
      </div>
    </section>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Slide Deck</title>
<style>
  :root { --bg:#0a0e1a; --surface:#111827; --border:#1e293b; --text:#e2e8f0; --muted:#94a3b8; }
  * { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-snap-type:y mandatory; overflow-y:scroll; }
  body { background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; line-height:1.6; }
  .slide { scroll-snap-align:start; height:100vh; display:flex; align-items:center; justify-content:center; padding:2rem; }
  .slide-content { max-width:800px; width:100%; }
  .title-slide { text-align:center; }
  .title-slide h1 { font-size:2.4rem; margin-bottom:0.75rem; }
  .title-slide h2 { font-size:1.8rem; margin-bottom:1rem; }
  .question { font-size:1.1rem; color:var(--muted); margin-bottom:1rem; }
  .meta { font-size:0.85rem; color:var(--muted); }
  .mono { font-family:monospace; font-size:1rem; color:var(--muted); margin-bottom:0.5rem; }
  h2 { font-size:1.5rem; margin-bottom:1.25rem; }
  .summary-grid { display:flex; gap:2rem; justify-content:center; margin-bottom:2rem; }
  .big-stat { display:flex; flex-direction:column; align-items:center; }
  .big-stat .num { font-size:2.5rem; font-weight:700; }
  .big-stat .label { font-size:0.8rem; color:var(--muted); text-transform:uppercase; }
  .type-stats { display:flex; flex-wrap:wrap; gap:0.75rem; justify-content:center; }
  .type-stat { display:flex; align-items:center; gap:0.4rem; font-size:0.9rem; }
  .dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
  .claim-list { list-style:none; max-height:70vh; overflow-y:auto; }
  .claim-list li { padding:0.6rem 0; border-bottom:1px solid var(--border); font-size:0.9rem; }
  .claim-list li strong { font-family:monospace; font-size:0.8rem; }
</style>
</head>
<body>
${slides.join('\n')}
<script>
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      const slides = document.querySelectorAll('.slide');
      const vh = window.innerHeight;
      const current = Math.round(window.scrollY / vh);
      const next = Math.min(current + 1, slides.length - 1);
      slides[next].scrollIntoView({ behavior: 'smooth' });
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      const vh = window.innerHeight;
      const current = Math.round(window.scrollY / vh);
      const prev = Math.max(current - 1, 0);
      document.querySelectorAll('.slide')[prev].scrollIntoView({ behavior: 'smooth' });
    }
  });
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
