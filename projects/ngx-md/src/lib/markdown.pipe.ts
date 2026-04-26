import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { from, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { MarkdownService } from './markdown.service';

/**
 * Transforms a markdown string into safe HTML.
 * Returns an Observable — use with Angular's `async` pipe.
 *
 * @example
 * <div [innerHTML]="content | markdown | async"></div>
 */
@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  private readonly mdService = inject(MarkdownService);
  private readonly sanitizer = inject(DomSanitizer);

  transform(content: string | null | undefined): Observable<SafeHtml> {
    if (!content) return of(this.sanitizer.bypassSecurityTrustHtml(''));
    return from(this.mdService.parseAsync(content)).pipe(
      map((html) => this.sanitizer.bypassSecurityTrustHtml(html)),
    );
  }
}
