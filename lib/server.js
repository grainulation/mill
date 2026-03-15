#!/usr/bin/env node
/**
 * mill serve — local HTTP server for the mill export workbench UI
 *
 * Live preview of artifact exports, SSE for file-change updates,
 * REST API for format listing, export execution, and job history.
 * Zero npm dependencies (node:http only).
 *
 * Usage:
 *   mill serve [--port 9094] [--source /path/to/sprint]
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, watchFile, unwatchFile } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const PORT = parseInt(arg('port', '9094'), 10);
const SOURCE = resolve(arg('source', process.cwd()));
const CORS_ORIGIN = arg('cors', null);

// ── Format modules ────────────────────────────────────────────────────────────

const formats = {};
const formatModules = ['markdown', 'csv', 'json-ld'];

for (const mod of formatModules) {
  const m = await import(`./formats/${mod}.js`);
  formats[m.name] = {
    name: m.name,
    extension: m.extension,
    mimeType: m.mimeType,
    description: m.description,
    convert: m.convert,
  };
}

// ── State ─────────────────────────────────────────────────────────────────────

const exportHistory = [];
let compilation = null;
let claims = null;
let sourceFiles = {};

const sseClients = new Set();

function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch { sseClients.delete(res); }
  }
}

// ── Source loading ────────────────────────────────────────────────────────────

function loadSource() {
  const files = {};

  // Look for compilation.json
  const compilationPath = join(SOURCE, 'compilation.json');
  if (existsSync(compilationPath)) {
    try {
      compilation = JSON.parse(readFileSync(compilationPath, 'utf8'));
      files['compilation.json'] = {
        path: compilationPath,
        size: statSync(compilationPath).size,
        modified: statSync(compilationPath).mtime.toISOString(),
      };
    } catch { compilation = null; }
  }

  // Look for claims.json
  const claimsPath = join(SOURCE, 'claims.json');
  if (existsSync(claimsPath)) {
    try {
      const raw = JSON.parse(readFileSync(claimsPath, 'utf8'));
      claims = Array.isArray(raw) ? raw : (raw.claims || []);
      files['claims.json'] = {
        path: claimsPath,
        size: statSync(claimsPath).size,
        modified: statSync(claimsPath).mtime.toISOString(),
      };
    } catch { claims = null; }
  }

  // If compilation.json is the wheat compiler output (no .claims key),
  // or if there's no compilation at all, synthesize from claims.json
  if (claims) {
    const compilationHasClaims = compilation && Array.isArray(compilation.claims);
    if (!compilationHasClaims) {
      // Extract meta from claims.json if present
      const claimsRaw = JSON.parse(readFileSync(join(SOURCE, 'claims.json'), 'utf8'));
      const meta = claimsRaw.meta || {};

      // Merge compiler certificate if available
      const cert = compilation ? {
        compiled_at: compilation.compiled_at,
        sha256: compilation.claims_hash,
        claim_count: claims.length,
        compiler_version: compilation.compiler_version,
        status: compilation.status,
      } : {};

      compilation = {
        meta,
        claims,
        conflicts: compilation?.conflict_graph || [],
        certificate: cert,
      };
    }
  }

  sourceFiles = files;
}

function buildState() {
  return {
    source: SOURCE,
    sourceFiles,
    formats: Object.values(formats).map(f => ({
      name: f.name,
      extension: f.extension,
      mimeType: f.mimeType,
      description: f.description,
    })),
    hasCompilation: compilation !== null,
    claimCount: compilation?.claims?.length || 0,
    historyCount: exportHistory.length,
  };
}

// ── Export execution ──────────────────────────────────────────────────────────

function runExport(formatName, options = {}) {
  const fmt = formats[formatName];
  if (!fmt) {
    return { error: `Unknown format: ${formatName}` };
  }
  if (!compilation) {
    return { error: 'No compilation data available. Ensure compilation.json or claims.json exists in the source directory.' };
  }

  try {
    const startTime = Date.now();
    const output = fmt.convert(compilation);
    const duration = Date.now() - startTime;

    const job = {
      id: randomUUID().slice(0, 8),
      format: formatName,
      extension: fmt.extension,
      mimeType: fmt.mimeType,
      claimCount: compilation.claims?.length || 0,
      outputSize: Buffer.byteLength(output, 'utf8'),
      duration,
      timestamp: new Date().toISOString(),
      options,
    };

    exportHistory.unshift(job);
    // Keep last 50 jobs
    if (exportHistory.length > 50) exportHistory.length = 50;

    broadcast({ type: 'export-complete', data: job });

    return { job, output };
  } catch (err) {
    return { error: `Export failed: ${err.message}` };
  }
}

// ── MIME types ────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ── Body parser ───────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        resolve(null);
      }
    });
    req.on('error', reject);
  });
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS (only when --cors is passed)
  if (CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS' && CORS_ORIGIN) {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── SSE endpoint ──
  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'state', data: buildState() })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // ── API: state ──
  if (req.method === 'GET' && url.pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildState()));
    return;
  }

  // ── API: formats ──
  if (req.method === 'GET' && url.pathname === '/api/formats') {
    const formatList = Object.values(formats).map(f => ({
      name: f.name,
      extension: f.extension,
      mimeType: f.mimeType,
      description: f.description,
      schema_version: '1.0.0',
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ formats: formatList }));
    return;
  }

  // ── API: export ──
  if (req.method === 'POST' && url.pathname === '/api/export') {
    const body = await readBody(req);
    if (!body || !body.format) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing "format" in request body' }));
      return;
    }

    const result = runExport(body.format, body.options || {});
    if (result.error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: result.error }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      job: result.job,
      output: result.output,
    }));
    return;
  }

  // ── API: preview (GET with query param) ──
  if (req.method === 'GET' && url.pathname === '/api/preview') {
    const formatName = url.searchParams.get('format');
    if (!formatName) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing "format" query parameter' }));
      return;
    }

    const result = runExport(formatName);
    if (result.error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: result.error }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      format: formatName,
      output: result.output,
      size: result.job.outputSize,
    }));
    return;
  }

  // ── API: download (returns the raw file) ──
  if (req.method === 'GET' && url.pathname === '/api/download') {
    const formatName = url.searchParams.get('format');
    if (!formatName) {
      res.writeHead(400);
      res.end('Missing format');
      return;
    }

    const fmt = formats[formatName];
    if (!fmt) {
      res.writeHead(400);
      res.end('Unknown format');
      return;
    }

    const result = runExport(formatName);
    if (result.error) {
      res.writeHead(400);
      res.end(result.error);
      return;
    }

    const filename = `export${fmt.extension}`;
    res.writeHead(200, {
      'Content-Type': fmt.mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(result.output);
    return;
  }

  // ── API: history ──
  if (req.method === 'GET' && url.pathname === '/api/history') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ history: exportHistory }));
    return;
  }

  // ── API: refresh ──
  if (req.method === 'POST' && url.pathname === '/api/refresh') {
    loadSource();
    broadcast({ type: 'state', data: buildState() });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildState()));
    return;
  }

  // ── Static files ──
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;

  // Prevent directory traversal
  const resolved = resolve(PUBLIC_DIR, '.' + filePath);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  if (existsSync(resolved) && statSync(resolved).isFile()) {
    const ext = extname(resolved);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(readFileSync(resolved));
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

// ── File watching ─────────────────────────────────────────────────────────────

const watchedFiles = [];

function watchSource() {
  // Unwatch previous
  for (const f of watchedFiles) {
    try { unwatchFile(f); } catch { /* ignore */ }
  }
  watchedFiles.length = 0;

  const filesToWatch = ['compilation.json', 'claims.json'];
  for (const name of filesToWatch) {
    const filePath = join(SOURCE, name);
    if (existsSync(filePath)) {
      watchFile(filePath, { interval: 2000 }, () => {
        loadSource();
        broadcast({ type: 'source-changed', data: buildState() });
      });
      watchedFiles.push(filePath);
    }
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

loadSource();
watchSource();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mill: serving on http://localhost:${PORT}`);
  console.log(`  source: ${SOURCE}`);
  console.log(`  formats: ${Object.keys(formats).join(', ')}`);
  if (compilation) {
    console.log(`  claims: ${compilation.claims?.length || 0}`);
  } else {
    console.log(`  claims: no compilation data found`);
  }
  console.log(`  files: ${Object.keys(sourceFiles).join(', ') || 'none detected'}`);
});
