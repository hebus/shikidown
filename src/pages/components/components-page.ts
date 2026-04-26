import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MarkdownComponent } from 'shikidown';
import { LanguageService } from '../../services/language.service';

const COUNTER_MD: Record<'fr' | 'en', string> = {
  fr: `
## Compteur interactif \`<demo-counter>\`

Un composant avec état local — chaque instance est indépendante.

<demo-counter initial-count="0" label="Premier compteur"></demo-counter>
<demo-counter initial-count="10" label="Départ à 10"></demo-counter>
<demo-counter initial-count="100" label="Grandes valeurs"></demo-counter>

\`\`\`html
<!-- Dans votre Markdown -->
<demo-counter initial-count="5" label="Mon compteur"></demo-counter>
\`\`\`

\`\`\`typescript
@Component({ selector: 'demo-counter', ... })
export class DemoCounterComponent {
  readonly initialCount = input(0, { transform: numberAttribute });
  readonly label = input<string>('');
}
\`\`\`
`,
  en: `
## Interactive counter \`<demo-counter>\`

A component with local state — each instance is independent.

<demo-counter initial-count="0" label="First counter"></demo-counter>
<demo-counter initial-count="10" label="Starting at 10"></demo-counter>
<demo-counter initial-count="100" label="Large values"></demo-counter>

\`\`\`html
<!-- In your Markdown -->
<demo-counter initial-count="5" label="My counter"></demo-counter>
\`\`\`

\`\`\`typescript
@Component({ selector: 'demo-counter', ... })
export class DemoCounterComponent {
  readonly initialCount = input(0, { transform: numberAttribute });
  readonly label = input<string>('');
}
\`\`\`
`,
};

const ALERT_MD: Record<'fr' | 'en', string> = {
  fr: `
## Alertes \`<demo-alert>\`

Quatre variantes : \`info\`, \`success\`, \`warning\`, \`danger\`.

<demo-alert type="info" title="Information" message="Utilisez les alertes pour guider l'utilisateur."></demo-alert>
<demo-alert type="success" title="Succès !" message="Opération réalisée avec succès."></demo-alert>
<demo-alert type="warning" title="Attention" message="Vérifiez vos données avant de continuer."></demo-alert>
<demo-alert type="danger" title="Erreur critique" message="Une erreur irrécupérable s'est produite."></demo-alert>

\`\`\`html
<demo-alert type="warning" title="Attention" message="Message..."></demo-alert>
\`\`\`
`,
  en: `
## Alerts \`<demo-alert>\`

Four variants: \`info\`, \`success\`, \`warning\`, \`danger\`.

<demo-alert type="info" title="Information" message="Use alerts to guide the user."></demo-alert>
<demo-alert type="success" title="Success!" message="Operation completed successfully."></demo-alert>
<demo-alert type="warning" title="Warning" message="Please verify your data before proceeding."></demo-alert>
<demo-alert type="danger" title="Critical Error" message="An unrecoverable error has occurred."></demo-alert>

\`\`\`html
<demo-alert type="warning" title="Warning" message="Message..."></demo-alert>
\`\`\`
`,
};

const BADGE_MD: Record<'fr' | 'en', string> = {
  fr: `
## Badges \`<demo-badge>\`

Composants inline pour tags, statuts, catégories.

<demo-badge label="Angular" color="red"></demo-badge>
<demo-badge label="TypeScript" color="blue"></demo-badge>
<demo-badge label="TailwindCSS" color="teal"></demo-badge>
<demo-badge label="Shiki" color="purple"></demo-badge>
<demo-badge label="markdown-it" color="amber"></demo-badge>
<demo-badge label="Stable" color="green" dot="true"></demo-badge>
<demo-badge label="Beta" color="orange" dot="true"></demo-badge>

\`\`\`html
<demo-badge label="Angular" color="red"></demo-badge>
<demo-badge label="Stable" color="green" dot="true"></demo-badge>
\`\`\`
`,
  en: `
## Badges \`<demo-badge>\`

Inline components for tags, statuses, categories.

<demo-badge label="Angular" color="red"></demo-badge>
<demo-badge label="TypeScript" color="blue"></demo-badge>
<demo-badge label="TailwindCSS" color="teal"></demo-badge>
<demo-badge label="Shiki" color="purple"></demo-badge>
<demo-badge label="markdown-it" color="amber"></demo-badge>
<demo-badge label="Stable" color="green" dot="true"></demo-badge>
<demo-badge label="Beta" color="orange" dot="true"></demo-badge>

\`\`\`html
<demo-badge label="Angular" color="red"></demo-badge>
<demo-badge label="Stable" color="green" dot="true"></demo-badge>
\`\`\`
`,
};

const MIXED_MD: Record<'fr' | 'en', string> = {
  fr: `
## Contenu mixte Markdown + Composants

Vous pouvez librement mélanger texte Markdown et composants Angular dans le même document.

### Exemple de release notes

---

#### v1.2.0 — Nouvelles fonctionnalités

<demo-badge label="Nouveau" color="green" dot="true"></demo-badge>
<demo-badge label="Breaking" color="red"></demo-badge>

- Support du **mode sombre** automatique via CSS variables Shiki
- Nouvelle API \`provideMarkdown()\` avec options étendues
- Pipe \`markdown\` refactorisé pour retourner un Observable

<demo-alert type="warning" title="Breaking Change" message="La fonction initMarkdown() est supprimée. Utilisez provideMarkdown() à la place."></demo-alert>

#### Compteur de votes

Votez pour la prochaine feature :

<demo-counter initial-count="42" label="votes SSR"></demo-counter>
<demo-counter initial-count="17" label="votes Zoneless"></demo-counter>

> Les composants conservent leur état indépendamment du rendu Markdown.
`,
  en: `
## Mixed Markdown + Components

You can freely mix Markdown text and Angular components in the same document.

### Release notes example

---

#### v1.2.0 — New features

<demo-badge label="New" color="green" dot="true"></demo-badge>
<demo-badge label="Breaking" color="red"></demo-badge>

- Automatic **dark mode** support via Shiki CSS variables
- New \`provideMarkdown()\` API with extended options
- Refactored \`markdown\` pipe returning an Observable

<demo-alert type="warning" title="Breaking Change" message="The initMarkdown() function has been removed. Use provideMarkdown() instead."></demo-alert>

#### Feature vote counter

Vote for the next feature:

<demo-counter initial-count="42" label="SSR votes"></demo-counter>
<demo-counter initial-count="17" label="Zoneless votes"></demo-counter>

> Components preserve their state independently from Markdown rendering.
`,
};

const PAGE_HEADER: Record<'fr' | 'en', { title: string; desc: string }> = {
  fr: {
    title: 'Composants de démo',
    desc: 'Ces composants Angular sont enregistrés dans la librairie et peuvent être embarqués dans n\'importe quel Markdown.',
  },
  en: {
    title: 'Demo components',
    desc: 'These Angular components are registered in the library and can be embedded in any Markdown document.',
  },
};

@Component({
  selector: 'app-components-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  template: `
    <main class="mx-auto max-w-4xl px-4 py-12 space-y-12">

      <header class="space-y-2">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ header().title }}</h1>
        <p class="text-gray-500 dark:text-gray-400">{{ header().desc }}</p>
      </header>

      @for (section of sections(); track $index) {
        <section class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 overflow-hidden">
          <shikidown
            [content]="section"
            class="prose prose-slate dark:prose-invert max-w-none"
          />
        </section>
      }

    </main>
  `,
})
export class ComponentsPageComponent {
  private readonly langService = inject(LanguageService);

  readonly header  = computed(() => PAGE_HEADER[this.langService.lang()]);
  readonly sections = computed(() => {
    const l = this.langService.lang();
    return [COUNTER_MD[l], ALERT_MD[l], BADGE_MD[l], MIXED_MD[l]];
  });
}
