import Link from 'next/link';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { appName, demoUrl, npmUrl } from '@/lib/shared';

const quickStart = `import { provideMarkdown, MarkdownComponent } from 'shikidown';

export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown({
      theme: { dark: 'github-dark', light: 'catppuccin-latte' },
      components: { 'my-counter': CounterComponent },
      incrementalRendering: true,
    }),
  ],
};

@Component({
  imports: [MarkdownComponent],
  template: \`<shikidown [content]="md" class="prose dark:prose-invert" />\`,
})
export class DocsPage {
  readonly md = '# Hello\\n\\n<my-counter initial-count="5"></my-counter>';
}`;

const features = [
  {
    title: 'Shiki v4 highlighting',
    body: 'IDE-quality syntax colours, with a dark and a light theme rendered at once and switched through CSS variables — no re-highlighting when the user toggles the theme.',
  },
  {
    title: 'Angular components in Markdown',
    body: 'Register a component and drop its selector straight into the document. Under the hood each one becomes a standard Custom Element through @angular/elements.',
  },
  {
    title: 'Incremental block rendering',
    body: 'Only the blocks whose source text changed are re-parsed. Unchanged DOM nodes are kept, so embedded component state survives every keystroke.',
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center">
        <p className="rounded-full border border-fd-border px-3 py-1 text-xs font-medium text-fd-muted-foreground">
          Angular 22 · Shiki v4 · markdown-it 14
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{appName}</h1>

        <p className="max-w-2xl text-lg text-fd-muted-foreground">
          An Angular Markdown renderer with Shiki syntax highlighting, Angular components embedded
          by selector, and incremental block rendering.
        </p>

        <code className="rounded-lg border border-fd-border bg-fd-card px-4 py-2 text-sm">
          npm install shikidown shiki markdown-it
        </code>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs"
            className="rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
          <a
            href={demoUrl}
            className="rounded-lg border border-fd-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
          >
            Live demo
          </a>
          <a
            href={npmUrl}
            rel="noreferrer noopener"
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            View on npm
          </a>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 pb-20 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-fd-border bg-fd-card p-5">
            <h2 className="mb-2 font-semibold">{feature.title}</h2>
            <p className="text-sm text-fd-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-24">
        <h2 className="mb-4 text-center text-sm font-medium text-fd-muted-foreground">
          The whole setup, in one file
        </h2>
        <DynamicCodeBlock lang="ts" code={quickStart} />
      </section>
    </main>
  );
}
