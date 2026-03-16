#!/usr/bin/env node

'use strict';

const path = require('node:path');
const { parseArgs } = require('node:util');
const { fork } = require('node:child_process');

const LIB_DIR = path.join(__dirname, '..', 'lib');

const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
function vlog(...a) {
  if (!verbose) return;
  const ts = new Date().toISOString();
  process.stderr.write(`[${ts}] mill: ${a.join(' ')}\n`);
}

const COMMANDS = {
  export: { description: 'Export artifacts to a target format', handler: runExport },
  publish: { description: 'Publish sprint outputs to a destination', handler: runPublish },
  convert: { description: 'Convert between artifact formats', handler: runConvert },
  formats: { description: 'List available export formats', handler: runFormats },
  serve: { description: 'Start the export workbench UI', handler: runServe },
};

const USAGE = `
mill -- turn sprint evidence into shareable artifacts

Usage:
  mill serve   [--port 9094] [--source <dir>]  Start the export workbench UI
  mill export  --format <fmt> <file>           Export artifact to target format
  mill publish --target <dest> <dir>           Publish sprint outputs
  mill convert --from <fmt> --to <fmt> <file>  Convert between formats
  mill formats                                 List available formats

Export formats:
  pdf        HTML or Markdown to PDF (via npx md-to-pdf)
  csv        Claims JSON to CSV
  markdown   HTML artifacts to clean Markdown
  json-ld    Claims JSON to JSON-LD for semantic web

Publish targets:
  static     Generate a static site from sprint outputs
  clipboard  Copy formatted output to system clipboard

Examples:
  npx @grainulation/mill serve --port 9094 --source /path/to/sprint
  npx @grainulation/mill export --format pdf output/brief.html
  npx @grainulation/mill export --format csv claims.json
  npx @grainulation/mill export --format json-ld claims.json -o claims.jsonld
  npx @grainulation/mill publish --target static output/
  npx @grainulation/mill convert --from html --to markdown output/brief.html
`.trim();

function main() {
  const args = process.argv.slice(2);

  vlog('startup', `command=${args[0] || '(none)'}`, `cwd=${process.cwd()}`);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  const command = args[0];
  const handler = COMMANDS[command];

  if (command === 'help') {
    console.log(USAGE);
    process.exit(0);
  }

  // serve command forks the ESM server module
  if (command === 'serve') {
    runServe(args.slice(1));
    return;
  }

  if (!handler) {
    console.error(`mill: unknown command: ${command}`);
    console.error(`Run "mill --help" for usage.`);
    process.exit(1);
  }

  handler.handler(args.slice(1));
}

async function runExport(args) {
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      args,
      options: {
        format: { type: 'string', short: 'f' },
        output: { type: 'string', short: 'o' },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    if (err.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      const flag = err.message.match(/option "([^"]+)"/)?.[1] || 'unknown';
      console.error(`mill: unknown option: ${flag}. Run "mill export --help" for usage.`);
      process.exit(1);
    }
    throw err;
  }

  if (!values.format) {
    console.error('mill: missing --format. Options: pdf, csv, markdown, json-ld');
    process.exit(1);
  }

  const inputFile = positionals[0];
  if (!inputFile) {
    console.error('mill: missing input file.');
    process.exit(1);
  }

  const inputPath = path.resolve(inputFile);
  const format = values.format;
  const outputPath = values.output
    ? path.resolve(values.output)
    : null;

  const formats = require('../lib/formats.js');
  const exporter = formats.getExporter(format);

  if (!exporter) {
    console.error(`mill: unknown format: ${format}`);
    console.error(`Available: ${formats.listExportFormats().join(', ')}`);
    process.exit(1);
  }

  try {
    const result = await exporter.export(inputPath, outputPath);
    console.log(result.message);
  } catch (err) {
    console.error(`mill: export failed: ${err.message}`);
    process.exit(1);
  }
}

async function runPublish(args) {
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      args,
      options: {
        target: { type: 'string', short: 't' },
        output: { type: 'string', short: 'o' },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    if (err.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      const flag = err.message.match(/option "([^"]+)"/)?.[1] || 'unknown';
      console.error(`mill: unknown option: ${flag}. Run "mill publish --help" for usage.`);
      process.exit(1);
    }
    throw err;
  }

  if (!values.target) {
    console.error('mill: missing --target. Options: static, clipboard');
    process.exit(1);
  }

  const inputDir = positionals[0];
  if (!inputDir) {
    console.error('mill: missing input directory.');
    process.exit(1);
  }

  const inputPath = path.resolve(inputDir);
  const target = values.target;
  const outputPath = values.output ? path.resolve(values.output) : null;

  const formats = require('../lib/formats.js');
  const publisher = formats.getPublisher(target);

  if (!publisher) {
    console.error(`mill: unknown target: ${target}`);
    console.error(`Available: ${formats.listPublishTargets().join(', ')}`);
    process.exit(1);
  }

  try {
    const result = await publisher.publish(inputPath, outputPath);
    console.log(result.message);
  } catch (err) {
    console.error(`mill: publish failed: ${err.message}`);
    process.exit(1);
  }
}

async function runConvert(args) {
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      args,
      options: {
        from: { type: 'string' },
        to: { type: 'string' },
        output: { type: 'string', short: 'o' },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    if (err.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      const flag = err.message.match(/option "([^"]+)"/)?.[1] || 'unknown';
      console.error(`mill: unknown option: ${flag}. Run "mill convert --help" for usage.`);
      process.exit(1);
    }
    throw err;
  }

  if (!values.from || !values.to) {
    console.error('mill: missing --from and/or --to format.');
    process.exit(1);
  }

  const inputFile = positionals[0];
  if (!inputFile) {
    console.error('mill: missing input file.');
    process.exit(1);
  }

  const inputPath = path.resolve(inputFile);
  const outputPath = values.output ? path.resolve(values.output) : null;

  // Convert is sugar: detect source, export to target
  const formats = require('../lib/formats.js');
  const exporter = formats.getExporter(values.to);

  if (!exporter) {
    console.error(`mill: unknown target format: ${values.to}`);
    process.exit(1);
  }

  try {
    const result = await exporter.export(inputPath, outputPath);
    console.log(result.message);
  } catch (err) {
    console.error(`mill: convert failed: ${err.message}`);
    process.exit(1);
  }
}

function runFormats() {
  const formats = require('../lib/formats.js');
  console.log('Export formats:');
  for (const f of formats.listExportFormats()) {
    console.log(`  ${f}`);
  }
  console.log('\nPublish targets:');
  for (const t of formats.listPublishTargets()) {
    console.log(`  ${t}`);
  }
}

function runServe(args) {
  const serverPath = path.join(LIB_DIR, 'server.js');
  const child = fork(serverPath, args, { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
}

main();
