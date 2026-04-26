import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarkdownComponent } from 'ngx-md';

const COUNTER_MD = `
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
// Déclaration du composant
@Component({ selector: 'demo-counter', ... })
export class DemoCounterComponent {
  readonly initialCount = input(0, { transform: numberAttribute });
  readonly label = input<string>('');
}
\`\`\`
`;

const ALERT_MD = `
## Alertes \`<demo-alert>\`

Quatre variantes : \`info\`, \`success\`, \`warning\`, \`danger\`.

<demo-alert type="info" title="Information" message="Utilisez les alertes pour guider l'utilisateur."></demo-alert>
<demo-alert type="success" title="Succès !" message="Opération réalisée avec succès."></demo-alert>
<demo-alert type="warning" title="Attention" message="Vérifiez vos données avant de continuer."></demo-alert>
<demo-alert type="danger" title="Erreur critique" message="Une erreur irrécupérable s'est produite."></demo-alert>

\`\`\`html
<demo-alert type="warning" title="Attention" message="Message..."></demo-alert>
\`\`\`
`;

const BADGE_MD = `
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
`;

const MIXED_MD = `
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

#### Compteur de features

Votez pour la prochaine feature :

<demo-counter initial-count="42" label="votes SSR"></demo-counter>
<demo-counter initial-count="17" label="votes Zoneless"></demo-counter>

> Les composants conservent leur état indépendamment du rendu Markdown.
`;

@Component({
  selector: 'app-components-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  template: `
    <main class="mx-auto max-w-4xl px-4 py-12 space-y-12">

      <header class="space-y-2">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Composants de démo</h1>
        <p class="text-gray-500 dark:text-gray-400">
          Ces composants Angular sont enregistrés dans la librairie et peuvent être embarqués dans n'importe quel Markdown.
        </p>
      </header>

      @for (section of sections; track section.md) {
        <section class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 overflow-hidden">
          <ngx-md
            [content]="section.md"
  
            class="prose prose-slate dark:prose-invert max-w-none"
          />
        </section>
      }

    </main>
  `,
})
export class ComponentsPageComponent {
  readonly sections = [
    { md: COUNTER_MD },
    { md: ALERT_MD },
    { md: BADGE_MD },
    { md: MIXED_MD },
  ];
}
