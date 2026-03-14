#!/usr/bin/env node

'use strict';

const path = require('node:path');
const { parseArgs } = require('node:util');

const COMMANDS = {
  export: { description: 'Export artifacts to a target format', handler: runExport },
  publish: { description: 'Publish sprint outputs to a destination', handler: runPublish },
  convert: { description: 'Convert between artifact formats', handler: runConvert },
  formats: { description: 'List available export formats', handler: runFormats },
};

const USAGE = `
mill -- turn sprint evidence into shareable artifacts

Usage:
  mill export  --format <fmt> <file>     Export artifact to target format
  mill publish --target <dest> <dir>     Publish sprint outputs
  mill convert --from <fmt> --to <fmt> <file>  Convert between formats
  mill formats                           List available formats

Export formats:
  pdf        HTML or Markdown to PDF (via npx md-to-pdf)
  csv        Claims JSON to CSV
  markdown   HTML artifacts to clean Markdown
  json-ld    Claims JSON to JSON-LD for semantic web

Publish targets:
  static     Generate a static site from sprint outputs
  clipboard  Copy formatted output to system clipboard

Examples:
  npx @grainulator/mill export --format pdf output/brief.html
  npx @grainulator/mill export --format csv claims.json
  npx @grainulator/mill export --format json-ld claims.json -o claims.jsonld
  npx @grainulator/mill publish --target static output/
  npx @grainulator/mill convert --from html --to markdown output/brief.html
`.trim();

function main() {
  const args = process.argv.slice(2);

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

  if (!handler) {
    console.error(`Unknown command: ${command}`);
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
      console.error(`Unknown option: ${flag}. Run "mill export --help" for usage.`);
      process.exit(1);
    }
    throw err;
  }

  if (!values.format) {
    console.error('Missing --format. Options: pdf, csv, markdown, json-ld');
    process.exit(1);
  }

  const inputFile = positionals[0];
  if (!inputFile) {
    console.error('Missing input file.');
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
    console.error(`Unknown format: ${format}`);
    console.error(`Available: ${formats.listExportFormats().join(', ')}`);
    process.exit(1);
  }

  try {
    const result = await exporter.export(inputPath, outputPath);
    console.log(result.message);
  } catch (err) {
    console.error(`Export failed: ${err.message}`);
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
      console.error(`Unknown option: ${flag}. Run "mill publish --help" for usage.`);
      process.exit(1);
    }
    throw err;
  }

  if (!values.target) {
    console.error('Missing --target. Options: static, clipboard');
    process.exit(1);
  }

  const inputDir = positionals[0];
  if (!inputDir) {
    console.error('Missing input directory.');
    process.exit(1);
  }

  const inputPath = path.resolve(inputDir);
  const target = values.target;
  const outputPath = values.output ? path.resolve(values.output) : null;

  const formats = require('../lib/formats.js');
  const publisher = formats.getPublisher(target);

  if (!publisher) {
    console.error(`Unknown target: ${target}`);
    console.error(`Available: ${formats.listPublishTargets().join(', ')}`);
    process.exit(1);
  }

  try {
    const result = await publisher.publish(inputPath, outputPath);
    console.log(result.message);
  } catch (err) {
    console.error(`Publish failed: ${err.message}`);
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
      console.error(`Unknown option: ${flag}. Run "mill convert --help" for usage.`);
      process.exit(1);
    }
    throw err;
  }

  if (!values.from || !values.to) {
    console.error('Missing --from and/or --to format.');
    process.exit(1);
  }

  const inputFile = positionals[0];
  if (!inputFile) {
    console.error('Missing input file.');
    process.exit(1);
  }

  const inputPath = path.resolve(inputFile);
  const outputPath = values.output ? path.resolve(values.output) : null;

  // Convert is sugar: detect source, export to target
  const formats = require('../lib/formats.js');
  const exporter = formats.getExporter(values.to);

  if (!exporter) {
    console.error(`Unknown target format: ${values.to}`);
    process.exit(1);
  }

  try {
    const result = await exporter.export(inputPath, outputPath);
    console.log(result.message);
  } catch (err) {
    console.error(`Convert failed: ${err.message}`);
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

main();
