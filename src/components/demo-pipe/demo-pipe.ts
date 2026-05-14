import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MarkdownPipe } from 'shikidown';

const INITIAL = `## Signal-based rendering

The \`markdown\` pipe returns a **Signal** — no \`async\` pipe needed.

- Resolves asynchronously
- Triggers fine-grained change detection

\`\`\`typescript
[innerHTML]="(content | markdown)()"
\`\`\`
`;

@Component({
  selector: 'demo-pipe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownPipe],
  template: `
    <div class="not-prose grid grid-cols-2 gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 my-4">
      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Input</p>
        <textarea
          class="min-h-44 resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 font-mono text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          [value]="content()"
          (input)="onInput($event)"
          aria-label="Markdown input"
          spellcheck="false"
        ></textarea>
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rendered</p>
        <div
          class="prose prose-slate dark:prose-invert prose-sm max-w-none min-h-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 overflow-auto"
          [innerHTML]="(content() | markdown)()"
        ></div>
      </div>
    </div>
  `,
})
export class DemoPipeComponent {
  protected readonly content = signal(INITIAL);

  protected onInput(event: Event): void {
    this.content.set((event.target as HTMLTextAreaElement).value);
  }
}
