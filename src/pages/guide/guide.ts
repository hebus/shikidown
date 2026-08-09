import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarkdownComponent } from 'shikidown';
import { MermaidDirective } from 'shikidown/mermaid';
import { LanguageService } from '../../services/language.service';

const GUIDE_MD: Record<'fr' | 'en', string> = {
  fr: `
# Guide de la librairie shikidown

## Installation

\`\`\`bash
npm install shikidown shiki markdown-it @angular/elements
npm install --save-dev @types/markdown-it   # markdown-it v14 uniquement
\`\`\`

\`@angular/elements\` est requis : il est fourni avec Angular mais \`ng new\` ne l'ajoute pas au
\`package.json\`. À partir de \`markdown-it\` v15, les types sont inclus dans le paquet et
\`@types/markdown-it\` devient inutile.

Avec \`shiki\` >= 4.4, ajoutez \`ESNext.Disposable\` à \`lib\` dans votre \`tsconfig.json\` —
sans quoi la compilation échoue sur \`TS2550: Property 'dispose' does not exist on type
'SymbolConstructor'\`.

## Configuration

Appelez \`provideMarkdown()\` dans votre \`app.config.ts\` :

\`\`\`typescript
import { provideMarkdown } from 'shikidown';
import { AlertComponent } from './components';

export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown({
      // Thème Shiki : string simple ou paire dark/light
      theme: { dark: 'github-dark', light: 'catppuccin-latte' },
      // Langages Shiki à précharger (intellisense identique à createHighlighter)
      languages: ['typescript', 'javascript', 'html', 'css', 'bash'],
      // Composants Angular disponibles dans le Markdown (enregistrés comme Custom Elements)
      components: {
        'my-alert': AlertComponent,
      },
      // Rendu incrémental : seuls les blocs modifiés sont re-parsés (défaut : false)
      incrementalRendering: true,
      // Taille max du cache de blocs (défaut : 256)
      blockCacheSize: 128,
    }),
  ],
};
\`\`\`

### Options de configuration

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| \`theme\` | \`string \| { dark, light }\` | \`{ dark: 'github-dark', light: 'poimandres' }\` | Thème(s) Shiki |
| \`languages\` | \`string[]\` | 17 langages courants | Langages à précharger |
| \`components\` | \`Record<string, Type>\` | \`{}\` | Composants Angular embeddables |
| \`plugins\` | \`Array<(md) => void>\` | \`[]\` | Plugins markdown-it supplémentaires |
| \`markdownOptions\` | \`MarkdownItOptions\` | — | Options markdown-it (html, breaks…) |
| \`incrementalRendering\` | \`boolean\` | \`false\` | Rendu par blocs avec cache |
| \`blockCacheSize\` | \`number\` | \`256\` | Capacité du cache LRU de blocs |

---

## Plugins

shikidown expose l'instance \`markdown-it\` complète à tout plugin suivant la signature \`(md: MarkdownIt) => void\`.
Déclarez un tableau de plugins dans \`provideMarkdown()\` — ils sont appliqués dans l'ordre, une seule fois, juste avant le premier rendu.

### Installer un plugin

\`\`\`bash
npm install markdown-it-anchor markdown-it-footnote
\`\`\`

\`\`\`typescript
import { provideMarkdown } from 'shikidown';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from 'markdown-it-footnote';

provideMarkdown({
  plugins: [markdownItAnchor, markdownItFootnote],
})
\`\`\`

### Plugins populaires

| Fonctionnalité | Package |
|----------------|---------|
| Ancres sur les titres | [\`markdown-it-anchor\`](https://www.npmjs.com/package/markdown-it-anchor) |
| Notes de bas de page | [\`markdown-it-footnote\`](https://www.npmjs.com/package/markdown-it-footnote) |
| Listes de tâches | [\`markdown-it-task-lists\`](https://www.npmjs.com/package/markdown-it-task-lists) |
| LaTeX via KaTeX | [\`@vscode/markdown-it-katex\`](https://www.npmjs.com/package/@vscode/markdown-it-katex) |
| Diagrammes Mermaid | [\`mermaid\`](https://www.npmjs.com/package/mermaid) — support natif (voir ci-dessous) |
| Texte surligné \`==…==\` | [\`markdown-it-mark\`](https://www.npmjs.com/package/markdown-it-mark) |

### KaTeX — rendu LaTeX

\`\`\`bash
npm install @vscode/markdown-it-katex
\`\`\`

KaTeX pèse environ 266 Ko : déclarez-le en chargeur paresseux pour qu'il reste hors
du bundle initial des pages sans formule.

\`\`\`typescript
provideMarkdown({
  plugins: [{ load: () => import('@vscode/markdown-it-katex') }],
})
\`\`\`

Ajoutez la feuille de style KaTeX aux \`styles\` de votre \`angular.json\` — la version
est alors figée par votre lockfile, sans dépendance réseau externe :

\`\`\`json
"styles": ["node_modules/katex/dist/katex.min.css", "src/styles.css"]
\`\`\`

Le plugin étant publié en CommonJS, le build signale \`Module '@vscode/markdown-it-katex'
[...] is not ESM\`. Il n'existe pas d'alternative ESM maintenue : déclarez-le dans les
options de build pour acquitter l'avertissement.

\`\`\`json
"allowedCommonJsDependencies": ["@vscode/markdown-it-katex", "katex"]
\`\`\`

Syntaxe dans le Markdown — formule inline avec \`$...$\` ou en bloc avec \`$$...$$\` :

**Inline :** $E = mc^2$ — énergie-masse

**Bloc :**

$$
\\int_{-\\infty}^{+\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

$$
a^2 + b^2 = c^2
$$

### Mermaid — diagrammes

shikidown gère nativement les blocs \`\`\`mermaid\`\`\` — aucun plugin nécessaire.
Il émet un \`<pre class="mermaid" data-mermaid-src="...">\` que la directive \`mermaid\` active côté client.

\`mermaid\` est une *peer dependency optionnelle* : installez-la uniquement si vous utilisez des diagrammes.

\`\`\`bash
npm install mermaid
\`\`\`

Pour optimiser le rendu, **utilisez la directive \`mermaid\`** fournie par shikidown : posez-la directement sur l'élément \`<shikidown>\`.
Plutôt que de relancer \`mermaid.run()\` à chaque cycle de rendu, elle est pilotée par événement (elle observe l'arrivée de nouveaux diagrammes et le changement de thème) et scopée à son hôte. Le thème dark/light est détecté automatiquement via la classe \`.dark\` sur \`<html>\` :

\`\`\`typescript
import { MarkdownComponent } from 'shikidown';
import { MermaidDirective } from 'shikidown/mermaid';

@Component({
  selector: 'app-docs',
  imports: [MarkdownComponent, MermaidDirective],
  template: \`<shikidown mermaid [content]="markdown" />\`,
})
export class DocsComponent {
  readonly markdown = '...';
}
\`\`\`

> Sans la directive, les blocs \`mermaid\` restent affichés en code brut.
> \`mermaid\` n'est chargée (\`import('mermaid')\`) que lorsque la directive est réellement utilisée.

Syntaxe dans le Markdown :

\`\`\`mermaid
graph TD
  A[Début] --> B{Décision}
  B -- Oui --> C[Continuer]
  B -- Non --> D[Arrêter]
\`\`\`

### Plugin personnalisé

Un plugin est une simple fonction qui reçoit l'instance markdown-it, typée
\`MarkdownItInstance\` — le type exporté par shikidown. Utilisez-le plutôt que l'export
par défaut de markdown-it, qui n'est plus utilisable comme type depuis la v15 :

\`\`\`typescript
import type { MarkdownItInstance } from 'shikidown';

function monPlugin(md: MarkdownItInstance): void {
  md.core.ruler.push('mark', (state) => {
    // transformer les tokens ici
  });
}

provideMarkdown({ plugins: [monPlugin] })
\`\`\`

---

## Composant \`<shikidown>\`

\`\`\`html
<shikidown
  [content]="markdownString"
  class="prose prose-slate dark:prose-invert max-w-none"
/>
\`\`\`

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| \`content\` | \`string\` | Texte Markdown à rendre |
| \`components\` | \`Record<string, Type>\` | Composants supplémentaires locaux à ce composant |

### Passer des composants localement

\`\`\`html
<shikidown
  [content]="markdownString"
  [components]="{ 'local-badge': BadgeComponent }"
/>
\`\`\`

---

## Pipe \`markdown\`

Le pipe retourne un \`Signal<SafeHtml>\` — appelez-le comme une fonction dans le template :

\`\`\`html
<div [innerHTML]="(contenu | markdown)()"></div>
\`\`\`

Ou avec \`@let\` :

\`\`\`html
@let html = (contenu | markdown)();
@if (html) {
  <div [innerHTML]="html"></div>
}
\`\`\`

<demo-pipe></demo-pipe>

> Le pipe ne supporte pas le rendu incrémental. Utilisez \`MarkdownComponent\` pour cette fonctionnalité.

---

## Rendu incrémental

Lorsque \`incrementalRendering: true\`, \`MarkdownComponent\` découpe le document en blocs
racine indépendants (paragraphes, titres, blocs de code…), calcule un hash FNV-1a de
chaque bloc, et n'appelle Shiki que pour les blocs **dont le texte a changé**.

\`\`\`
Frappe clavier → md.parse() → groupement en blocs → hash FNV-1a
                                                         ↓
                                              bloc dans le cache ?
                                             oui → HTML réutilisé
                                             non → Shiki colorie + cache
                                                         ↓
                                    @for (track hash) → Angular préserve
                                    les nœuds DOM des blocs inchangés
\`\`\`

**Ce qui est préservé entre deux frappes :**
- Le HTML Shiki des blocs de code inchangés (pas de re-coloration)
- Les nœuds DOM des blocs inchangés (même référence \`SafeHtml\` → Angular ne réassigne pas \`innerHTML\`)
- L'état interne des Web Components dans les blocs inchangés (compteurs, formulaires…)

Pour vider le cache manuellement (ex. changement de thème Shiki à runtime) :

\`\`\`typescript
import { MarkdownService } from 'shikidown';

readonly md = inject(MarkdownService);

switchTheme(): void {
  this.md.clearCache();
}
\`\`\`

---

## Embedding de composants Angular

Tout composant enregistré via \`provideMarkdown({ components })\` ou \`[components]\` peut
être inséré dans le Markdown avec son sélecteur :

\`\`\`markdown
# Mon document

<demo-counter initial-count="5" label="Compteur"></demo-counter>

<demo-alert type="warning" title="Attention" message="Ceci est important !"></demo-alert>
\`\`\`

**Exemples**

<demo-counter initial-count="5" label="Compteur"></demo-counter>

<demo-alert type="warning" title="Attention" message="Ceci est important !"></demo-alert>

Les composants sont enregistrés comme **Custom Elements** (\`@angular/elements\`) au démarrage
de l'application. L'enregistrement est idempotent — \`customElements.define()\` n'est
jamais appelé deux fois pour le même sélecteur.

### Passage d'attributs

| Attribut HTML     | Input Angular    |
|-------------------|------------------|
| \`initial-count\`  | \`initialCount\`   |
| \`label\`          | \`label\`          |
| \`my-prop\`        | \`myProp\`         |

> Déclarez les inputs numériques avec \`input(0, { transform: numberAttribute })\` pour
> la coercition automatique depuis la chaîne HTML.

---

## API de MarkdownService

\`\`\`typescript
import { MarkdownService } from 'shikidown';

@Injectable()
export class MyService {
  private readonly md = inject(MarkdownService);

  async render(markdown: string): Promise<string> {
    return this.md.parseAsync(markdown);
  }

  async renderBlocks(markdown: string): Promise<RenderedBlock[]> {
    return this.md.parseBlocksAsync(markdown);
  }
}
\`\`\`

### Méthodes

| Méthode | Retour | Description |
|---------|--------|-------------|
| \`initialize()\` | \`Promise<void>\` | Force l'init Shiki (appelée auto. par les autres méthodes) |
| \`parseAsync(content)\` | \`Promise<string>\` | Rendu Markdown → HTML complet |
| \`parse(content)\` | \`string\` | Rendu synchrone — exige \`initialize()\` préalable |
| \`parseBlocksAsync(content)\` | \`Promise<RenderedBlock[]>\` | Rendu par blocs avec cache LRU |
| \`clearCache()\` | \`void\` | Vide le cache de blocs (ex. changement de thème) |

---

## Styles

\`shikidown\` n'applique pas de typographie automatiquement.
Ajoutez les classes **Tailwind Typography** sur l'élément hôte :

\`\`\`html
<shikidown
  [content]="md"
  class="prose prose-slate dark:prose-invert max-w-none"
/>
\`\`\`

### Dark mode

\`\`\`css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));

.dark .shiki { background-color: var(--shiki-dark-bg) !important; }
.dark .shiki span {
  color: var(--shiki-dark) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
\`\`\`

> **Pourquoi seulement le dark ?** Avec le dual-theme Shiki, le thème clair est appliqué en
> \`style="color:#xyz"\` (valeur absolue). Le thème sombre est stocké dans des variables
> \`--shiki-dark-*\`. Il suffit d'activer ces variables en mode sombre — ne jamais surcharger le mode clair.

---

## Types exportés

\`\`\`typescript
import type {
  MarkdownConfig,      // Options de provideMarkdown()
  MarkdownThemePair,   // { dark: string; light: string }
  ParsedBlock,         // Bloc markdown-it avec hash, tokens et source
  RenderedBlock,       // { hash: string; html: string }
} from 'shikidown';
\`\`\`
`,

  en: `
# shikidown — Library Guide

## Installation

\`\`\`bash
npm install shikidown shiki markdown-it @angular/elements
npm install --save-dev @types/markdown-it   # markdown-it v14 only
\`\`\`

\`@angular/elements\` is required: it ships with Angular but \`ng new\` does not add it to your
\`package.json\`. From \`markdown-it\` v15 onwards the types are bundled and
\`@types/markdown-it\` is no longer needed.

With \`shiki\` >= 4.4, add \`ESNext.Disposable\` to \`lib\` in your \`tsconfig.json\` — otherwise
the build fails with \`TS2550: Property 'dispose' does not exist on type 'SymbolConstructor'\`.

## Configuration

Call \`provideMarkdown()\` in your \`app.config.ts\`:

\`\`\`typescript
import { provideMarkdown } from 'shikidown';
import { AlertComponent } from './components';

export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown({
      // Single or dark/light Shiki theme
      theme: { dark: 'github-dark', light: 'catppuccin-latte' },
      // Shiki languages to preload (same intellisense as createHighlighter)
      languages: ['typescript', 'javascript', 'html', 'css', 'bash'],
      // Angular components available in Markdown (registered as Custom Elements)
      components: {
        'my-alert': AlertComponent,
      },
      // Incremental rendering: only changed blocks are re-parsed (default: false)
      incrementalRendering: true,
      // Max block cache size (default: 256)
      blockCacheSize: 128,
    }),
  ],
};
\`\`\`

### Configuration options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`theme\` | \`string \| { dark, light }\` | \`{ dark: 'github-dark', light: 'poimandres' }\` | Shiki theme(s) |
| \`languages\` | \`string[]\` | 17 common languages | Languages to preload |
| \`components\` | \`Record<string, Type>\` | \`{}\` | Embeddable Angular components |
| \`plugins\` | \`Array<(md) => void>\` | \`[]\` | Additional markdown-it plugins |
| \`markdownOptions\` | \`MarkdownItOptions\` | — | markdown-it options (html, breaks…) |
| \`incrementalRendering\` | \`boolean\` | \`false\` | Block-level rendering with cache |
| \`blockCacheSize\` | \`number\` | \`256\` | LRU block cache capacity |

---

## Plugins

shikidown exposes the full \`markdown-it\` instance to any plugin following the \`(md: MarkdownIt) => void\` signature.
Pass an array of plugins to \`provideMarkdown()\` — they are applied in order, once, just before the first render.

### Installing a plugin

\`\`\`bash
npm install markdown-it-anchor markdown-it-footnote
\`\`\`

\`\`\`typescript
import { provideMarkdown } from 'shikidown';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from 'markdown-it-footnote';

provideMarkdown({
  plugins: [markdownItAnchor, markdownItFootnote],
})
\`\`\`

### Popular plugins

| Feature | Package |
|---------|---------|
| Heading anchors | [\`markdown-it-anchor\`](https://www.npmjs.com/package/markdown-it-anchor) |
| Footnotes | [\`markdown-it-footnote\`](https://www.npmjs.com/package/markdown-it-footnote) |
| Task lists | [\`markdown-it-task-lists\`](https://www.npmjs.com/package/markdown-it-task-lists) |
| LaTeX via KaTeX | [\`@vscode/markdown-it-katex\`](https://www.npmjs.com/package/@vscode/markdown-it-katex) |
| Mermaid diagrams | [\`mermaid\`](https://www.npmjs.com/package/mermaid) — built-in support (see below) |
| Highlighted text \`==…==\` | [\`markdown-it-mark\`](https://www.npmjs.com/package/markdown-it-mark) |

### KaTeX — LaTeX rendering

\`\`\`bash
npm install @vscode/markdown-it-katex
\`\`\`

KaTeX weighs around 266 kB, so declare it as a lazy loader to keep it out of the
initial bundle on pages without a formula.

\`\`\`typescript
provideMarkdown({
  plugins: [{ load: () => import('@vscode/markdown-it-katex') }],
})
\`\`\`

Add the KaTeX stylesheet to the \`styles\` array of your \`angular.json\` — the version
is then pinned by your lockfile, with no external network dependency:

\`\`\`json
"styles": ["node_modules/katex/dist/katex.min.css", "src/styles.css"]
\`\`\`

The plugin ships as CommonJS, so the build reports \`Module '@vscode/markdown-it-katex'
[...] is not ESM\`. No maintained ESM alternative exists, so acknowledge it in your
build options.

\`\`\`json
"allowedCommonJsDependencies": ["@vscode/markdown-it-katex", "katex"]
\`\`\`

Markdown syntax — inline with \`$...$\` or block with \`$$...$$\`:

**Inline:** $E = mc^2$ — mass-energy equivalence

**Block:**

$$
\\int_{-\\infty}^{+\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

$$
a^2 + b^2 = c^2
$$

### Mermaid — diagrams

shikidown natively handles \`\`\`mermaid\`\`\` blocks — no plugin required.
It emits a \`<pre class="mermaid" data-mermaid-src="...">\` that the \`mermaid\` directive activates client-side.

\`mermaid\` is an *optional peer dependency*: install it only if you use diagrams.

\`\`\`bash
npm install mermaid
\`\`\`

To optimize rendering, **use the \`mermaid\` directive** shipped with shikidown: place it directly on the \`<shikidown>\` element.
Instead of re-running \`mermaid.run()\` on every render cycle, it is event-driven (it watches for newly inserted diagrams and theme changes) and scoped to its host. Dark/light theme is detected automatically via the \`.dark\` class on \`<html>\`:

\`\`\`typescript
import { MarkdownComponent } from 'shikidown';
import { MermaidDirective } from 'shikidown/mermaid';

@Component({
  selector: 'app-docs',
  imports: [MarkdownComponent, MermaidDirective],
  template: \`<shikidown mermaid [content]="markdown" />\`,
})
export class DocsComponent {
  readonly markdown = '...';
}
\`\`\`

> Without the directive, \`mermaid\` blocks stay rendered as raw code.
> \`mermaid\` is only loaded (\`import('mermaid')\`) when the directive is actually used.

Markdown syntax:

\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -- Yes --> C[Continue]
  B -- No  --> D[Stop]
\`\`\`

### Custom plugin

A plugin is any function that receives the markdown-it instance, typed as
\`MarkdownItInstance\` — the type shikidown exports. Prefer it over markdown-it's
default export, which stopped working in type position in v15:

\`\`\`typescript
import type { MarkdownItInstance } from 'shikidown';

function myPlugin(md: MarkdownItInstance): void {
  md.core.ruler.push('mark', (state) => {
    // transform tokens here
  });
}

provideMarkdown({ plugins: [myPlugin] })
\`\`\`

---

## \`<shikidown>\` Component

\`\`\`html
<shikidown
  [content]="markdownString"
  class="prose prose-slate dark:prose-invert max-w-none"
/>
\`\`\`

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| \`content\` | \`string\` | Markdown text to render |
| \`components\` | \`Record<string, Type>\` | Additional components local to this instance |

### Passing components locally

\`\`\`html
<shikidown
  [content]="markdownString"
  [components]="{ 'local-badge': BadgeComponent }"
/>
\`\`\`

---

## \`markdown\` Pipe

The pipe returns a \`Signal<SafeHtml>\` — call it as a function in the template:

\`\`\`html
<div [innerHTML]="(content | markdown)()"></div>
\`\`\`

Or with \`@let\`:

\`\`\`html
@let html = (content | markdown)();
@if (html) {
  <div [innerHTML]="html"></div>
}
\`\`\`

<demo-pipe></demo-pipe>

> The pipe does not support incremental rendering. Use \`MarkdownComponent\` for that feature.

---

## Incremental Rendering

When \`incrementalRendering: true\`, \`MarkdownComponent\` splits the document into independent
root blocks (paragraphs, headings, code blocks…), computes an FNV-1a hash for each block,
and only calls Shiki for **blocks whose text has changed**.

\`\`\`
Keystroke → md.parse() → block grouping → FNV-1a hash
                                               ↓
                                    block in cache?
                                    yes → HTML reused
                                    no  → Shiki highlights + caches
                                               ↓
                             @for (track hash) → Angular preserves
                             DOM nodes of unchanged blocks
\`\`\`

**What is preserved between keystrokes:**
- Shiki HTML for unchanged code blocks (no re-highlighting)
- DOM nodes for unchanged blocks (same \`SafeHtml\` reference → Angular skips \`innerHTML\` reassignment)
- Internal state of Web Components in unchanged blocks (counters, forms…)

To manually clear the cache (e.g. runtime Shiki theme change):

\`\`\`typescript
import { MarkdownService } from 'shikidown';

readonly md = inject(MarkdownService);

switchTheme(): void {
  this.md.clearCache();
}
\`\`\`

---

## Embedding Angular Components

Any component registered via \`provideMarkdown({ components })\` or \`[components]\` can be
inserted in Markdown using its selector:

\`\`\`markdown
# My document

<demo-counter initial-count="5" label="Counter"></demo-counter>

<demo-alert type="warning" title="Warning" message="This is important!"></demo-alert>
\`\`\`

**Examples**

<demo-counter initial-count="5" label="Counter"></demo-counter>

<demo-alert type="warning" title="Warning" message="This is important!"></demo-alert>

Components are registered as **Custom Elements** (\`@angular/elements\`) at application startup.
Registration is idempotent — \`customElements.define()\` is never called twice for the same selector.

### Attribute passing

| HTML attribute    | Angular input    |
|-------------------|------------------|
| \`initial-count\`  | \`initialCount\`   |
| \`label\`          | \`label\`          |
| \`my-prop\`        | \`myProp\`         |

> Declare numeric inputs with \`input(0, { transform: numberAttribute })\` for automatic coercion from the HTML string.

---

## MarkdownService API

\`\`\`typescript
import { MarkdownService } from 'shikidown';

@Injectable()
export class MyService {
  private readonly md = inject(MarkdownService);

  async render(markdown: string): Promise<string> {
    return this.md.parseAsync(markdown);
  }

  async renderBlocks(markdown: string): Promise<RenderedBlock[]> {
    return this.md.parseBlocksAsync(markdown);
  }
}
\`\`\`

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| \`initialize()\` | \`Promise<void>\` | Force Shiki init (called automatically by other methods) |
| \`parseAsync(content)\` | \`Promise<string>\` | Render Markdown → full HTML |
| \`parse(content)\` | \`string\` | Synchronous render — requires prior \`initialize()\` |
| \`parseBlocksAsync(content)\` | \`Promise<RenderedBlock[]>\` | Block-level render with LRU cache |
| \`clearCache()\` | \`void\` | Clear the block cache (e.g. theme change) |

---

## Styles

\`shikidown\` does not apply typography styles automatically.
Add **Tailwind Typography** classes to the host element:

\`\`\`html
<shikidown
  [content]="md"
  class="prose prose-slate dark:prose-invert max-w-none"
/>
\`\`\`

### Dark mode

\`\`\`css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));

.dark .shiki { background-color: var(--shiki-dark-bg) !important; }
.dark .shiki span {
  color: var(--shiki-dark) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
\`\`\`

> **Why only dark?** With Shiki dual-theme (\`themes: { dark, light }\`), the light theme is applied
> directly as \`style="color:#xyz"\` (absolute value). The dark theme is stored in \`--shiki-dark-*\`
> CSS variables. You only need to activate these variables in dark mode — never override the light mode.

---

## Exported types

\`\`\`typescript
import type {
  MarkdownConfig,      // provideMarkdown() options
  MarkdownThemePair,   // { dark: string; light: string }
  ParsedBlock,         // markdown-it block with hash, tokens and source
  RenderedBlock,       // { hash: string; html: string }
} from 'shikidown';
\`\`\`
`,
};

const SECTIONS: Record<'fr' | 'en', { label: string; id: string }[]> = {
  fr: [
    { label: 'Installation', id: 'installation' },
    { label: 'Configuration', id: 'configuration' },
    { label: 'Plugins', id: 'plugins' },
    { label: 'Composant shikidown', id: 'composant' },
    { label: 'Pipe markdown', id: 'pipe' },
    { label: 'Rendu incrémental', id: 'incremental' },
    { label: 'Composants Angular', id: 'embedding' },
    { label: 'MarkdownService API', id: 'api' },
    { label: 'Styles', id: 'styles' },
    { label: 'Types exportés', id: 'types' },
  ],
  en: [
    { label: 'Installation', id: 'installation' },
    { label: 'Configuration', id: 'configuration' },
    { label: 'Plugins', id: 'plugins' },
    { label: 'shikidown Component', id: 'composant' },
    { label: 'markdown Pipe', id: 'pipe' },
    { label: 'Incremental Rendering', id: 'incremental' },
    { label: 'Embedding Angular', id: 'embedding' },
    { label: 'MarkdownService API', id: 'api' },
    { label: 'Styles', id: 'styles' },
    { label: 'Exported types', id: 'types' },
  ],
};

const SECTION_IDS: Record<'fr' | 'en', string[]> = {
  fr: ['installation', 'configuration', 'plugins', 'composant', 'pipe', 'incremental', 'embedding', 'api', 'styles', 'types'],
  en: ['installation', 'configuration', 'plugins', 'composant', 'pipe', 'incremental', 'embedding', 'api', 'styles', 'types'],
};

function withAnchors(content: string, ids: string[]): string {
  let i = 0;
  return content.replace(/\n## /g, () => `\n<span id="${ids[i]}" data-section="${ids[i++]}"></span>\n\n## `);
}

@Component({
  selector: 'app-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent, MermaidDirective, RouterLink],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-12 flex gap-8 items-start">

      <!-- Sidebar -->
      <nav
        class="hidden lg:block w-52 shrink-0 sticky top-20"
        [attr.aria-label]="lang() === 'fr' ? 'Navigation du guide' : 'Guide navigation'"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-3">
          {{ lang() === 'fr' ? 'Sur cette page' : 'On this page' }}
        </p>
        <ul class="space-y-0.5" role="list">
          @for (section of sections(); track section.id) {
            <li>
              <a
                [routerLink]="[]"
                [fragment]="section.id"
                [class]="activeSection() === section.id ? activeClass : inactiveClass"
                (click)="activeSection.set(section.id)"
              >{{ section.label }}</a>
            </li>
          }
        </ul>
      </nav>

      <!-- Content -->
      <main class="flex-1 min-w-0">
        <shikidown
          mermaid
          [content]="guideMd()"
          class="prose prose-slate dark:prose-invert max-w-none
                 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-gray-200 dark:prose-h2:border-gray-800 prose-h2:pb-2"
        />
      </main>

    </div>
  `,
})
export class GuideComponent {
  private readonly langService = inject(LanguageService);
  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.langService.lang;
  readonly sections = computed(() => SECTIONS[this.lang()]);
  readonly activeSection = signal('installation');
  readonly guideMd = computed(() => withAnchors(GUIDE_MD[this.lang()], SECTION_IDS[this.lang()]));

  readonly activeClass = 'block px-3 py-1.5 text-sm rounded-md font-medium transition-colors text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20';
  readonly inactiveClass = 'block px-3 py-1.5 text-sm rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800';

  constructor() {
    const win = this.doc.defaultView;
    if (win?.location.hash) {
      const hash = win.location.hash.slice(1);
      if (SECTION_IDS.fr.includes(hash)) this.activeSection.set(hash);
    }

    afterNextRender(() => {
      const win = this.doc.defaultView;
      if (!win) return;

      const handler = () => {
        const spans = Array.from(this.doc.querySelectorAll<HTMLElement>('span[data-section]'));
        if (!spans.length) return;

        const atBottom = win.scrollY + win.innerHeight >= this.doc.body.scrollHeight - 10;
        if (atBottom) {
          this.activeSection.set(spans[spans.length - 1].dataset['section'] ?? '');
          return;
        }

        let active = spans[0].dataset['section'] ?? '';
        for (const span of spans) {
          if (span.getBoundingClientRect().top <= 96) {
            active = span.dataset['section'] ?? '';
          }
        }
        this.activeSection.set(active);
      };

      win.addEventListener('scroll', handler, { passive: true });
      this.destroyRef.onDestroy(() => win.removeEventListener('scroll', handler));
    });
  }
}
