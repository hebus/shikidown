import { DestroyRef, Directive, ElementRef, inject, input, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/** Voir `securityLevel` dans la configuration de Mermaid. */
export type MermaidSecurityLevel = 'strict' | 'antiscript' | 'loose' | 'sandbox';

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
 * Pendant un streaming, shikidown n'émet le bloc `pre.mermaid` qu'une fois le fence
 * fermé : la directive ne tente donc pas de rendre un diagramme incomplet. Un
 * diagramme invalide garde sa source affichée, marquée `data-mermaid-error`.
 *
 * `mermaid` est une *peer dependency optionnelle* : elle n'est chargée dynamiquement
 * (`import('mermaid')`) que lorsque cette directive est réellement utilisée.
 */
@Directive({ selector: '[mermaid]' })
export class MermaidDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);

  /**
   * Niveau de sécurité de Mermaid. `'strict'` encode le HTML des libellés et
   * désactive les clics scriptés ; `'loose'` les autorise, et ne doit être choisi
   * que pour des diagrammes de confiance.
   */
  readonly securityLevel = input<MermaidSecurityLevel>('strict', { alias: 'mermaidSecurityLevel' });

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    const el = this.host.nativeElement;
    const root = this.doc.documentElement;
    const mermaidReady = import('mermaid').then(({ default: m }) => m);
    let activeConfig = '';
    let scheduled = false;

    const render = () => {
      if (scheduled) return; // coalesce la rafale de mutations émise par mermaid lui-même
      scheduled = true;
      queueMicrotask(async () => {
        scheduled = false;
        const m = await mermaidReady;
        const theme = root.classList.contains('dark') ? 'dark' : 'default';
        const securityLevel = this.securityLevel();
        const config = `${theme}|${securityLevel}`;
        if (config !== activeConfig) {
          // Le thème a changé : ré-initialiser et réarmer les diagrammes déjà rendus.
          activeConfig = config;
          m.initialize({ startOnLoad: false, securityLevel, theme });
          el.querySelectorAll<HTMLElement>('pre.mermaid[data-processed]').forEach((n) => {
            const src = n.dataset['mermaidSrc'];
            if (src) {
              n.textContent = src;
              n.removeAttribute('data-processed');
              n.removeAttribute('data-mermaid-error');
            }
          });
        }

        // Un diagramme à la fois : une erreur de syntaxe n'empêche pas les autres.
        for (const node of el.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')) {
          const src = node.dataset['mermaidSrc'] ?? node.textContent ?? '';
          try {
            if ((await m.parse(src, { suppressErrors: true })) === false) {
              throw new Error('invalid diagram');
            }
            await m.run({ nodes: [node] });
          } catch {
            node.textContent = src;
            node.setAttribute('data-processed', 'true');
            node.setAttribute('data-mermaid-error', '');
            node.title = 'Diagramme Mermaid invalide : source affichée';
          }
        }
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
