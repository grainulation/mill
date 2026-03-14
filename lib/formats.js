'use strict';

const pdf = require('./exporters/pdf.js');
const csv = require('./exporters/csv.js');
const markdown = require('./exporters/markdown.js');
const jsonLd = require('./exporters/json-ld.js');
const static_ = require('./publishers/static.js');
const clipboard = require('./publishers/clipboard.js');

const EXPORTERS = {
  pdf,
  csv,
  markdown,
  'json-ld': jsonLd,
};

const PUBLISHERS = {
  static: static_,
  clipboard,
};

/**
 * Detect the likely format of an input file by extension.
 */
function detectFormat(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const map = {
    html: 'html',
    htm: 'html',
    md: 'markdown',
    json: 'json',
    csv: 'csv',
    jsonld: 'json-ld',
  };
  return map[ext] || 'unknown';
}

function getExporter(name) {
  return EXPORTERS[name] || null;
}

function getPublisher(name) {
  return PUBLISHERS[name] || null;
}

function listExportFormats() {
  return Object.keys(EXPORTERS);
}

function listPublishTargets() {
  return Object.keys(PUBLISHERS);
}

module.exports = {
  detectFormat,
  getExporter,
  getPublisher,
  listExportFormats,
  listPublishTargets,
};
