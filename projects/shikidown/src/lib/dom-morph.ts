/**
 * Met le contenu de `target` en conformité avec `html` en modifiant le DOM
 * existant plutôt qu'en le remplaçant.
 *
 * Réécrire `innerHTML` recrée tous les nœuds : la sélection de texte est perdue
 * et chaque custom element est détruit puis reconstruit — un composant Angular
 * embarqué perd son état. Pendant un flux, le dernier bloc change à chaque
 * fragment ; le morph ne touche que ce qui a changé (le plus souvent la valeur
 * du dernier nœud texte).
 *
 * Volontairement simple : comparaison position par position, avec un pas
 * d'anticipation pour absorber une insertion ou une suppression isolée.
 */
export function morphInnerHtml(target: Element, html: string): void {
  const template = target.ownerDocument.createElement('template');
  template.innerHTML = html;
  morphChildren(target, template.content);
}

function morphChildren(target: Node, source: Node): void {
  const incoming = [...source.childNodes];
  let current = target.firstChild;

  for (let i = 0; i < incoming.length; i++) {
    const next = incoming[i];

    if (!current) {
      target.appendChild(next);
      continue;
    }
    if (sameKind(current, next)) {
      current = morphNode(current, next).nextSibling;
      continue;
    }
    // Un nœud inséré avant `current` : on l'insère, `current` sera repris ensuite.
    if (incoming[i + 1] && sameKind(current, incoming[i + 1])) {
      target.insertBefore(next, current);
      continue;
    }
    // Un nœud supprimé : `current` disparaît, son suivant correspond.
    if (current.nextSibling && sameKind(current.nextSibling, next)) {
      const removed = current;
      current = current.nextSibling;
      target.removeChild(removed);
      current = morphNode(current, next).nextSibling;
      continue;
    }
    const replaced = current;
    current = current.nextSibling;
    target.replaceChild(next, replaced);
  }

  while (current) {
    const following = current.nextSibling;
    target.removeChild(current);
    current = following;
  }
}

function sameKind(a: Node, b: Node): boolean {
  return a.nodeType === b.nodeType && a.nodeName === b.nodeName;
}

/** Aligne `current` sur `next` ; renvoie le nœud resté à sa place dans le DOM. */
function morphNode(current: Node, next: Node): Node {
  if (current.nodeType !== Node.ELEMENT_NODE) {
    if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
    return current;
  }

  const element = current as Element;
  const incoming = next as Element;

  // Diagramme déjà rendu par la directive Mermaid : son SVG remplace la source, à
  // conserver tant que la source n'a pas changé.
  if (element.hasAttribute('data-processed')) {
    if (element.getAttribute('data-mermaid-src') === incoming.getAttribute('data-mermaid-src')) return element;
    element.replaceWith(incoming);
    return incoming;
  }

  const custom = element.localName.includes('-') && customElements.get(element.localName) !== undefined;
  syncAttributes(element, incoming, !custom);

  // Le contenu d'un custom element est rendu par son composant, pas par le Markdown.
  if (!custom) morphChildren(element, incoming);
  return element;
}

/**
 * Aligne les attributs. Sur un custom element, on ne retire rien : son composant
 * pose ses propres attributs sur l'hôte (encapsulation des styles notamment).
 */
function syncAttributes(element: Element, incoming: Element, removeMissing: boolean): void {
  for (const { name, value } of [...incoming.attributes]) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
  if (!removeMissing) return;
  for (const { name } of [...element.attributes]) {
    if (!incoming.hasAttribute(name)) element.removeAttribute(name);
  }
}
