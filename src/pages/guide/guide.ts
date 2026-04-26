import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarkdownComponent } from 'shikidown';

const GUIDE_MD = `
# Guide de la librairie shikidown

## Installation

\`\`\`bash
npm install shikidown
\`\`\`

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
| \`plugins\` | \`Array<(md) => void>\` | \`[]\` | Plugins markdown-it |
| \`markdownOptions\` | \`MarkdownItOptions\` | — | Options markdown-it (html, breaks…) |
| \`incrementalRendering\` | \`boolean\` | \`false\` | Rendu par blocs avec cache |
| \`blockCacheSize\` | \`number\` | \`256\` | Capacité du cache LRU de blocs |

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

Des composants non déclarés dans \`provideMarkdown()\` peuvent être enregistrés directement :

\`\`\`html
<shikidown
  [content]="markdownString"
  [components]="{ 'local-badge': BadgeComponent }"
/>
\`\`\`

---

## Pipe \`markdown\`

Le pipe retourne un \`Observable<SafeHtml>\` — utilisez-le avec le pipe \`async\` :

\`\`\`html
<div [innerHTML]="contenu | markdown | async"></div>
\`\`\`

Ou avec \`@let\` (Angular 18+) :

\`\`\`html
@let html = contenu | markdown | async;
@if (html) {
  <div [innerHTML]="html"></div>
}
\`\`\`

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

Les attributs HTML sont mappés automatiquement vers les inputs Angular.
Le kebab-case est converti en camelCase par le navigateur :

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

  // Rendu complet (asynchrone — attend l'initialisation de Shiki)
  async render(markdown: string): Promise<string> {
    return this.md.parseAsync(markdown);
  }

  // Rendu par blocs (mode incrémental)
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

Configurez Tailwind v4 avec la variante \`dark\` basée sur la classe :

\`\`\`css
/* styles.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));

/* Mode sombre Shiki — le mode clair est géré par les styles inline de Shiki */
.dark .shiki { background-color: var(--shiki-dark-bg) !important; }
.dark .shiki span {
  color: var(--shiki-dark) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
\`\`\`

> **Pourquoi seulement le dark ?** Avec le dual-theme Shiki (\`themes: { dark, light }\`),
> le thème clair est appliqué directement en \`style="color:#xyz"\` (valeur absolue).
> Le thème sombre est stocké dans des variables CSS \`--shiki-dark-*\`. Il suffit donc
> d'activer ces variables en mode sombre — ne jamais surcharger le mode clair.

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
`;

@Component({
  selector: 'app-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  template: `
    <main class="mx-auto max-w-4xl px-4 py-12">
      <shikidown
        [content]="guideMd"
        class="prose prose-slate dark:prose-invert max-w-none
               prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-gray-200 dark:prose-h2:border-gray-800 prose-h2:pb-2"
      />
    </main>
  `,
})
export class GuideComponent {
  readonly guideMd = GUIDE_MD;
}
