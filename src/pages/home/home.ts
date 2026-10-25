import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarkdownComponent } from 'shikidown';
import { MermaidDirective } from 'shikidown/mermaid';
import { LanguageService } from '../../services/language.service';
import { VERSIONS } from '../../app/app-version';
import { siteLinks } from '../../app/site-links';
import { simulateStream } from '../../app/stream-simulator';
import { STREAM_SAMPLE } from './stream-sample';

const HERO_MD: Record<'fr' | 'en', string> = {
  fr: `
# Markdown enrichi de composants Angular

**shikidown** transforme vos fichiers Markdown en expériences interactives.
Associez la puissance de \`markdown-it\`, la beauté de \`shiki\` et la réactivité d'Angular ${VERSIONS.angular}.

\`\`\`typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown({
      theme: { dark: 'github-dark', light: 'github-light' },
      components: { 'mon-composant': MonComposantComponent },
    }),
  ],
};
\`\`\`

Puis dans votre template :

\`\`\`html
<shikidown [content]="markdownContent" />
\`\`\`

Ou depuis une string directement dans le Markdown :

\`\`\`markdown
<mon-composant titre="Bonjour !" couleur="blue"></mon-composant>
\`\`\`
`,
  en: `
# Markdown enriched with Angular components

**shikidown** turns your Markdown files into interactive experiences.
Combine the power of \`markdown-it\`, the beauty of \`shiki\`, and the reactivity of Angular ${VERSIONS.angular}.

\`\`\`typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown({
      theme: { dark: 'github-dark', light: 'github-light' },
      components: { 'my-component': MyComponent },
    }),
  ],
};
\`\`\`

Then in your template:

\`\`\`html
<shikidown [content]="markdownContent" />
\`\`\`

Or directly in Markdown:

\`\`\`markdown
<my-component title="Hello!" color="blue"></my-component>
\`\`\`
`,
};

const MERMAID_MD: Record<'fr' | 'en', string> = {
  fr: `
## Diagrammes Mermaid

Écrivez un bloc **mermaid** dans votre Markdown :
\`\`\`\`markdown
\`\`\`mermaid
graph TD
  A[provideMarkdown] --> B{Plugin mermaid}
  B -->|oui| C[SVG rendu]
  B -->|non| D[bloc code brut]
  C --> E[✨ Interactif]
\`\`\`
\`\`\`\`

Et shikidown le rend directement en SVG :

\`\`\`mermaid
graph TD
  A[provideMarkdown] --> B{Plugin mermaid}
  B -->|oui| C[SVG rendu]
  B -->|non| D[bloc code brut]
  C --> E[✨ Interactif]
\`\`\`
`,
  en: `
## Mermaid Diagrams

Write a \`\`\`mermaid\`\`\` block in your Markdown:

\`\`\`\`markdown
\`\`\`mermaid
graph TD
  A[provideMarkdown] --> B{Mermaid plugin}
  B -->|yes| C[SVG rendered]
  B -->|no| D[raw code block]
  C --> E[✨ Interactive]
\`\`\`
\`\`\`\`

And shikidown renders it directly as SVG:

\`\`\`mermaid
graph TD
  A[provideMarkdown] --> B{Mermaid plugin}
  B -->|yes| C[SVG rendered]
  B -->|no| D[raw code block]
  C --> E[✨ Interactive]
\`\`\`
`,
};

// Every LaTeX command needs a doubled backslash to survive the template literal:
// `\i` and `\s` are not escape sequences, so JS drops the backslash and KaTeX would
// receive `int` and `sqrt` as plain variables. A LaTeX row break is itself `\\`, so
// inside pmatrix and aligned it takes four.
const KATEX_MD: Record<'fr' | 'en', string> = {
  fr: `
## Formules mathématiques

\`katexPlugin()\`, de l'entry point \`shikidown/math\`, charge KaTeX à la demande. Les formules s'écrivent en ligne avec
\\$...\\$ — comme $E = mc^2$ — ou en bloc avec \\$\\$...\\$\\$.

Une série convergente :

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

Une matrice et son déterminant :

$$
A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}
\\qquad
\\det A = ad - bc
$$

Un système aligné :

$$
\\begin{aligned}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{aligned}
$$
`,
  en: `
## Mathematical formulas

\`katexPlugin()\`, from the \`shikidown/math\` entry point, loads KaTeX on demand. Formulas go inline with
\\$...\\$ — like $E = mc^2$ — or as a block with \\$\\$...\\$\\$.

A convergent series:

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

A matrix and its determinant:

$$
A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}
\\qquad
\\det A = ad - bc
$$

An aligned system:

$$
\\begin{aligned}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{aligned}
$$
`,
};

const FEATURES_MD: Record<'fr' | 'en', string> = {
  fr: `
## Fonctionnalités

| Feature | Détail |
|---------|--------|
| \`markdown-it\` | Parsing complet CommonMark + extensions |
| \`shiki\` v4 | Syntax highlighting multi-thème dark/light |
| Angular Components | Embedding via Custom Elements (\`@angular/elements\`) |
| Streaming LLM | Fin du document réparée, seul le dernier bloc recalculé, état des composants conservé |
| Sécurité | HTML brut filtré par liste blanche, protocoles d'URL contrôlés |
| Plugins | Système natif de plugins \`markdown-it\` ; KaTeX via \`shikidown/math\`, Mermaid via \`shikidown/mermaid\` |
| Signals | API 100% réactive avec \`resource()\` |
| TailwindCSS v4 | Styling moderne et dark mode |
| Pipe async | \`content \| markdown \| async\` |

\`\`\`typescript
// Composant embeddable minimal
@Component({
  selector: 'mon-composant',
  template: \`<div>{{ titre() }}</div>\`,
})
export class MonComposantComponent {
  readonly titre = input<string>('');
}
\`\`\`
`,
  en: `
## Features

| Feature | Detail |
|---------|--------|
| \`markdown-it\` | Full CommonMark parsing + extensions |
| \`shiki\` v4 | Multi-theme dark/light syntax highlighting |
| Angular Components | Embedding via Custom Elements (\`@angular/elements\`) |
| LLM streaming | Repaired document end, only the last block recomputed, component state kept |
| Security | Raw HTML filtered against an allow-list, URL protocols checked |
| Plugins | Native \`markdown-it\` plugin system; KaTeX via \`shikidown/math\`, Mermaid via \`shikidown/mermaid\` |
| Signals | 100% reactive API with \`resource()\` |
| TailwindCSS v4 | Modern styling and dark mode |
| Async pipe | \`content \| markdown \| async\` |

\`\`\`typescript
// Minimal embeddable component
@Component({
  selector: 'my-component',
  template: \`<div>{{ title() }}</div>\`,
})
export class MyComponent {
  readonly title = input<string>('');
}
\`\`\`
`,
};

const FEATURES_CARDS: Record<'fr' | 'en', Array<{ icon: string; title: string; desc: string }>> = {
  fr: [
    { icon: '🎨', title: 'Shiki v4 Highlighting', desc: 'Coloration syntaxique de qualité IDE avec support dark/light automatique via CSS variables.' },
    { icon: '⚡', title: 'Composants Angular', desc: 'Insérez vos composants par sélecteur CSS dans le Markdown. Ils sont instanciés dynamiquement.' },
    { icon: '🔄', title: 'Rendu incrémental', desc: 'Seuls les blocs modifiés sont re-parsés. Les Web Components conservent leur état entre les frappes.' },
    { icon: '🔌', title: 'Plugins markdown-it', desc: 'Étendez le rendu avec n\'importe quel plugin : KaTeX pour LaTeX, Mermaid, footnotes, ancres…' },
    { icon: '💬', title: 'Streaming LLM', desc: 'Affichez une réponse pendant sa génération : syntaxe inachevée réparée, code coloré une fois fermé, rien ne clignote.' },
    { icon: '🛡️', title: 'Sûr par défaut', desc: 'Le HTML brut est filtré et les URL contrôlées : le texte d\'un LLM ne peut pas injecter de script.' },
  ],
  en: [
    { icon: '🎨', title: 'Shiki v4 Highlighting', desc: 'IDE-quality syntax highlighting with automatic dark/light support via CSS variables.' },
    { icon: '⚡', title: 'Angular Components', desc: 'Insert your components by CSS selector in Markdown. They are instantiated dynamically.' },
    { icon: '🔄', title: 'Incremental rendering', desc: 'Only changed blocks are re-parsed. Web Components preserve their state between keystrokes.' },
    { icon: '🔌', title: 'markdown-it Plugins', desc: 'Extend rendering with any plugin: KaTeX for LaTeX, Mermaid, footnotes, heading anchors…' },
    { icon: '💬', title: 'LLM streaming', desc: 'Display an answer while it is generated: unfinished syntax repaired, code highlighted once closed, no flicker.' },
    { icon: '🛡️', title: 'Safe by default', desc: 'Raw HTML is filtered and URLs checked: an LLM\'s output cannot inject a script.' },
  ],
};

const UI: Record<
  'fr' | 'en',
  { start: string; quickstart: string; docs: string; stream: string; streamIntro: string; play: string; stop: string }
> = {
  fr: {
    start: 'Démarrer →',
    quickstart: 'Démarrage rapide',
    docs: 'Documentation',
    stream: 'Streaming LLM',
    streamIntro:
      'La réponse ci-dessous est rejouée par fragments coupés n\'importe où, comme un LLM l\'émettrait. Cliquez sur le compteur pendant le flux : il garde sa valeur.',
    play: 'Rejouer en flux',
    stop: 'Arrêter',
  },
  en: {
    start: 'Get started →',
    quickstart: 'Quick start',
    docs: 'Documentation',
    stream: 'LLM streaming',
    streamIntro:
      'The answer below is replayed in fragments cut anywhere, as an LLM would emit it. Click the counter during the stream: it keeps its value.',
    play: 'Replay as a stream',
    stop: 'Stop',
  },
};

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MarkdownComponent, MermaidDirective],
  template: `
    <main class="mx-auto max-w-4xl px-4 py-12 space-y-16">

      <!-- Hero -->
      <section class="text-center space-y-6">
        <div class="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
          ✨ Angular {{ versions.angular }} · markdown-it {{ versions.markdownIt }} · shiki v{{ versions.shiki }} · TailwindCSS v{{ versions.tailwind }}
        </div>
        <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
          Markdown + Angular<br>
          <span class="text-indigo-600 dark:text-indigo-400">{{ lang() === 'fr' ? 'dans le même rendu' : 'in a single render' }}</span>
        </h1>
        <p class="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          @let text = lang() === 'fr' ? "Une librairie Angular pour rendre du Markdown avec coloration syntaxique Shiki et y insérer n'importe quel composant Angular interactif." : "An Angular library to render Markdown with Shiki syntax highlighting and embed any interactive Angular component.";
          {{ text }}
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <a
            routerLink="/guide"
            class="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors shadow-sm"
          >{{ ui().start }}</a>
          <a
            routerLink="/playground"
            class="rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-5 py-2.5 text-sm font-semibold transition-colors"
          >Playground</a>
          <a
            [href]="links.docs"
            class="rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >{{ ui().docs }} <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <!-- Feature cards -->
      <section class="grid grid-cols-2 gap-4">
        @for (feature of features(); track feature.title) {
          <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-2">
            <div class="text-2xl">{{ feature.icon }}</div>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ feature.title }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ feature.desc }}</p>
          </div>
        }
      </section>

      <!-- Markdown rendered demo -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ ui().quickstart }}</h2>
        <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 overflow-hidden">
          <shikidown [content]="heroMd()" class="prose prose-slate dark:prose-invert max-w-none" />
        </div>
      </section>

      <!-- Streaming demo — lancée par un bouton plutôt qu'automatiquement : un contenu qui
           bouge plus de cinq secondes doit pouvoir être déclenché et arrêté (WCAG 2.2.2) -->
      <section class="space-y-4">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ ui().stream }}</h2>
          <button
            type="button"
            (click)="toggleStream()"
            class="rounded-lg border border-indigo-300 dark:border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
          >{{ streaming() ? ui().stop : ui().play }}</button>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ ui().streamIntro }}</p>
        <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 overflow-hidden">
          <shikidown
            [content]="streamMd()"
            [streaming]="streaming()"
            animation="caret"
            class="prose prose-slate dark:prose-invert max-w-none"
          />
        </div>
      </section>

      <!-- Mermaid demo -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 overflow-hidden">
        <shikidown mermaid [content]="mermaidMd()" class="prose prose-slate dark:prose-invert max-w-none"/>
      </section>

      <!-- KaTeX demo — overflow-x-auto so a wide aligned system scrolls rather than
           stretching the page on a narrow screen -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 overflow-x-auto">
        <shikidown [content]="katexMd()" class="prose prose-slate dark:prose-invert max-w-none" />
      </section>

      <!-- Features table -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 overflow-hidden">
        <shikidown [content]="featuresMd()" class="prose prose-slate dark:prose-invert max-w-none" />
      </section>

    </main>
  `,
})
export class HomeComponent {
  private readonly langService = inject(LanguageService);

  /** Absolute link to the documentation site the demo is published alongside. */
  readonly links = siteLinks();

  readonly versions = VERSIONS;

  readonly lang = this.langService.lang;
  readonly heroMd    = computed(() => HERO_MD[this.lang()]);
  readonly mermaidMd  = computed(() => MERMAID_MD[this.lang()]);
  readonly katexMd    = computed(() => KATEX_MD[this.lang()]);
  readonly featuresMd = computed(() => FEATURES_MD[this.lang()]);
  readonly features  = computed(() => FEATURES_CARDS[this.lang()]);
  readonly ui        = computed(() => UI[this.lang()]);

  readonly streaming = signal(false);
  /** Texte rejoué ; `null` hors flux, la réponse complète est alors affichée. */
  private readonly streamed = signal<string | null>(null);
  readonly streamMd = computed(() => this.streamed() ?? STREAM_SAMPLE[this.lang()]);

  private stopStream: () => void = () => {};

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopStream());
  }

  /** Rejoue la réponse d'exemple comme un flux LLM, ou interrompt le flux en cours. */
  toggleStream(): void {
    this.stopStream();
    if (this.streaming()) {
      this.streaming.set(false);
      this.streamed.set(null);
      return;
    }
    this.streaming.set(true);
    this.stopStream = simulateStream(
      STREAM_SAMPLE[this.lang()],
      (text) => this.streamed.set(text),
      () => {
        this.streaming.set(false);
        this.streamed.set(null);
      },
    );
  }
}
