"use strict";

const fs = require("node:fs");
const path = require("node:path");

const pdf = require("./exporters/pdf.js");
const csv = require("./exporters/csv.js");
const markdown = require("./exporters/markdown.js");
const jsonLd = require("./exporters/json-ld.js");
const static_ = require("./publishers/static.js");
const clipboard = require("./publishers/clipboard.js");

// Legacy CJS exporters. The convert pipeline still uses these for the four
// original formats; the broader format catalogue is the ESM files in
// lib/formats/*.mjs (discovered below).
const EXPORTERS = {
  pdf,
  csv,
  markdown,
  "json-ld": jsonLd,
};

const PUBLISHERS = {
  static: static_,
  clipboard,
};

const FORMATS_DIR = path.join(__dirname, "formats");

/**
 * Detect the likely format of an input file by extension.
 */
function detectFormat(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const map = {
    html: "html",
    htm: "html",
    md: "markdown",
    json: "json",
    csv: "csv",
    jsonld: "json-ld",
  };
  return map[ext] || "unknown";
}

function getExporter(name) {
  return EXPORTERS[name] || null;
}

function getPublisher(name) {
  return PUBLISHERS[name] || null;
}

function listExportFormats() {
  const cjsNames = Object.keys(EXPORTERS);
  let esmNames = [];
  try {
    esmNames = fs
      .readdirSync(FORMATS_DIR)
      .filter((f) => f.endsWith(".mjs") && !f.startsWith("_"))
      .map((f) => f.replace(".mjs", ""));
  } catch {
    // No lib/formats/ directory — stay with CJS list only.
  }
  // Dedup in case an ESM format shadows a CJS exporter by name.
  return Array.from(new Set([...cjsNames, ...esmNames])).sort();
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
