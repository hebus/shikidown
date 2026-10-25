import type { RenderedBlock } from './markdown.types';

/** Bloc affiché par `MarkdownComponent`, avec l'identité qui sert de clé au `@for`. */
export interface KeyedBlock extends RenderedBlock {
  readonly id: number;
}

/**
 * Attribue à chaque bloc rendu l'identité d'un bloc affiché précédemment, pour
 * qu'Angular réutilise son élément au lieu de le recréer.
 *
 * Le hash seul ne suffit pas comme clé : le dernier bloc d'un flux change de
 * hash à chaque fragment (son élément, et les composants qu'il contient,
 * seraient recréés à chaque fois), et deux blocs identiques auraient la même
 * clé. D'où deux passes :
 *  1. un bloc inchangé reprend l'identité d'un bloc de même hash, dans l'ordre
 *     du document — un déplacement conserve donc l'élément ;
 *  2. un bloc modifié reprend celle du bloc qui occupait sa position, si elle
 *     est libre — c'est le cas du bloc en cours de génération.
 * Les autres reçoivent une identité neuve.
 */
export function assignBlockIds(
  previous: readonly KeyedBlock[],
  next: readonly RenderedBlock[],
  newId: () => number,
): KeyedBlock[] {
  const byHash = new Map<string, number[]>();
  for (const block of previous) {
    const ids = byHash.get(block.hash);
    if (ids) ids.push(block.id);
    else byHash.set(block.hash, [block.id]);
  }

  const used = new Set<number>();
  const ids: Array<number | undefined> = next.map((block) => {
    const id = byHash.get(block.hash)?.shift();
    if (id !== undefined) used.add(id);
    return id;
  });

  return next.map((block, i) => {
    let id = ids[i];
    if (id === undefined) {
      const inPlace = previous[i]?.id;
      id = inPlace !== undefined && !used.has(inPlace) ? inPlace : newId();
      used.add(id);
    }
    return { ...block, id };
  });
}
