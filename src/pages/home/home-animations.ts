/**
 * Animations de la page d'accueil, avec GSAP et ScrollTrigger.
 *
 * GSAP est importé ici, à la demande : il reste hors du bundle initial, et la
 * page s'affiche normalement s'il ne se charge pas. Tout passe par
 * `gsap.matchMedia()` : rien ne bouge quand l'utilisateur a demandé à réduire
 * les animations, et `revert()` rend au DOM son état d'origine.
 *
 * Aucune animation ne tourne en boucle : le mouvement est soit une entrée
 * ponctuelle, soit piloté par le défilement ou le pointeur (WCAG 2.2.2).
 *
 * Marqueurs lus dans le template :
 * - `data-anim="pill" | "word" | "hero-fade" | "window"` : entrée du hero ;
 * - `data-anim="reveal"` : apparition au défilement ;
 * - `data-anim="stagger"` : apparition décalée des enfants ;
 * - `data-anim="blob"` : halos en parallaxe ;
 * - `data-anim="bar"` : barres de comparaison, remplies à l'apparition ;
 * - `data-count-from` / `data-count-to` : compteurs.
 */
export async function animateHome(root: HTMLElement, format: (value: number) => string): Promise<() => void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
  gsap.registerPlugin(ScrollTrigger);

  const q = gsap.utils.selector(root);
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // ─── Entrée du hero ─────────────────────────────────────────────────────
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .from(q('[data-anim="pill"]'), { y: 16, autoAlpha: 0, duration: 0.6 })
      .from(q('[data-anim="word"]'), { yPercent: 110, duration: 0.9, stagger: 0.05 }, '-=0.3')
      .from(q('[data-anim="hero-fade"]'), { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.1 }, '-=0.6')
      .from(
        q('[data-anim="window"]'),
        { y: 60, rotateX: 10, autoAlpha: 0, duration: 1.1, transformPerspective: 1400, transformOrigin: '50% 100%' },
        '-=0.7',
      );

    // ─── Halos : parallaxe au défilement ────────────────────────────────────
    q('[data-anim="blob"]').forEach((blob, i) => {
      gsap.to(blob, {
        yPercent: (i + 1) * 25,
        xPercent: i % 2 ? -12 : 12,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top top', end: '+=900', scrub: true },
      });
    });

    // ─── Apparitions au défilement ──────────────────────────────────────────
    q('[data-anim="reveal"]').forEach((el) => {
      gsap.from(el, {
        y: 48,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });
    q('[data-anim="stagger"]').forEach((group) => {
      gsap.from(group.children, {
        y: 36,
        autoAlpha: 0,
        scale: 0.97,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 85%', once: true },
      });
    });

    // ─── Barres de comparaison ─────────────────────────────────────────────
    q('[data-anim="bar"]').forEach((bar) => {
      gsap.from(bar, {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 1.4,
        ease: 'power3.out',
        scrollTrigger: { trigger: bar, start: 'top 92%', once: true },
      });
    });

    // ─── Compteurs ──────────────────────────────────────────────────────────
    // Partent de leur valeur de départ, hors écran, et rejoignent la valeur
    // finale — celle du HTML, affichée sans animation.
    const counters = q('[data-count-to]');
    counters.forEach((el) => {
      const from = Number(el.dataset['countFrom']);
      const to = Number(el.dataset['countTo']);
      const value = { current: from };
      el.textContent = format(from);
      gsap.to(value, {
        current: to,
        duration: 1.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => (el.textContent = format(Math.round(value.current))),
      });
    });

    return () => counters.forEach((el) => (el.textContent = format(Number(el.dataset['countTo']))));
  });

  // Les positions des déclencheurs sont calculées une fois ; la page change ensuite
  // de hauteur (diagramme Mermaid rendu, réponses qui s'écrivent). Sans recalcul,
  // un bloc dont le déclencheur a glissé resterait masqué.
  let pending: ReturnType<typeof setTimeout> | undefined;
  const resize = new ResizeObserver(() => {
    clearTimeout(pending);
    pending = setTimeout(() => ScrollTrigger.refresh(), 150);
  });
  resize.observe(root.ownerDocument.body);

  return () => {
    resize.disconnect();
    clearTimeout(pending);
    mm.revert();
  };
}
