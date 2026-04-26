import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarkdownComponent } from 'ngx-md';

const GUIDE_MD = `
# Guide de la librairie ngx-md

## Installation

\`\`\`bash
npm install ngx-md
\`\`\`

## Configuration

Appelez \`provideMarkdown()\` dans votre \`app.config.ts\` :

\`\`\`typescript
import { provideMarkdown } from 'ngx-md';
import { AlertComponent } from './components';

export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown({
      // Thème Shiki simple ou dark/light
      theme: { dark: 'github-dark', light: 'github-light' },
      // Langages Shiki à précharger (optionnel)
      languages: ['typescript', 'javascript', 'html', 'css', 'bash'],
      // Composants Angular disponibles dans le Markdown
      components: {
        'demo-alert': AlertComponent,
      },
    }),
  ],
};
\`\`\`

## Utilisation du composant

\`\`\`html
<!-- Template -->
<ngx-md
  [content]="markdownString"
  class="prose prose-slate dark:prose-invert max-w-none"
/>
\`\`\`

### Passer des composants localement

\`\`\`html
<ngx-md
  [content]="markdownString"
  [components]="{ 'mon-composant': MonComposant }"
/>
\`\`\`

## Utilisation du pipe

Le pipe \`markdown\` retourne un \`Observable<SafeHtml>\` — utilisez-le avec le pipe \`async\` d'Angular :

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

## Embedding de composants Angular

Tout composant Angular enregistré via \`provideMarkdown({ components })\` peut être inséré
dans le Markdown avec son sélecteur CSS :

\`\`\`markdown
# Mon document

Voici un composant interactif :

<demo-counter initial-count="5" label="Compteur"></demo-counter>

Et une alerte :

<demo-alert type="warning" title="Attention" message="Ceci est important !"></demo-alert>
\`\`\`

### Passage d'attributs

Les attributs HTML sont passés comme inputs du composant.
Le kebab-case est automatiquement converti en camelCase :

| Attribut HTML    | Input Angular   |
|------------------|-----------------|
| \`initial-count\` | \`initialCount\`  |
| \`label\`         | \`label\`         |
| \`my-prop\`       | \`myProp\`        |

> Les composants doivent déclarer leurs inputs avec \`input()\` et gérer la coercition de type eux-mêmes
> (ex : \`numberAttribute\` pour les nombres).

## API de MarkdownService

\`\`\`typescript
import { MarkdownService } from 'ngx-md';

@Injectable()
export class MyService {
  private readonly md = inject(MarkdownService);

  async renderContent(markdown: string): Promise<string> {
    return this.md.parseAsync(markdown);
  }
}
\`\`\`

### Méthodes

| Méthode | Description |
|---------|-------------|
| \`parseAsync(content)\` | Parse le Markdown et retourne du HTML (Promise) |
| \`parse(content)\` | Parse synchrone — nécessite que le service soit initialisé |
| \`initialize()\` | Force l'initialisation de Shiki (appelée auto. par parseAsync) |

## Markdown-it : Fonctionnalités supportées

\`\`\`markdown
# Heading 1
## Heading 2
### Heading 3

**Gras**, *Italique*, ~~Barré~~, \`code inline\`

- Liste non-ordonnée
  - Imbriquée

1. Liste ordonnée

> Blockquote

| Col A | Col B |
|-------|-------|
| val 1 | val 2 |

[Lien](https://angular.dev) — https://auto-linkify.com

\`\`\`\`typescript
// Bloc de code avec coloration Shiki
const greeter = (name: string) => \`Hello, \${name}!\`;
\`\`\`\`
\`\`\`

## Styles

Le composant \`ngx-md\` n'applique pas de styles de typographie automatiquement.
Ajoutez les classes **Tailwind Typography** sur l'élément hôte :

\`\`\`html
<ngx-md
  [content]="md"
  class="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold"
/>
\`\`\`

Pour le dark mode, ajoutez la classe \`dark\` sur \`<html>\` et configurez Tailwind :

\`\`\`css
/* styles.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));
\`\`\`
`;

@Component({
  selector: 'app-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  template: `
    <main class="mx-auto max-w-4xl px-4 py-12">
      <ngx-md
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
