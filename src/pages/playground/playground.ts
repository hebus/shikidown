import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'shikidown';

const INITIAL_CONTENT = `# Playground shikidown 🎮

Éditez ce Markdown et voyez le rendu en temps réel !

## Fonctionnalités Markdown

**Gras**, *Italique*, ~~Barré~~, \`code inline\`

> Une citation avec du **contenu riche**.

- Élément 1
- Élément 2
  - Sous-élément
  - Sous-élément

1. Premier
2. Deuxième
3. Troisième

## Code avec Shiki

\`\`\`typescript
// Composant Angular 21 moderne
@Component({
  selector: 'mon-comp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<h1>{{ titre() }}</h1>\`,
})
export class MonComposant {
  readonly titre = input.required<string>();
  readonly count = signal(0);
  readonly double = computed(() => this.count() * 2);
}
\`\`\`

\`\`\`bash
npm install shikidown
ng build shikidown
\`\`\`

## Composants Angular embarqués

<demo-counter initial-count="0" label="Cliquez !"></demo-counter>

<demo-alert type="info" title="Astuce" message="Vous pouvez modifier le Markdown à gauche pour voir le rendu changer instantanément !"></demo-alert>

<demo-badge label="Angular 21" color="red"></demo-badge>
<demo-badge label="Shiki v4" color="purple"></demo-badge>
<demo-badge label="TailwindCSS v4" color="teal"></demo-badge>

## Tableau

| Librairie       | Version | Rôle                          |
|-----------------|---------|-------------------------------|
| \`shikidown\`      | 1.0     | Librairie Angular de rendu    |
| \`markdown-it\` | 14.x    | Parser Markdown               |
| \`shiki\`       | 4.x     | Syntax highlighting           |
| \`tailwindcss\` | 4.x     | Styles utilitaires            |

---

Créé avec ❤️ par **shikidown**
`;

interface Sample {
  label: string;
  content: string;
}

const SAMPLES: Sample[] = [
  { label: 'Démo complète', content: INITIAL_CONTENT },
  {
    label: 'Code uniquement',
    content: `# Exemples de code

\`\`\`typescript
const add = (a: number, b: number): number => a + b;
console.log(add(2, 3)); // 5
\`\`\`

\`\`\`html
<shikidown [content]="md" class="prose dark:prose-invert" />
\`\`\`

\`\`\`css
.prose pre { background: transparent; }
\`\`\`

\`\`\`json
{ "name": "shikidown", "version": "1.0.0" }
\`\`\``,
  },
  {
    label: 'Composants seulement',
    content: `# Composants Angular

<demo-counter initial-count="5" label="Compteur A"></demo-counter>
<demo-counter initial-count="0" label="Compteur B"></demo-counter>

<demo-alert type="success" title="Bravo !" message="Les composants fonctionnent dans le Markdown !"></demo-alert>
<demo-alert type="warning" title="Note" message="Chaque instance a son propre état."></demo-alert>

<demo-badge label="Angular" color="red"></demo-badge>
<demo-badge label="Signals" color="blue"></demo-badge>
<demo-badge label="OnPush" color="green"></demo-badge>`,
  },
];

@Component({
  selector: 'app-playground',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MarkdownComponent],
  template: `
    <div class="flex flex-col h-[calc(100vh-3.5rem)]">

      <!-- Toolbar -->
      <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 flex-wrap">
        <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Exemples :</span>
        @for (sample of samples; track sample.label) {
          <button
            (click)="loadSample(sample)"
            class="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >{{ sample.label }}</button>
        }
        <div class="ml-auto flex items-center gap-2">
          <span class="text-xs text-gray-400 dark:text-gray-600 tabular-nums">{{ charCount() }} car.</span>
          <button
            (click)="clearContent()"
            class="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors"
          >Effacer</button>
        </div>
      </div>

      <!-- Editor + Preview -->
      <div class="flex flex-1 overflow-hidden">

        <!-- Editor -->
        <div class="flex flex-col w-1/2 border-r border-gray-200 dark:border-gray-800">
          <div class="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
            ÉDITEUR MARKDOWN
          </div>
          <textarea
            class="flex-1 w-full resize-none p-4 font-mono text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-950 focus:outline-none leading-relaxed"
            [ngModel]="content()"
            (ngModelChange)="content.set($event)"
            spellcheck="false"
            autocomplete="off"
            placeholder="Écrivez votre Markdown ici..."
          ></textarea>
        </div>

        <!-- Preview -->
        <div class="flex flex-col w-1/2 overflow-auto">
          <div class="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
            APERÇU
          </div>
          <div class="flex-1 p-6 overflow-auto">
            <shikidown
              [content]="content()"

              class="prose prose-slate dark:prose-invert max-w-none"
            />
          </div>
        </div>

      </div>
    </div>
  `,
})
export class PlaygroundComponent {
  readonly content = signal(INITIAL_CONTENT);
  readonly charCount = () => this.content().length;
  readonly samples = SAMPLES;

  loadSample(sample: Sample): void {
    this.content.set(sample.content);
  }

  clearContent(): void {
    this.content.set('');
  }
}
