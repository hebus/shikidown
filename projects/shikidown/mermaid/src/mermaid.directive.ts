import { DestroyRef, Directive, ElementRef, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/**
 * Rend en SVG les blocs `<pre class="mermaid">` émis par shikidown pour les fences
 * ```` ```mermaid ````.
 *
 * À poser directement sur l'élément `<shikidown>` :
 *
 * ```html
 * <shikidown mermaid [content]="markdown" />
 * ```
 *
 * Plutôt que de relancer `mermaid.run()` à chaque cycle de rendu, la directive est
 * pilotée par événement : elle observe (a) l'arrivée de nouveaux diagrammes dans son
 * hôte et (b) le changement de thème (classe `dark` sur `<html>`). Aucun travail n'est
 * effectué tant que rien ne change, et le rendu est scopé à l'élément hôte.
 *
 * `mermaid` est une *peer dependency optionnelle* : elle n'est chargée dynamiquement
 * (`import('mermaid')`) que lorsque cette directive est réellement utilisée.
 */
@Directive({ selector: '[mermaid]' })
export class MermaidDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    const el = this.host.nativeElement;
    const root = this.doc.documentElement;
    const mermaidReady = import('mermaid').then(({ default: m }) => m);
    let activeTheme = '';
    let scheduled = false;

    const render = () => {
      if (scheduled) return; // coalesce la rafale de mutations émise par mermaid lui-même
      scheduled = true;
      queueMicrotask(async () => {
        scheduled = false;
        const m = await mermaidReady;
        const theme = root.classList.contains('dark') ? 'dark' : 'default';
        if (theme !== activeTheme) {
          // Le thème a changé : ré-initialiser et réarmer les diagrammes déjà rendus.
          activeTheme = theme;
          m.initialize({ startOnLoad: false, securityLevel: 'loose', theme });
          el.querySelectorAll<HTMLElement>('pre.mermaid[data-processed]').forEach((n) => {
            const src = n.dataset['mermaidSrc'];
            if (src) {
              n.textContent = src;
              n.removeAttribute('data-processed');
            }
          });
        }
        const nodes = [...el.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')];
        if (nodes.length) await m.run({ nodes });
      });
    };

    // (a) Nouveaux diagrammes injectés par shikidown (rendu asynchrone / incrémental).
    const contentObs = new MutationObserver(render);
    contentObs.observe(el, { childList: true, subtree: true });

    // (b) Bascule de thème via la classe sur <html>.
    const themeObs = new MutationObserver(render);
    themeObs.observe(root, { attributes: true, attributeFilter: ['class'] });

    render(); // premier passage

    inject(DestroyRef).onDestroy(() => {
      contentObs.disconnect();
      themeObs.disconnect();
    });
  }
}
