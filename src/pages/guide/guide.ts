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
      // HTML brut : 'sanitize' (défaut), 'escape' ou 'trusted'
      htmlPolicy: 'sanitize',
      // Streaming : réparation des syntaxes inachevées, repère visuel
      repair: { math: true },
      animation: 'caret',
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
| \`blockCacheSize\` | \`number\` | \`256\` | Capacité du cache LRU de blocs (et de celui des colorations) |
| \`htmlPolicy\` | \`'sanitize' \\| 'escape' \\| 'trusted'\` | \`'sanitize'\` | Traitement du HTML brut — voir [Sécurité](#/guide#security) |
| \`sanitize\` | \`SanitizeOptions\` | \`{}\` | Liste blanche : protocoles, balises, \`style\`, custom elements |
| \`repair\` | \`boolean \\| RepairOptions\` | \`true\` | Réparation de la fin du document pendant le streaming |
| \`animation\` | \`'none' \\| 'caret' \\| 'fade'\` | \`'none'\` | Repère visuel par défaut du streaming |

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
| LaTeX via KaTeX | \`katexPlugin()\` de \`shikidown/math\` (voir ci-dessous) |
| Diagrammes Mermaid | [\`mermaid\`](https://www.npmjs.com/package/mermaid) — support natif (voir ci-dessous) |
| Texte surligné \`==…==\` | [\`markdown-it-mark\`](https://www.npmjs.com/package/markdown-it-mark) |

### KaTeX — rendu LaTeX

\`\`\`bash
npm install @vscode/markdown-it-katex katex
\`\`\`

L'entry point \`shikidown/math\` fournit \`katexPlugin()\`, qui charge KaTeX (environ 266 Ko) à la
demande : il reste hors du bundle initial des pages sans formule. Il accepte les options du
plugin, et une formule invalide s'affiche en source sans interrompre le document.

\`\`\`typescript
import { katexPlugin } from 'shikidown/math';

provideMarkdown({
  plugins: [katexPlugin()],
  // Pendant un streaming, masque une formule pas encore fermée
  repair: { math: true },
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

Mermaid est initialisé en \`securityLevel: 'strict'\` : le HTML des libellés est encodé et les clics
scriptés sont désactivés. Pour des diagrammes de confiance qui en ont besoin, posez
\`mermaidSecurityLevel="loose"\` sur l'hôte. Un diagramme invalide garde sa source affichée sans
empêcher le rendu des autres, et pendant un streaming un diagramme n'est rendu qu'une fois son
bloc fermé.

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
| \`streaming\` | \`boolean\` | Contenu en cours de génération — voir [Streaming LLM](#/guide#streaming) |
| \`incremental\` | \`boolean \\| undefined\` | Rendu par blocs pour cette instance (défaut : la config, ou \`true\` en streaming) |
| \`animation\` | \`'none' \\| 'caret' \\| 'fade' \\| undefined\` | Repère visuel du streaming |
| \`components\` | \`Record<string, Type>\` | Composants supplémentaires locaux à ce composant |
| \`componentModules\` | \`ComponentModuleSource[]\` | Modules de composants, chargeables à la demande |

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
                                    @for (track id) → bloc inchangé : aucune écriture
                                                      bloc modifié : DOM corrigé en place
\`\`\`

**Ce qui est préservé entre deux frappes :**
- Le HTML Shiki des blocs de code inchangés (pas de re-coloration)
- Les nœuds DOM des blocs inchangés, qui ne sont pas réécrits
- Le bloc modifié garde son élément : son DOM est corrigé en place, pas remplacé
- L'état interne des Web Components, y compris dans le bloc en cours d'édition

Pour vider le cache manuellement (ex. changement de thème Shiki à runtime) :

\`\`\`typescript
import { MarkdownService } from 'shikidown';

readonly md = inject(MarkdownService);

switchTheme(): void {
  this.md.clearCache();
}
\`\`\`

---

## Streaming LLM

Pour afficher une réponse pendant qu'un LLM la génère, passez le texte accumulé à \`[content]\` et
\`[streaming]="true"\` tant que la génération dure :

\`\`\`html
<shikidown [content]="reponse()" [streaming]="enCours()" animation="caret" />
\`\`\`

Pendant le streaming :

- **la fin du document est réparée pour l'affichage**, sans modifier la source : \`**gras en cou\`
  s'affiche en gras, un lien tronqué montre son libellé, une balise ou une image incomplète est
  masquée, une ligne de séparation de tableau en cours est complétée ;
- **seul le dernier bloc est reparsé** ; les blocs déjà affichés gardent leur élément, et les
  composants embarqués leur état — même dans le bloc en cours d'écriture ;
- **un bloc de code ouvert n'est coloré qu'à sa fermeture**, une seule fois ;
- l'hôte porte \`aria-busy="true"\` : les lecteurs d'écran attendent la fin du flux.

Repasser \`streaming\` à \`false\` déclenche le rendu définitif, depuis la source brute. Essayez-le
dans le [Playground](#/playground) avec le bouton « Simuler un flux LLM ».

### Personnaliser le curseur

\`animation="caret"\` affiche un curseur fixe en fin de texte, \`'fade'\` fait apparaître chaque
nouveau bloc en fondu. Les deux sont désactivés par \`prefers-reduced-motion\`. Le curseur se règle
par variables CSS :

\`\`\`css
.chat shikidown {
  --shikidown-caret-content: '●';
  --shikidown-caret-color: #6366f1;
  --shikidown-caret-opacity: 1;
  /* animation fournie ; le curseur ne clignote pas par défaut */
  --shikidown-caret-animation: shikidown-caret-blink 1s steps(1) infinite;
  /* durée du fondu de animation="fade" */
  --shikidown-fade-duration: 250ms;
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

## Sécurité

Un texte produit par un LLM ou saisi par un utilisateur n'est pas fiable. Le HTML brut qu'il
contient est donc **filtré par défaut** (\`htmlPolicy: 'sanitize'\`) :

- conservés : balises de mise en forme et de structure, custom elements avec leurs attributs ;
- retirés : gestionnaires d'événements (\`on*\`), \`style\`, \`<script>\`, \`<iframe>\`, \`<form>\`, \`<svg>\`… ;
- les URL — dans le HTML comme dans les liens Markdown — doivent être relatives ou en \`http\`,
  \`https\`, \`mailto\` ou \`tel\`.

\`\`\`typescript
provideMarkdown({
  sanitize: {
    allowedProtocols: ['https', 'mailto'],
    customElements: ['demo-counter', 'demo-alert'], // au lieu de tous les noms valides
  },
})
\`\`\`

\`htmlPolicy: 'escape'\` affiche le HTML comme du texte ; \`htmlPolicy: 'trusted'\` l'insère tel quel,
comme en 2.x — à réserver à un contenu entièrement maîtrisé par l'application.

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
| \`renderBlocksAsync(content, options)\` | \`Promise<BlockRenderResult>\` | Rendu par blocs d'un flux : repasser \`state\` pour ne reparser que la fin |
| \`getStats()\` / \`resetStats()\` | \`MarkdownStats\` / \`void\` | Compteurs de travail (parsings, rendus, colorations) |
| \`clearCache()\` | \`void\` | Vide les caches de blocs et de coloration |

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
  BlockParseState,     // état à repasser à renderBlocksAsync()
  MarkdownStats,       // compteurs de travail
  HtmlPolicy,          // 'sanitize' | 'escape' | 'trusted'
  SanitizeOptions,     // liste blanche du filtrage
  StreamingAnimation,  // 'none' | 'caret' | 'fade'
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
      // Raw HTML: 'sanitize' (default), 'escape' or 'trusted'
      htmlPolicy: 'sanitize',
      // Streaming: repair of unfinished syntax, visual cue
      repair: { math: true },
      animation: 'caret',
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
| \`blockCacheSize\` | \`number\` | \`256\` | LRU block cache capacity (and highlight cache) |
| \`htmlPolicy\` | \`'sanitize' \\| 'escape' \\| 'trusted'\` | \`'sanitize'\` | Raw HTML handling — see [Security](#/guide#security) |
| \`sanitize\` | \`SanitizeOptions\` | \`{}\` | Allow-list: protocols, tags, \`style\`, custom elements |
| \`repair\` | \`boolean \\| RepairOptions\` | \`true\` | Repair of the document end while streaming |
| \`animation\` | \`'none' \\| 'caret' \\| 'fade'\` | \`'none'\` | Default streaming visual cue |

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
| LaTeX via KaTeX | \`katexPlugin()\` from \`shikidown/math\` (see below) |
| Mermaid diagrams | [\`mermaid\`](https://www.npmjs.com/package/mermaid) — built-in support (see below) |
| Highlighted text \`==…==\` | [\`markdown-it-mark\`](https://www.npmjs.com/package/markdown-it-mark) |

### KaTeX — LaTeX rendering

\`\`\`bash
npm install @vscode/markdown-it-katex katex
\`\`\`

The \`shikidown/math\` entry point provides \`katexPlugin()\`, which loads KaTeX (around 266 kB) on
demand, so it stays out of the initial bundle on pages without a formula. It accepts the plugin's
options, and an invalid formula is shown as source without interrupting the document.

\`\`\`typescript
import { katexPlugin } from 'shikidown/math';

provideMarkdown({
  plugins: [katexPlugin()],
  // While streaming, hides a formula that is not closed yet
  repair: { math: true },
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

Mermaid is initialised with \`securityLevel: 'strict'\`: HTML in labels is encoded and scripted
clicks are disabled. For trusted diagrams that need them, set \`mermaidSecurityLevel="loose"\` on the
host. An invalid diagram keeps its source on screen without blocking the others, and while
streaming a diagram is only rendered once its fence is closed.

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
| \`streaming\` | \`boolean\` | Content still being generated — see [LLM streaming](#/guide#streaming) |
| \`incremental\` | \`boolean \\| undefined\` | Block rendering for this instance (default: the config, or \`true\` while streaming) |
| \`animation\` | \`'none' \\| 'caret' \\| 'fade' \\| undefined\` | Streaming visual cue |
| \`components\` | \`Record<string, Type>\` | Additional components local to this instance |
| \`componentModules\` | \`ComponentModuleSource[]\` | Component modules, loadable on demand |

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
                             @for (track id) → unchanged block: no write
                                               changed block: DOM patched in place
\`\`\`

**What is preserved between keystrokes:**
- Shiki HTML for unchanged code blocks (no re-highlighting)
- DOM nodes for unchanged blocks, which are not rewritten
- The changed block keeps its element: its DOM is patched in place, not replaced
- Internal state of Web Components, including in the block being edited

To manually clear the cache (e.g. runtime Shiki theme change):

\`\`\`typescript
import { MarkdownService } from 'shikidown';

readonly md = inject(MarkdownService);

switchTheme(): void {
  this.md.clearCache();
}
\`\`\`

---

## LLM streaming

To display an answer while an LLM generates it, pass the accumulated text to \`[content]\` and
\`[streaming]="true"\` while generation runs:

\`\`\`html
<shikidown [content]="answer()" [streaming]="generating()" animation="caret" />
\`\`\`

While streaming:

- **the end of the document is repaired for display**, without touching the source: \`**bold in
  progr\` shows as bold, a truncated link shows its label, an incomplete tag or image is hidden, a
  table separator row being typed is completed;
- **only the last block is re-parsed**; blocks already displayed keep their element, and embedded
  components their state — even in the block being written;
- **an open code fence is highlighted once, when it closes**;
- the host carries \`aria-busy="true"\`, so screen readers wait for the end of the stream.

Setting \`streaming\` back to \`false\` triggers the final render, from the raw source. Try it in the
[Playground](#/playground) with the "Simulate an LLM stream" button.

### Customising the caret

\`animation="caret"\` shows a static caret at the end of the text, \`'fade'\` fades each new block in.
Both are disabled by \`prefers-reduced-motion\`. The caret is styled through CSS custom properties:

\`\`\`css
.chat shikidown {
  --shikidown-caret-content: '●';
  --shikidown-caret-color: #6366f1;
  --shikidown-caret-opacity: 1;
  /* provided animation; the caret does not blink by default */
  --shikidown-caret-animation: shikidown-caret-blink 1s steps(1) infinite;
  /* duration of animation="fade" */
  --shikidown-fade-duration: 250ms;
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

## Security

Text produced by an LLM or typed by a user is untrusted. Raw HTML in it is therefore **filtered by
default** (\`htmlPolicy: 'sanitize'\`):

- kept: formatting and structure tags, custom elements with their attributes;
- removed: event handlers (\`on*\`), \`style\`, \`<script>\`, \`<iframe>\`, \`<form>\`, \`<svg>\`…;
- URLs — in raw HTML and in Markdown links — must be relative or use \`http\`, \`https\`, \`mailto\` or
  \`tel\`.

\`\`\`typescript
provideMarkdown({
  sanitize: {
    allowedProtocols: ['https', 'mailto'],
    customElements: ['demo-counter', 'demo-alert'], // instead of every valid name
  },
})
\`\`\`

\`htmlPolicy: 'escape'\` displays the HTML as text; \`htmlPolicy: 'trusted'\` inserts it untouched, as
in 2.x — only for content your application fully controls.

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
| \`renderBlocksAsync(content, options)\` | \`Promise<BlockRenderResult>\` | Block render of a stream: pass back \`state\` to re-parse only the end |
| \`getStats()\` / \`resetStats()\` | \`MarkdownStats\` / \`void\` | Work counters (parses, renders, highlights) |
| \`clearCache()\` | \`void\` | Clear the block and highlight caches |

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
  BlockParseState,     // state passed back to renderBlocksAsync()
  MarkdownStats,       // work counters
  HtmlPolicy,          // 'sanitize' | 'escape' | 'trusted'
  SanitizeOptions,     // sanitize allow-list
  StreamingAnimation,  // 'none' | 'caret' | 'fade'
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
    { label: 'Streaming LLM', id: 'streaming' },
    { label: 'Composants Angular', id: 'embedding' },
    { label: 'Sécurité', id: 'security' },
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
    { label: 'LLM streaming', id: 'streaming' },
    { label: 'Embedding Angular', id: 'embedding' },
    { label: 'Security', id: 'security' },
    { label: 'MarkdownService API', id: 'api' },
    { label: 'Styles', id: 'styles' },
    { label: 'Exported types', id: 'types' },
  ],
};

const SECTION_IDS: Record<'fr' | 'en', string[]> = {
  fr: ['installation', 'configuration', 'plugins', 'composant', 'pipe', 'incremental', 'streaming', 'embedding', 'security', 'api', 'styles', 'types'],
  en: ['installation', 'configuration', 'plugins', 'composant', 'pipe', 'incremental', 'streaming', 'embedding', 'security', 'api', 'styles', 'types'],
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
