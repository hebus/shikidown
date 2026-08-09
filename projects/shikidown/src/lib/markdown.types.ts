import type MarkdownIt from 'markdown-it';

/**
 * Instance markdown-it.
 *
 * L'export default ne se comporte pas de la même façon selon la version :
 * en 14 c'est une `class` (donc utilisable directement comme type), en 15 c'est
 * une `const` callable — une valeur pure, qui en position de type déclenche
 * TS2749. `InstanceType<typeof …>` passe par la signature de construction, la
 * seule forme commune aux deux.
 */
export type MarkdownItInstance = InstanceType<typeof MarkdownIt>;

/** Token type derived from markdown-it's parse() return type. */
export type MdToken = ReturnType<MarkdownItInstance['parse']>[number];

/** Groupe de tokens markdown-it consécutifs formant un bloc racine autonome. */
export interface ParsedBlock {
  /** Hash FNV-1a du texte source brut — identité stable du bloc. */
  readonly hash: string;
  /** Ligne de début dans le document source (0-based, inclusive). */
  readonly startLine: number;
  /** Ligne de fin dans le document source (0-based, exclusive). */
  readonly endLine: number;
  /** Sous-ensemble de tokens à passer à `md.renderer.render()`. */
  readonly tokens: MdToken[];
  /** Texte source brut du bloc — utilisé comme clé de cache. */
  readonly source: string;
}

/** Bloc rendu retourné par `MarkdownService.parseBlocksAsync()` (html = string brut, pas SafeHtml). */
export interface RenderedBlock {
  readonly hash: string;
  readonly html: string;
}

/**
 * Hash FNV-1a 32-bit — O(n), zéro dépendance.
 * Collision-résistant dans le contexte d'un seul document (4 milliards de buckets).
 */
export function hashSource(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}
