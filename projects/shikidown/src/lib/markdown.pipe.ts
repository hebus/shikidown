import { inject, Pipe, PipeTransform, Signal, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from './markdown.service';

/**
 * Transforms a markdown string into a `Signal<SafeHtml>`.
 * Starts with empty HTML and resolves asynchronously.
 *
 * @example
 * <div [innerHTML]="(content | markdown)()"></div>
 */
@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  private readonly mdService = inject(MarkdownService);
  private readonly sanitizer = inject(DomSanitizer);

  transform(content: string | null | undefined): Signal<SafeHtml> {
    const empty = this.sanitizer.bypassSecurityTrustHtml('');
    if (!content) return signal(empty);

    const result = signal<SafeHtml>(empty);
    this.mdService.parseAsync(content)
      .then((html) => result.set(this.sanitizer.bypassSecurityTrustHtml(html)))
      .catch((err) => {
        console.error('[shikidown] MarkdownPipe: failed to parse content', err);
        result.set(empty);
      });
    return result;
  }
}
