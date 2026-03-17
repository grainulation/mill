# mill

Turn sprint evidence into shareable artifacts.

## Quick start

```bash
# Export a brief to PDF
npx @grainulation/mill export --format pdf output/brief.html

# Claims to CSV
npx @grainulation/mill export --format csv claims.json

# HTML to clean Markdown
npx @grainulation/mill convert --from html --to markdown output/brief.html

# Build a static site from sprint outputs
npx @grainulation/mill publish --target static output/

# Claims to JSON-LD
npx @grainulation/mill export --format json-ld claims.json -o claims.jsonld

# Copy to clipboard
npx @grainulation/mill publish --target clipboard output/brief.html
```

## Export formats

24 built-in formats in `lib/formats/`. Most commonly used:

| Format | Input | Output | Notes |
|--------|-------|--------|-------|
| `pdf` | HTML, Markdown | PDF | Uses `npx md-to-pdf` or puppeteer |
| `csv` | claims.json | CSV | Flat columns, semicolon-joined tags |
| `markdown` | HTML | Markdown | Zero-dep tag stripping, handles wheat output |
| `json-ld` | claims.json | JSON-LD | schema.org vocab, wheat namespace |
| `html-report` | claims.json | HTML | Self-contained interactive report |
| `slide-deck` | claims.json | HTML | Scroll-snap presentation |
| `github-issues` | claims.json | JSON | GitHub Issues payloads |
| `jira-csv` | claims.json | CSV | Jira-compatible import |
| `yaml` | claims.json | YAML | YAML export |
| `ndjson` | claims.json | NDJSON | Newline-delimited JSON |

Run `mill formats` to see all 24 formats and publish targets.

## Publish targets

| Target | Input | Output | Notes |
|--------|-------|--------|-------|
| `static` | directory | `_site/` | Dark-themed index + copied artifacts |
| `clipboard` | file or dir | clipboard | Uses pbcopy/xclip/clip |

## Zero dependencies

Mill has no installed npm dependencies. Heavy operations (PDF generation) run via `npx` on demand, pulling packages only when needed.

## Works standalone

Mill reads sprint output files directly. It does not require wheat to be installed -- give it HTML, Markdown, or claims JSON and it produces shareable formats.

## CLI reference

```
mill export    --format <fmt> <file>              Export to target format
mill publish   --target <dest> <dir>              Publish sprint outputs
mill convert   --from <fmt> --to <fmt> <file>     Convert between formats
mill formats                                      List available formats
mill serve     [--port 9094] [--source <dir>]     Start the export workbench UI
mill serve-mcp                                    Start the MCP server on stdio
```

All commands accept `-o <path>` to set the output location.

## License

MIT
