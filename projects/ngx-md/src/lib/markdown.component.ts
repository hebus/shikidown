import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  input,
  PLATFORM_ID,
  resource,
  Type,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownService } from './markdown.service';
import { registerAsCustomElement } from './markdown.provider';

/**
 * Composant principal de rendu Markdown.
 *
 * Les composants Angular passés via `[components]` sont enregistrés automatiquement
 * comme Web Components (Custom Elements) afin d'être reconnus par le navigateur
 * lorsqu'ils apparaissent dans le HTML rendu.
 *
 * @example
 * <ngx-md [content]="md" class="prose dark:prose-invert max-w-none" />
 */
@Component({
  selector: 'ngx-md',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (renderResource.isLoading()) {
      <div class="animate-pulse space-y-3 py-2">
        <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    } @else if (renderResource.error()) {
      <div class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">
        <strong>Render error:</strong> {{ renderResource.error() }}
      </div>
    } @else {
      <div [innerHTML]="renderResource.value()" class="ngx-md-content"></div>
    }
  `,
})
export class MarkdownComponent {
  private readonly mdService = inject(MarkdownService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);

  readonly content = input<string>('');

  /**
   * Composants Angular supplémentaires à rendre dans ce Markdown.
   * Ils sont automatiquement enregistrés comme Custom Elements lors du premier rendu.
   * Les composants déclarés dans `provideMarkdown()` n'ont pas besoin d'être répétés ici.
   */
  readonly components = input<Record<string, Type<unknown>>>({});

  readonly renderResource = resource({
    params: () => ({ text: this.content() }),
    loader: async ({ params }) => {
      const html = await this.mdService.parseAsync(params.text);
      return this.sanitizer.bypassSecurityTrustHtml(html);
    },
  });

  constructor() {
    // Enregistre les composants locaux comme Custom Elements dès qu'ils changent.
    // L'enregistrement est idempotent — customElements.define() n'est appelé qu'une fois.
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      for (const [selector, ComponentClass] of Object.entries(this.components())) {
        registerAsCustomElement(selector, ComponentClass, this.injector);
      }
    });
  }
}
