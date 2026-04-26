import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  input,
  PLATFORM_ID,
  resource,
  signal,
  Type,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { SafeHtml } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownService } from './markdown.service';
import { registerAsCustomElement } from './markdown.provider';
import { MARKDOWN_CONFIG } from './markdown.tokens';

/**
 * Composant principal de rendu Markdown.
 *
 * Les composants Angular passés via `[components]` sont enregistrés automatiquement
 * comme Web Components (Custom Elements) afin d'être reconnus par le navigateur
 * lorsqu'ils apparaissent dans le HTML rendu.
 *
 * @example
 * <shikidown [content]="md" class="prose dark:prose-invert max-w-none" />
 */
@Component({
  selector: 'shikidown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (
      (renderResource.isLoading() && renderResource.value() === undefined) ||
      (blockResource.isLoading() && !displayedBlocks().length)
    ) {
      <div class="animate-pulse space-y-3 py-2">
        <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    } @else if (renderResource.error() || blockResource.error()) {
      <div class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">
        <strong>Render error:</strong> {{ renderResource.error() ?? blockResource.error() }}
      </div>
    } @else if (incrementalMode) {
      <div class="shikidown-content">
        @for (block of displayedBlocks(); track block.hash) {
          <div [innerHTML]="block.html"></div>
        }
      </div>
    } @else {
      <div [innerHTML]="renderResource.value()" class="shikidown-content"></div>
    }
  `,
})
export class MarkdownComponent {
  private readonly mdService = inject(MarkdownService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly config = inject(MARKDOWN_CONFIG, { optional: true }) ?? {};

  get incrementalMode(): boolean { return this.config.incrementalRendering ?? false; }

  readonly content = input<string>('');

  /**
   * Composants Angular supplémentaires à rendre dans ce Markdown.
   * Ils sont automatiquement enregistrés comme Custom Elements lors du premier rendu.
   * Les composants déclarés dans `provideMarkdown()` n'ont pas besoin d'être répétés ici.
   */
  readonly components = input<Record<string, Type<unknown>>>({});

  // Stable reference cache: same hash → same SafeHtml object → Angular skips [innerHTML] DOM update
  private readonly safeHtmlCache = new Map<string, SafeHtml>();

  // Holds the last successfully rendered blocks; preserved while blockResource re-loads
  // so the template never flickers and Web Component state is not destroyed between keystrokes
  readonly displayedBlocks = signal<Array<{ hash: string; html: SafeHtml }>>([]);

  readonly renderResource = resource({
    params: () => ({ text: this.incrementalMode ? null : this.content() }),
    loader: async ({ params }) => {
      if (!params.text) return this.sanitizer.bypassSecurityTrustHtml('');
      const html = await this.mdService.parseAsync(params.text);
      return this.sanitizer.bypassSecurityTrustHtml(html);
    },
  });

  readonly blockResource = resource({
    params: () => ({ text: this.incrementalMode ? this.content() : null }),
    loader: async ({ params }): Promise<Array<{ hash: string; html: SafeHtml }>> => {
      if (!params.text) return [];
      const blocks = await this.mdService.parseBlocksAsync(params.text);
      return blocks.map((b) => {
        let safe = this.safeHtmlCache.get(b.hash);
        if (!safe) {
          safe = this.sanitizer.bypassSecurityTrustHtml(b.html);
          this.safeHtmlCache.set(b.hash, safe);
        }
        return { hash: b.hash, html: safe };
      });
    },
  });

  constructor() {
    // Propagate completed block renders to displayedBlocks (skips intermediate loading states)
    effect(() => {
      const blocks = this.blockResource.value();
      if (blocks === undefined) return;
      // Evict SafeHtml entries for blocks no longer in the document
      const current = new Set(blocks.map((b) => b.hash));
      for (const hash of this.safeHtmlCache.keys()) {
        if (!current.has(hash)) this.safeHtmlCache.delete(hash);
      }
      this.displayedBlocks.set(blocks);
    });

    // Register local Web Components (idempotent)
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      for (const [selector, ComponentClass] of Object.entries(this.components())) {
        registerAsCustomElement(selector, ComponentClass, this.injector);
      }
    });
  }
}
