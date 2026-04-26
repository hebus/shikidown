import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarkdownComponent } from 'shikidown';
import { LanguageService } from '../../services/language.service';

const HERO_MD: Record<'fr' | 'en', string> = {
  fr: `
# Markdown enrichi de composants Angular

**shikidown** transforme vos fichiers Markdown en expériences interactives.
Associez la puissance de \`markdown-it\`, la beauté de \`shiki\` et la réactivité d'Angular 21.

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
Combine the power of \`markdown-it\`, the beauty of \`shiki\`, and the reactivity of Angular 21.

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

const FEATURES_MD: Record<'fr' | 'en', string> = {
  fr: `
## Fonctionnalités

| Feature | Détail |
|---------|--------|
| \`markdown-it\` | Parsing complet CommonMark + extensions |
| \`shiki\` v4 | Syntax highlighting multi-thème dark/light |
| Angular Components | Embedding via Custom Elements (\`@angular/elements\`) |
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
  ],
  en: [
    { icon: '🎨', title: 'Shiki v4 Highlighting', desc: 'IDE-quality syntax highlighting with automatic dark/light support via CSS variables.' },
    { icon: '⚡', title: 'Angular Components', desc: 'Insert your components by CSS selector in Markdown. They are instantiated dynamically.' },
    { icon: '🔄', title: 'Incremental rendering', desc: 'Only changed blocks are re-parsed. Web Components preserve their state between keystrokes.' },
  ],
};

const UI: Record<'fr' | 'en', { start: string; quickstart: string }> = {
  fr: { start: 'Démarrer →', quickstart: 'Démarrage rapide' },
  en: { start: 'Get started →', quickstart: 'Quick start' },
};

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MarkdownComponent],
  template: `
    <main class="mx-auto max-w-4xl px-4 py-12 space-y-16">

      <!-- Hero -->
      <section class="text-center space-y-6">
        <div class="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
          ✨ Angular 21 · markdown-it · shiki v4 · TailwindCSS v4
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
        </div>
      </section>

      <!-- Feature cards -->
      <section class="grid sm:grid-cols-3 gap-4">
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

      <!-- Features table -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 overflow-hidden">
        <shikidown [content]="featuresMd()" class="prose prose-slate dark:prose-invert max-w-none" />
      </section>

    </main>
  `,
})
export class HomeComponent {
  private readonly langService = inject(LanguageService);

  readonly lang = this.langService.lang;
  readonly heroMd    = computed(() => HERO_MD[this.lang()]);
  readonly featuresMd = computed(() => FEATURES_MD[this.lang()]);
  readonly features  = computed(() => FEATURES_CARDS[this.lang()]);
  readonly ui        = computed(() => UI[this.lang()]);
}
