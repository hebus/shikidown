/**
 * Appelle `callback` une fois, quand `element` devient visible — sauf si
 * l'utilisateur a demandé à réduire les animations, auquel cas rien n'est
 * déclenché. Renvoie une fonction d'annulation.
 */
export function whenVisible(element: HTMLElement, callback: () => void, threshold = 0.4): () => void {
  const win = element.ownerDocument.defaultView;
  if (!win || win.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      callback();
    },
    { threshold },
  );
  observer.observe(element);
  return () => observer.disconnect();
}
