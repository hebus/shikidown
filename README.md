# shikidown

> Angular Markdown renderer with Shiki syntax highlighting, Angular component embedding, and incremental block rendering.

[![Documentation](https://img.shields.io/badge/docs-shikidown-0969da)](https://hebus.github.io/shikidown/docs/)
[![npm](https://img.shields.io/npm/v/shikidown?logo=npm&color=cb3837)](https://www.npmjs.com/package/shikidown)
[![Changelog](https://img.shields.io/badge/changelog-releases-8957e5)](https://github.com/hebus/shikidown/releases)
[![Angular](https://img.shields.io/badge/Angular-22-red?logo=angular)](https://angular.dev)
[![Shiki](https://img.shields.io/badge/Shiki-v4-blue)](https://shiki.style)
[![markdown-it](https://img.shields.io/badge/markdown--it-14%20%7C%2015-green)](https://markdown-it.github.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## What is shikidown?

**shikidown** is an Angular library that renders Markdown documents with:

- **[Shiki v4](https://shiki.style)** syntax highlighting — IDE-quality, dual dark/light theme via CSS variables
- **Angular components embedded by selector** — any component registered as a Custom Element can be placed directly in Markdown
- **Incremental block rendering** — only blocks whose source text changed are re-parsed; unchanged DOM nodes (including Web Component state) are preserved between keystrokes
- **`MarkdownComponent`**, **`MarkdownPipe`**, and **`MarkdownService`** — three integration points depending on your use case

---

## Documentation

The reference documentation lives at **[hebus.github.io/shikidown/docs](https://hebus.github.io/shikidown/docs/)** —
searchable, with a page per topic:

| | |
|---|---|
| [Installation](https://hebus.github.io/shikidown/docs/installation) | Packages, peer dependencies, the mermaid entry point |
| [Quick start](https://hebus.github.io/shikidown/docs/quick-start) | From an empty project to a rendered document |
| [Configuration](https://hebus.github.io/shikidown/docs/configuration) | Every option, with its default |
| [Embedding components](https://hebus.github.io/shikidown/docs/guides/embedding-components) | Selectors, attribute mapping, module registration |
| [Lazy-loaded components](https://hebus.github.io/shikidown/docs/guides/lazy-loading) | Keeping a page's components out of the initial bundle |
| [Incremental rendering](https://hebus.github.io/shikidown/docs/guides/incremental-rendering) | Block hashing, the LRU cache, DOM stability |
| [Mermaid diagrams](https://hebus.github.io/shikidown/docs/guides/mermaid) | The `shikidown/mermaid` entry point |
| [Styling & dark mode](https://hebus.github.io/shikidown/docs/guides/styling-dark-mode) | Typography and Shiki's dual-theme output |
| [API reference](https://hebus.github.io/shikidown/docs/api/provide-markdown) | `provideMarkdown`, `MarkdownService`, exported types |

A live demo — component showcase and Markdown playground — is at
**[hebus.github.io/shikidown/demo/](https://hebus.github.io/shikidown/demo/)**.

The rest of this file is a condensed version of the same material, kept here for readers arriving
from npm.

---

## Installation

```bash
npm install shikidown shiki markdown-it @angular/elements
```

`markdown-it` v15 ships its own type definitions. On v14, add them separately:

```bash
npm install --save-dev @types/markdown-it   # v14 only
```

**Peer dependencies:**

| Package | Version |
|---------|---------|
| `@angular/core` | `>=22.0.0` |
| `@angular/common` | `>=22.0.0` |
| `@angular/elements` | `>=22.0.0` |
| `@angular/platform-browser` | `>=22.0.0` |
| `markdown-it` | `>=14.0.0` |
| `shiki` | `>=4.0.0` |

> **Required, and easy to miss:** `@angular/elements` turns your components into Custom Elements.
> It ships as part of Angular, but `ng new` does not add it to `package.json` — so it is usually
> absent. `provideMarkdown()` imports `createCustomElement` from it directly: without the package
> the build fails on an unresolved import.

> **Optional:** `mermaid` (`>=11`) is an *optional* peer dependency. Install it **only** if you
> render diagrams — see [Mermaid diagrams](#mermaid-diagrams). It is loaded exclusively through
> the `shikidown/mermaid` entry point, so consumers who don't use it never pull `mermaid` into
> their bundle.

### TypeScript configuration

`shiki` `>=4.4` declares `[Symbol.dispose]()` on its highlighter, which the default `ES2022`
library does not know about. Without it the build fails with:

```
TS2550: Property 'dispose' does not exist on type 'SymbolConstructor'.
```

Add `ESNext.Disposable` to `lib` in your `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable", "ESNext.Disposable"]
  }
}
```

Prefer this over `"lib": ["esnext"]`, which would also enable every other proposal-stage API.

---

## Quick start

**1. Register the provider in `app.config.ts`:**

```typescript
import { provideMarkdown } from 'shikidown';

export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown({
      theme: { dark: 'github-dark', light: 'catppuccin-latte' },
    }),
  ],
};
```

**2. Use the component in a template:**

```typescript
import { MarkdownComponent } from 'shikidown';

@Component({
  imports: [MarkdownComponent],
  template: `<shikidown [content]="md" class="prose dark:prose-invert max-w-none" />`,
})
export class MyComponent {
  readonly md = `# Hello\n\nThis is **shikidown**.`;
}
```

---

## Configuration

`provideMarkdown()` accepts a `MarkdownConfig` object:

```typescript
provideMarkdown({
  // Shiki theme — string or dark/light pair. Only DEFAULT_THEME_NAMES are preloaded automatically;
  // anything else needs `extraThemes` (see below).
  theme: { dark: 'github-dark', light: 'catppuccin-latte' },

  // Shiki languages to preload, replacing the default set (DEFAULT_LANGUAGE_NAMES)
  languages: ['typescript', 'javascript', 'html', 'css', 'bash', 'json'],

  // Custom languages/themes outside the library's defaults — imported by your app,
  // so only your app pays for the chunk. Use a `() => import(…)` loader, since
  // provideMarkdown() is typically called eagerly from app.config.ts.
  extraLanguages: [() => import('@shikijs/langs/go')],
  extraThemes: [() => import('@shikijs/themes/dracula')],

  // Angular components to embed in Markdown, registered as Custom Elements
  components: {
    'my-alert': AlertComponent,
    'my-counter': CounterComponent,
  },

  // Additional markdown-it plugins — eager, or `{ load }` to keep a heavy one
  // out of the initial bundle
  plugins: [markdownItAnchor, { load: () => import('@vscode/markdown-it-katex') }],

  // Override markdown-it options (merged with defaults)
  markdownOptions: { breaks: true },

  // Incremental block rendering (default: false)
  incrementalRendering: true,

  // LRU block cache capacity (default: 256)
  blockCacheSize: 512,
})
```

### All options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `theme` | `string \| { dark, light }` | `{ dark: 'github-dark', light: 'poimandres' }` | Shiki theme(s). A string uses the same theme for both modes. Only the themes in `DEFAULT_THEME_NAMES` are preloaded automatically — anything else must be supplied via `extraThemes`. |
| `extraThemes` | `ThemeInput[]` | `[]` | Custom Shiki themes outside `DEFAULT_THEME_NAMES`, e.g. `import dracula from '@shikijs/themes/dracula'`. Imported by your app, so only your app pays for the chunk. |
| `languages` | `StringLiteralUnion<BundledLanguage>[]` | 16 common languages¹ | Shiki languages to preload at startup, replacing (not extending) the default set. |
| `extraLanguages` | `LanguageInput[]` | `[]` | Custom Shiki languages outside `DEFAULT_LANGUAGE_NAMES`, e.g. `import go from '@shikijs/langs/go'`. Imported by your app, so only your app pays for the chunk. |
| `components` | `Record<string, Type<unknown>>` | `{}` | Angular components registered as Custom Elements. |
| `componentModules` | `ComponentModuleSource[]` | `[]` | Modules whose exported components are registered, selectors read from their decorators. An entry may be a `() => import('…')` loader — see [Lazy-loaded components](#lazy-loaded-components). |
| `plugins` | `MarkdownItPluginSource[]` | `[]` | markdown-it plugins applied in declaration order. Each entry is either a plugin function, or `{ load: () => import('…') }` to resolve it lazily and keep it out of the initial bundle. A plugin receives `MarkdownItInstance`, the type `shikidown` exports for the markdown-it instance on both v14 and v15. |
| `markdownOptions` | `MarkdownItOptions` | — | markdown-it constructor options, merged with the library defaults (`html: true`, `linkify: true`, `typographer: true`). |
| `incrementalRendering` | `boolean` | `false` | Enable block-level incremental rendering in `MarkdownComponent`. Has no effect on `MarkdownPipe`. |
| `blockCacheSize` | `number` | `256` | Maximum number of rendered blocks kept in the LRU cache. |

> ¹ Default languages (`DEFAULT_LANGUAGE_NAMES`): `typescript`, `javascript`, `jsx`, `tsx`, `html`, `css`, `scss`, `json`, `yaml`, `bash`, `shell`, `markdown`, `sql`, `python`, `rust`, `go`.
> Default themes (`DEFAULT_THEME_NAMES`): `github-dark`, `github-light`, `poimandres`, `catppuccin-latte`.

### Custom languages and themes

`shikidown` only ships the grammars/themes listed above — Shiki has 235+ languages and 60+ themes,
and statically bundling all of them would defeat the purpose of keeping the initial bundle small.
Anything outside the defaults must be imported by your own application and passed via
`extraLanguages`/`extraThemes`:

```typescript
provideMarkdown({
  languages: ['typescript'],
  extraLanguages: [() => import('@shikijs/langs/go')],
  theme: 'dracula',
  extraThemes: [() => import('@shikijs/themes/dracula')],
});
```

Use the `() => import(…)` loader form, not a static import: `provideMarkdown()` is typically called
from `app.config.ts`, read eagerly at bootstrap, so a static import would land the grammar/theme in
your initial bundle instead of a chunk loaded on demand.

A fence whose language isn't loaded (neither a default nor an `extraLanguages` entry) renders
unhighlighted rather than failing.

---

## MarkdownComponent

```html
<shikidown
  [content]="markdownString"
  class="prose prose-slate dark:prose-invert max-w-none"
/>
```

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `content` | `string` | `''` | Markdown source to render. |
| `components` | `Record<string, Type<unknown>>` | `{}` | Additional Angular components registered as Custom Elements for this instance only. Merged with those declared in `provideMarkdown()`. |
| `componentModules` | `ComponentModuleSource[]` | `[]` | Additional modules whose components are registered for this instance, selectors read from their decorators. Accepts `() => import('…')` loaders, which is how you keep a page's components out of the initial bundle — see [Lazy-loaded components](#lazy-loaded-components). |

### Local component registration

Components passed via `[components]` are registered idempotently — `customElements.define()` is only called once per selector regardless of how many instances use it.

```html
<shikidown
  [content]="md"
  [components]="{ 'local-chart': ChartComponent }"
/>
```

---

## MarkdownPipe

Returns a `Signal<SafeHtml>` — call it as a function in the template:

```html
<!-- Simple -->
<div [innerHTML]="(markdownString | markdown)()"></div>

<!-- With @let -->
@let html = (markdownString | markdown)();
@if (html) {
  <div [innerHTML]="html"></div>
}
```

```typescript
import { MarkdownPipe } from 'shikidown';

@Component({
  imports: [MarkdownPipe],
  template: `<div [innerHTML]="(md | markdown)()"></div>`,
})
export class MyComponent {
  readonly md = '# Hello from the pipe';
}
```

> **Note:** `MarkdownPipe` does not support incremental rendering. Use `MarkdownComponent` with `incrementalRendering: true` for that feature.

---

## Embedding Angular components

Any component registered via `provideMarkdown({ components })` or the `[components]` input can be placed in Markdown using its CSS selector:

````markdown
# My document

Here is an interactive counter:

<my-counter initial-count="5" label="Votes"></my-counter>

And an alert:

<my-alert type="warning" title="Heads up" message="This is important."></my-alert>
````

Under the hood, shikidown uses **`@angular/elements`** — each component is wrapped in a standard Custom Element and registered with `customElements.define()`. The browser instantiates them when the rendered HTML is inserted into the DOM.

### Attribute → input mapping

HTML attributes are strings. The browser converts `kebab-case` attribute names to `camelCase` automatically when upgrading a Custom Element.

| HTML attribute | Angular `input()` |
|----------------|-------------------|
| `initial-count` | `initialCount` |
| `label` | `label` |
| `is-active` | `isActive` |

For numeric or boolean inputs, use Angular's built-in transform functions:

```typescript
import { numberAttribute, booleanAttribute } from '@angular/core';

@Component({ selector: 'my-counter' })
export class CounterComponent {
  readonly initialCount = input(0, { transform: numberAttribute });
  readonly disabled     = input(false, { transform: booleanAttribute });
}
```

### Registering whole modules

Listing every selector by hand gets tedious once you have more than a handful of components — and it is redundant, since each selector is already declared in its own `@Component` decorator. Pass the **module** instead and let shikidown read the selectors for you:

```typescript
import * as demos from './demos';

provideMarkdown({ componentModules: [demos] })
```

Exports that are not components are ignored, so a module can freely export mock data, helper functions or attribute-selector directives alongside its components.

### Only what the page uses

Through the **`[componentModules]` input**, shikidown registers only the selectors that actually appear in the document. A page module usually exports more than its Markdown tags — a dialog mounted imperatively, a host component reused elsewhere — and defining those would not be neutral.

`customElements.define` is global and retroactive: once a tag is defined, the browser *upgrades* any element bearing it as soon as it enters the DOM. A component that other code creates with `createComponent()` and appends to the body would therefore be instantiated a **second** time, outside the injection context its creator set up — and typically fail on whatever that context provided. A callable dialog reading its arguments from an injected handle simply never opens, with nothing pointing back at the registration.

This filtering does not apply to `provideMarkdown({ componentModules })`, which has no document to look at and still registers everything it is given.

`selectorUsedIn(content, selector)` is exported if you need the same test elsewhere, and `registerComponentModules` takes an optional third argument to filter with your own predicate.

### Global vs. local registration

| Method | Scope | When to use |
|--------|-------|-------------|
| `provideMarkdown({ components })` | Whole app | Components used across many pages |
| `provideMarkdown({ componentModules })` | Whole app | Many components, without listing selectors |
| `[components]` input | Single `<shikidown>` instance | Page-specific components |
| `[componentModules]` input | Single `<shikidown>` instance | Page-specific components, loaded on demand |

### Lazy-loaded components

A `componentModules` entry can be a **function returning a dynamic import**, in which case the module is only fetched when it is actually needed. This matters: components registered at bootstrap live in your initial bundle, however lazy your routes are. In a documentation site with sixty pages, that means shipping all sixty pages' components to every visitor.

Give each page a loader, and resolve only the one being displayed:

```typescript
// demo-loaders.ts — the only mapping you maintain
import type { ComponentModuleSource } from 'shikidown';

export const DEMO_LOADERS: Record<string, ComponentModuleSource[]> = {
  button: [() => import('./demos/button.demos')],
  tag:    [() => import('./demos/tag.demos')],
  // A page may pull in components defined elsewhere:
  'tag-advanced': [() => import('./demos/tag.demos'), () => import('./demos/shared.demos')],
};
```

```typescript
// The page component, reached through a lazy route
@Component({
  selector: 'doc-page',
  imports: [MarkdownComponent],
  template: `<shikidown [content]="content()" [componentModules]="modules()" />`,
})
export class DocPage {
  private readonly slug = inject(ActivatedRoute).snapshot.data['slug'] as string;

  protected readonly modules = computed(() => DEMO_LOADERS[this.slug] ?? []);
  protected readonly content = resource({
    loader: () => fetch(`docs/${this.slug}.md`).then(r => r.text()),
  }).value;
}
```

**Why registering after the markdown is rendered still works.** Custom element upgrades are retroactive by specification: when `customElements.define()` runs, the browser walks the document and upgrades any matching element already in the DOM. So an unknown `<my-counter>` sitting inertly in freshly rendered HTML comes alive as soon as its definition lands — no ordering constraint, no flash of missing content beyond the import itself. In practice the import wins the race anyway, since the markdown is usually fetched asynchronously too.

Two things worth knowing:

- Registration is **irreversible** — `customElements` has no undefine. Pass an injector whose lifetime is at least as long as the page (the component's own injector is fine; a short-lived one is not), and expect a selector to stay registered for the rest of the session.
- Components that read HTML attributes still work: the browser applies `attributeChangedCallback` during the upgrade, so attributes present before registration are not lost.

---

## Incremental rendering

When `incrementalRendering: true`, `MarkdownComponent` renders the document as a **list of independent root blocks** rather than a single HTML string.

### How it works

```
Content change
     │
     ▼
md.parse()  ──►  token grouping (depth-count)  ──►  blocks[]
                                                         │
                                     ┌───────────────────┘
                                     ▼
                          FNV-1a hash(block.source)
                                     │
                         ┌───────────┴────────────┐
                         │ hash in LRU cache?      │
                        yes                        no
                         │                         │
                   HTML reused               Shiki highlights
                         │                   result cached
                         └───────────┬────────────┘
                                     ▼
             @for (block of displayedBlocks; track block.hash)
                                     │
                         ┌───────────┴────────────┐
                         │ same SafeHtml ref?      │
                        yes                        no
                         │                         │
                  Angular skips              [innerHTML] updated
                  innerHTML write            → DOM replaced
```

### What is preserved between keystrokes

| | Without incremental | With incremental |
|-|---------------------|-----------------|
| Shiki re-highlighting | Every block, every time | Only changed blocks |
| DOM mutation | Full replacement | Only changed block nodes |
| Web Component state | Lost (counters reset) | Preserved in unchanged blocks |

### Clearing the cache

Call `MarkdownService.clearCache()` whenever you change the Shiki theme at runtime to force all blocks to be re-highlighted.

```typescript
import { MarkdownService } from 'shikidown';

@Component({ ... })
export class ThemeSwitcher {
  private readonly md = inject(MarkdownService);

  switchTheme(): void {
    // update your theme config...
    this.md.clearCache();
  }
}
```

---

## Mermaid diagrams

shikidown handles ` ```mermaid ` fenced blocks natively — **no markdown-it plugin required**.
The `MarkdownService` emits a `<pre class="mermaid" data-mermaid-src="…">` placeholder instead of
syntax-highlighting the fence, and the **`MermaidDirective`** renders those placeholders to SVG
client-side.

Because `mermaid` is heavy and optional, it lives in its own entry point — **`shikidown/mermaid`**
— and `mermaid` itself is an *optional* peer dependency. If you never import from
`shikidown/mermaid`, `mermaid` never enters your dependency graph.

**1. Install `mermaid`:**

```bash
npm install mermaid
```

**2. Import the directive from the `shikidown/mermaid` entry point and place it on `<shikidown>`:**

```typescript
import { MarkdownComponent } from 'shikidown';
import { MermaidDirective } from 'shikidown/mermaid';

@Component({
  selector: 'app-docs',
  imports: [MarkdownComponent, MermaidDirective],
  template: `<shikidown mermaid [content]="markdown" />`,
})
export class DocsComponent {
  readonly markdown = '```mermaid\ngraph TD\n  A[Start] --> B{Choice}\n```';
}
```

- Without the directive, ` ```mermaid ` blocks stay rendered as raw code.
- `mermaid` is only loaded (`import('mermaid')`) the first time the directive runs — and only in
  the browser (SSR-safe).
- The directive is **event-driven**: it watches for newly inserted diagrams and for dark/light
  theme changes (via the `.dark` class on `<html>`), re-theming rendered diagrams automatically.

---

## MarkdownService API

Inject `MarkdownService` directly for headless usage (SSR pre-rendering, custom pipes, etc.):

```typescript
import { MarkdownService, type RenderedBlock } from 'shikidown';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly md = inject(MarkdownService);

  async toHtml(markdown: string): Promise<string> {
    return this.md.parseAsync(markdown);
  }

  async toBlocks(markdown: string): Promise<RenderedBlock[]> {
    return this.md.parseBlocksAsync(markdown);
  }
}
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `initialize` | `() => Promise<void>` | Loads Shiki. Called automatically by all async methods. Safe to call multiple times. |
| `parseAsync` | `(content: string) => Promise<string>` | Renders the full Markdown document, returns raw HTML. |
| `parse` | `(content: string) => string` | Synchronous render. Throws if called before `initialize()` resolves. |
| `parseBlocksAsync` | `(content: string) => Promise<RenderedBlock[]>` | Renders as independent blocks with LRU caching. Used internally by `MarkdownComponent` in incremental mode. |
| `clearCache` | `() => void` | Empties the block LRU cache. |

---

## Styles & dark mode

`shikidown` ships **no default styles** — bring your own typography. The recommended approach is [Tailwind CSS Typography](https://github.com/tailwindlabs/tailwindcss-typography):

```html
<shikidown
  [content]="md"
  class="prose prose-slate dark:prose-invert max-w-none"
/>
```

### Setting up dark mode

Configure Tailwind v4 with a class-based `dark` variant and add the Shiki overrides:

```css
/* styles.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";

/* Class-based dark mode — toggle .dark on <html> */
@custom-variant dark (&:where(.dark, .dark *));

/* Shiki dual-theme: light theme is applied inline by Shiki (style="color:#xyz").
   Dark theme values live in --shiki-dark-* variables — activate them in dark mode. */
.dark .shiki {
  background-color: var(--shiki-dark-bg) !important;
}
.dark .shiki span {
  color: var(--shiki-dark) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

> **Why `!important`?** Shiki applies light-theme colors as inline `style` attributes, which have the highest CSS specificity. `!important` is the only way to override them with the `--shiki-dark-*` CSS variables.

### Flash-free dark mode on load

Add this inline script before your app bundle to apply the saved preference before first paint:

```html
<script>
  (function () {
    const stored = localStorage.getItem('dark');
    const prefersDark = stored === 'true'
      || (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (prefersDark) document.documentElement.classList.add('dark');
  })();
</script>
```

---

## Exported types

```typescript
import type {
  MarkdownConfig,        // Full configuration object for provideMarkdown()
  MarkdownThemePair,     // { dark: StringLiteralUnion<BundledTheme>; light: StringLiteralUnion<BundledTheme> }
  ComponentModule,       // Record<string, unknown> — a module exporting components
  ComponentModuleSource, // ComponentModule | (() => Promise<ComponentModule>)
  ParsedBlock,           // { hash, startLine, endLine, tokens, source }
  RenderedBlock,         // { hash: string; html: string }
} from 'shikidown';
```

---

## Project structure

```
markdown-shiki-renderer/
├── projects/
│   └── shikidown/               # Library source (ng-packagr)
│       ├── src/                 # Primary entry point → import from 'shikidown'
│       │   └── lib/
│       │       ├── markdown.component.ts   # <shikidown> component
│       │       ├── markdown.pipe.ts        # markdown pipe
│       │       ├── markdown.service.ts     # parsing, Shiki init, LRU cache
│       │       ├── markdown.provider.ts    # provideMarkdown(), registerAsCustomElement(), registerComponentModules()
│       │       ├── markdown.config.ts      # MarkdownConfig interface
│       │       ├── markdown.tokens.ts      # MARKDOWN_CONFIG injection token
│       │       └── markdown.types.ts       # ParsedBlock, RenderedBlock, hashSource
│       └── mermaid/             # Secondary entry point → import from 'shikidown/mermaid'
│           └── src/
│               └── mermaid.directive.ts    # MermaidDirective (dynamic import('mermaid'))
├── docs/                        # Documentation site (Next.js + Fumadocs, static export)
│   ├── content/docs/            # The MDX sources published at /docs
│   ├── app/                     # Landing page, docs routes, static search index
│   └── public/demo/             # Demo build, copied in by the deploy workflow
└── src/                         # Demo application
    ├── pages/
    │   ├── home/                # Landing page
    │   ├── guide/               # Full documentation (FR / EN)
    │   ├── playground/          # Live Markdown editor
    │   └── components/          # Demo component showcase
    ├── components/
    │   ├── navbar/              # Navigation + dark mode + language toggle
    │   ├── demo-counter/        # Stateful counter Web Component
    │   ├── demo-alert/          # Alert Web Component
    │   └── demo-badge/          # Badge Web Component
    └── services/
        └── language.service.ts  # FR/EN language signal
```

---

## Local development

The demo application and the documentation site are two independent projects, each with its own
`package.json`, and they run side by side:

```bash
# Demo application → http://localhost:4200
npm install
npm start

# Documentation site → http://localhost:3000
cd docs
npm install
npm run dev
```

They only become one site at build time, so while developing, the links between them point at each
other's dev server rather than at the deployed paths.

Both are deployed by a single GitHub Actions workflow: the demo is built first and copied into
`docs/public/demo`, then the documentation site is exported statically and published to GitHub
Pages. The documentation owns the root of the site; the demo is served from `/demo/` and uses hash
routing, because GitHub Pages only falls back to the `404.html` at the root of a site.

---

## Changelog

Each version is documented on the **[GitHub releases page](https://github.com/hebus/shikidown/releases)** — what changed, why, and the migration steps when there are any.

---

## License

MIT
