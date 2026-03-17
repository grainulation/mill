<p align="center">
  <img src="site/wordmark.svg" alt="Mill" width="400">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@grainulation/mill"><img src="https://img.shields.io/npm/v/@grainulation/mill" alt="npm version"></a> <a href="https://www.npmjs.com/package/@grainulation/mill"><img src="https://img.shields.io/npm/dm/@grainulation/mill" alt="npm downloads"></a> <a href="https://github.com/grainulation/mill/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@grainulation/mill" alt="license"></a> <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@grainulation/mill" alt="node"></a> <a href="https://github.com/grainulation/mill/actions"><img src="https://github.com/grainulation/mill/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center"><strong>Turn sprint evidence into shareable artifacts.</strong></p>

24 export formats. PDF, CSV, Markdown, slides, JSON-LD, Jira, GitHub Issues, and more. Give mill your claims or HTML output and it produces whatever your team needs.

## Install

```bash
npm install -g @grainulation/mill
```

Or use directly:

```bash
npx @grainulation/mill export --format csv claims.json
```

## Quick start

```bash
# Claims to CSV
mill export --format csv claims.json

# HTML brief to PDF
mill export --format pdf output/brief.html

# HTML to clean Markdown
mill convert --from html --to markdown output/brief.html

# Claims to JSON-LD
mill export --format json-ld claims.json -o claims.jsonld

# Build a static site from sprint outputs
mill publish --target static output/

# Copy to clipboard
mill publish --target clipboard output/brief.html
```

## Export formats

24 built-in formats:

| Format | Input | Output |
|--------|-------|--------|
| `pdf` | HTML, Markdown | PDF |
| `csv` | claims.json | CSV |
| `markdown` | HTML | Markdown |
| `json-ld` | claims.json | JSON-LD (schema.org) |
| `html-report` | claims.json | Interactive HTML report |
| `slide-deck` | claims.json | Scroll-snap HTML presentation |
| `github-issues` | claims.json | GitHub Issues JSON payloads |
| `jira-csv` | claims.json | Jira-compatible CSV import |
| `yaml` | claims.json | YAML |
| `ndjson` | claims.json | Newline-delimited JSON |
| `dot` | claims.json | Graphviz DOT |
| `graphml` | claims.json | GraphML |
| `bibtex` | claims.json | BibTeX citations |
| `ris` | claims.json | RIS citations |
| `rss` | claims.json | RSS feed |
| `opml` | claims.json | OPML outline |
| `obsidian` | claims.json | Obsidian vault |
| `sql` | claims.json | SQL INSERT statements |
| `typescript-defs` | claims.json | TypeScript type definitions |
| `executive-summary` | claims.json | Executive summary HTML |
| `evidence-matrix` | claims.json | Evidence tier matrix |
| `changelog` | claims.json | Sprint changelog |
| `sankey` | claims.json | Sankey diagram data |
| `treemap` | claims.json | Treemap data |

Run `mill formats` to see the full list with descriptions.

## Publish targets

| Target | Output |
|--------|--------|
| `static` | Dark-themed static site in `_site/` |
| `clipboard` | System clipboard (pbcopy/xclip/clip) |

## CLI

```
mill export    --format <fmt> <file>              Export to target format
mill convert   --from <fmt> --to <fmt> <file>     Convert between formats
mill publish   --target <dest> <dir>              Publish sprint outputs
mill formats                                      List available formats
mill serve     [--port 9094] [--source <dir>]     Start the export workbench UI
mill serve-mcp                                    Start the MCP server on stdio
```

All commands accept `-o <path>` to set the output location.

## Works standalone

Mill reads sprint output files directly. It does not require wheat -- give it HTML, Markdown, or claims JSON and it produces shareable formats.

## Zero dependencies

Node built-in modules only. Heavy operations (PDF) run via `npx` on demand.

## Part of the grainulation ecosystem

| Tool | Role |
|------|------|
| [wheat](https://github.com/grainulation/wheat) | Research engine -- grow structured evidence |
| [farmer](https://github.com/grainulation/farmer) | Permission dashboard -- approve AI actions in real time |
| [barn](https://github.com/grainulation/barn) | Shared tools -- templates, validators, sprint detection |
| **mill** | Format conversion -- export to PDF, CSV, slides, 24 formats |
| [silo](https://github.com/grainulation/silo) | Knowledge storage -- reusable claim libraries and packs |
| [harvest](https://github.com/grainulation/harvest) | Analytics -- cross-sprint patterns and prediction scoring |
| [orchard](https://github.com/grainulation/orchard) | Orchestration -- multi-sprint coordination and dependencies |
| [grainulation](https://github.com/grainulation/grainulation) | Unified CLI -- single entry point to the ecosystem |

## License

MIT
