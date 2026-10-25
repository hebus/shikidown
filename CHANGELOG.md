# Changelog

All notable changes to `shikidown`. Versions follow [Semantic Versioning](https://semver.org).

## [3.0.0] — 2026-10-25

Streaming LLM output, and safe defaults for untrusted Markdown.
Migration guide: [Migrating to 3.0](https://hebus.github.io/shikidown/docs/guides/migration-v3).

### Breaking changes

- **Raw HTML is filtered by default** (`htmlPolicy: 'sanitize'`): event handlers, `style`, `<script>`,
  `<iframe>`, `<form>`, `<svg>`… are removed; custom elements are kept. `htmlPolicy: 'trusted'`
  restores the 2.x behaviour.
- **URL protocol allow-list** (`http`, `https`, `mailto`, `tel`) for raw HTML attributes and Markdown
  links. Configurable through `sanitize.allowedProtocols`.
- **`MermaidDirective` defaults to `securityLevel: 'strict'`** (was `'loose'`); opt back in with
  `mermaidSecurityLevel="loose"`.
- Incremental blocks are `<div class="shikidown-block">` tracked by a stable id; tables are wrapped in
  `<div class="shikidown-table" tabindex="0">` and header cells carry `scope="col"`.
- `MarkdownComponent.incrementalMode` is now a protected signal — use the `incremental` input.

### Features

- `<shikidown [streaming]>`: display repair of unfinished Markdown, re-parsing of the last block only,
  in-place DOM patching that keeps embedded components' state, deferred highlighting of open code
  fences, Mermaid diagrams rendered once their fence closes, `aria-busy` while generating.
- `[incremental]` and `[animation]` (`'none' | 'caret' | 'fade'`) inputs, honouring
  `prefers-reduced-motion`.
- `MarkdownService.renderBlocksAsync()`, `getStats()`, `resetStats()`.
- `repairIncompleteMarkdown()`, `sanitizeHtml()`, `isSafeUrl()` exported.
- `shikidown/math` entry point: `katexPlugin()` loads KaTeX on demand, with options.
- `MermaidDirective`: invalid diagrams keep their source on screen (`data-mermaid-error`) without
  blocking the others.
- Highlight cache: identical code is highlighted once.
- `MarkdownItOptions` and the new types are exported.

### Fixes

- **XSS in Mermaid fences**: the diagram source was injected unescaped in the placeholder body.
- A block using `[text][id]` was served from cache with a stale rendering after its reference
  definition was added.
- Identical blocks produced duplicate `@for` keys (NG0955).
- The block cache evicted in insertion order instead of least-recently-used, and a 32-bit hash
  collision could serve another block's HTML.
- A failed initialisation (chunk load error) was memoised and never retried.

### Performance

Word-by-word stream, both paths in the same run (`streaming-perf.spec.ts`). Timings depend on the
machine and its load; highlight and parse counts are deterministic.

| Document | 2.5.1 path | 3.0.0 streaming path |
|---|---|---|
| LLM answer (228 updates) | 879 ms, 42 highlights, 228 full parses | 79 ms, 2 highlights, 10 full parses |
| Long answer (1 824 updates) | 3 204 ms, 42 highlights, 1 824 full parses | 350 ms, 2 highlights, 10 full parses |
| 80-line Python block (584 updates) | 3 771 ms, 415 highlights, 584 full parses | 272 ms, 2 highlights, 6 full parses |

Initial bundle of the demo: +13 kB raw (+4.6 kB transferred).
