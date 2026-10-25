import { Directive, effect, ElementRef, inject, input, PLATFORM_ID, Renderer2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { morphInnerHtml } from './dom-morph';

/**
 * Injecte le HTML d'un bloc dans son élément hôte. Le premier rendu passe par
 * `innerHTML` ; les suivants transforment le DOM en place (voir `morphInnerHtml`)
 * pour que la sélection et les composants embarqués survivent aux fragments.
 *
 * Le HTML a déjà été produit, et filtré selon la politique choisie, par
 * `MarkdownService` : il n'est pas repassé au `DomSanitizer`, qui retirerait les
 * custom elements.
 */
@Directive({ selector: '[shikidownHtml]' })
export class MarkdownHtmlDirective {
  readonly html = input.required<string>({ alias: 'shikidownHtml' });

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const renderer = inject(Renderer2);
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    let rendered: string | null = null;

    effect(() => {
      const html = this.html();
      if (html === rendered) return;
      if (browser && rendered !== null) {
        morphInnerHtml(element, html);
      } else {
        renderer.setProperty(element, 'innerHTML', html);
      }
      rendered = html;
    });
  }
}
