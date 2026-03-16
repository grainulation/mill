# Mill Export Formats

Mill converts `compilation.json` into distributable output formats. Every format reads from the same compiled data, so the content is consistent across exports.

## Usage

```bash
npx @grainulation/mill export --format <format> [options]
```

Mill reads `compilation.json` from the current directory by default. Use `--input <path>` to specify a different file.

## PDF

Structured decision document with cover page, table of contents, and evidence appendix.

```bash
mill export --format pdf
mill export --format pdf --output report.pdf
mill export --format pdf --template minimal
```

Output: single `.pdf` file. Requires no external dependencies (uses built-in PDF generation).

## CSV

Flat table of claims. One row per claim with columns for ID, type, evidence tier, status, and text.

```bash
mill export --format csv
mill export --format csv --columns id,type,tier,text
```

Output: single `.csv` file. Useful for importing into spreadsheets or feeding into other tools.

## Markdown

Structured Markdown document. Same content as the PDF but in plain text.

```bash
mill export --format markdown
mill export --format md --sections summary,risks,recommendations
```

Output: single `.md` file. The `--sections` flag controls which sections to include.

## JSON-LD

Linked data representation of the sprint. Useful for machine consumption and semantic tooling.

```bash
mill export --format jsonld
mill export --format jsonld --context https://grainulation.com/schema/v1
```

Output: single `.jsonld` file with `@context`, `@type`, and claim nodes.

## HTML Static Site

Self-contained HTML file with inline CSS and JS. Interactive claim explorer with filtering and search.

```bash
mill export --format html
mill export --format html --theme dark
```

Output: single `.html` file. No external dependencies. Works offline.

## Clipboard

Copies a formatted summary to the system clipboard. Intended for pasting into Slack, email, or documents.

```bash
mill export --format clipboard
mill export --format clipboard --style bullets
```

Output: nothing written to disk. Content is placed on the system clipboard.

## Issue Tracker

Generates issues from recommendation and risk claims. Supports Jira, Linear, and GitHub Issues.

```bash
mill export --format jira --project PROJ
mill export --format github --repo org/repo
```

Output: JSON file with issue payloads ready for the target API. Supported targets: Jira, Linear, GitHub Issues. Use `--push` to create issues directly (requires API tokens).

## Diagram (Mermaid)

Generates a Mermaid diagram showing claim relationships, conflicts, and dependency chains.

```bash
mill export --format mermaid
mill export --format mermaid --type flowchart
mill export --format mermaid --type timeline
```

Output: single `.mmd` file. Render with any Mermaid-compatible viewer or embed in Markdown.

## Slide Deck

Scroll-snap HTML presentation. One slide per key finding with evidence attribution.

```bash
mill export --format slides
mill export --format slides --max-slides 12
```

Output: single `.html` file with scroll-snap CSS. Dark theme, no external dependencies.

## Global Options

These flags work with any format:

| Flag | Description |
|---|---|
| `--input <path>` | Path to `compilation.json` (default: `./compilation.json`) |
| `--output <path>` | Output file path (default: auto-generated from format) |
| `--filter <expr>` | Filter claims by type, tier, or status before export |
| `--include-retracted` | Include retracted claims (excluded by default) |
| `--quiet` | Suppress progress output |
