'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const MILL = path.join(__dirname, '..', 'bin', 'mill.js');
const FIXTURES = path.join(__dirname, 'fixtures');

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mill-test-'));

  // Create fixture directory
  if (!fs.existsSync(FIXTURES)) {
    fs.mkdirSync(FIXTURES, { recursive: true });
  }

  // Create a test claims.json
  const claims = [
    {
      id: 'r001',
      type: 'factual',
      text: 'Node.js has built-in HTTP module',
      confidence: 0.95,
      evidence: { tier: 'documented', source: 'nodejs.org' },
      status: 'active',
      created: '2026-01-15',
      tags: ['node', 'http'],
    },
    {
      id: 'r002',
      type: 'recommendation',
      text: 'Use streams for large file processing',
      confidence: 0.8,
      evidence: { tier: 'tested', source: 'prototype' },
      status: 'active',
      created: '2026-01-16',
      tags: ['performance'],
    },
  ];
  fs.writeFileSync(
    path.join(FIXTURES, 'claims.json'),
    JSON.stringify({ claims }, null, 2),
  );

  // Create a test HTML file
  fs.writeFileSync(
    path.join(FIXTURES, 'brief.html'),
    `<!DOCTYPE html>
<html><head><title>Test Brief</title></head>
<body>
<h1>Sprint Brief</h1>
<p>This is a <strong>test</strong> brief with <em>emphasis</em>.</p>
<ul><li>First point</li><li>Second point</li></ul>
<h2>Conclusion</h2>
<p>All done.</p>
</body></html>`,
  );
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
}

function run(args) {
  return execFileSync('node', [MILL, ...args], {
    encoding: 'utf-8',
    timeout: 10_000,
  });
}

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    process.exitCode = 1;
  }
}

// --- Tests ---

console.log('mill basic tests\n');

setup();

test('--help prints usage', () => {
  const out = run(['--help']);
  assert.ok(out.includes('mill -- turn sprint evidence'));
  assert.ok(out.includes('export'));
  assert.ok(out.includes('publish'));
});

test('formats command lists all formats', () => {
  const out = run(['formats']);
  assert.ok(out.includes('pdf'));
  assert.ok(out.includes('csv'));
  assert.ok(out.includes('markdown'));
  assert.ok(out.includes('json-ld'));
  assert.ok(out.includes('static'));
  assert.ok(out.includes('clipboard'));
});

test('csv export produces valid CSV', () => {
  const input = path.join(FIXTURES, 'claims.json');
  const output = path.join(tmpDir, 'claims.csv');
  const out = run(['export', '--format', 'csv', input, '-o', output]);
  assert.ok(out.includes('CSV written'));
  assert.ok(out.includes('2 claims'));

  const csv = fs.readFileSync(output, 'utf-8');
  const lines = csv.trim().split('\n');
  assert.strictEqual(lines.length, 3); // header + 2 rows
  assert.ok(lines[0].includes('id,type,text'));
  assert.ok(lines[1].includes('r001'));
  assert.ok(lines[2].includes('r002'));
});

test('json-ld export produces valid JSON-LD', () => {
  const input = path.join(FIXTURES, 'claims.json');
  const output = path.join(tmpDir, 'claims.jsonld');
  const out = run(['export', '--format', 'json-ld', input, '-o', output]);
  assert.ok(out.includes('JSON-LD written'));

  const doc = JSON.parse(fs.readFileSync(output, 'utf-8'));
  assert.ok(doc['@context']);
  assert.strictEqual(doc['@type'], 'ItemList');
  assert.strictEqual(doc.numberOfItems, 2);
  assert.strictEqual(doc.itemListElement[0].item.identifier, 'r001');
});

test('markdown export converts HTML to markdown', () => {
  const input = path.join(FIXTURES, 'brief.html');
  const output = path.join(tmpDir, 'brief.md');
  const out = run(['export', '--format', 'markdown', input, '-o', output]);
  assert.ok(out.includes('Markdown written'));

  const md = fs.readFileSync(output, 'utf-8');
  assert.ok(md.includes('# Sprint Brief'));
  assert.ok(md.includes('**test**'));
  assert.ok(md.includes('*emphasis*'));
  assert.ok(md.includes('- First point'));
  assert.ok(md.includes('## Conclusion'));
});

test('static publish creates site with index', () => {
  const inputDir = path.join(tmpDir, 'sprint-output');
  const siteDir = path.join(tmpDir, 'site');
  fs.mkdirSync(inputDir, { recursive: true });
  fs.writeFileSync(path.join(inputDir, 'brief.html'), '<h1>Brief</h1>');
  fs.writeFileSync(path.join(inputDir, 'claims.json'), '[]');

  const out = run(['publish', '--target', 'static', inputDir, '-o', siteDir]);
  assert.ok(out.includes('Static site written'));
  assert.ok(fs.existsSync(path.join(siteDir, 'index.html')));
  assert.ok(fs.existsSync(path.join(siteDir, 'brief.html')));

  const index = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf-8');
  assert.ok(index.includes('brief.html'));
  assert.ok(index.includes('#d97706')); // amber accent
});

test('format detection works', () => {
  const formats = require('../lib/formats.js');
  assert.strictEqual(formats.detectFormat('brief.html'), 'html');
  assert.strictEqual(formats.detectFormat('claims.json'), 'json');
  assert.strictEqual(formats.detectFormat('notes.md'), 'markdown');
  assert.strictEqual(formats.detectFormat('data.csv'), 'csv');
});

test('unknown command exits with error', () => {
  try {
    run(['nonexistent']);
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err.stderr.includes('Unknown command'));
  }
});

test('export without --format exits with error', () => {
  try {
    run(['export', 'somefile.html']);
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err.stderr.includes('Missing --format'));
  }
});

cleanup();

console.log('\nDone.');
