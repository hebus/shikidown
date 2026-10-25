import type { MarkdownItInstance, MarkdownItPlugin, MarkdownItPluginSource } from 'shikidown';

/** Options transmises à `@vscode/markdown-it-katex` (et à KaTeX). */
export interface KatexPluginOptions {
  /** Rend les blocs `\begin … \end` sans délimiteurs `$$`. */
  enableBareBlocks?: boolean;
  /** Rend les fences ```` ```math ````. */
  enableFencedBlocks?: boolean;
  /**
   * Lève une exception sur une formule invalide. Désactivé par défaut : la
   * formule fautive est affichée en source, signalée par KaTeX, sans
   * interrompre le rendu du document.
   * @default false
   */
  throwOnError?: boolean;
}

type KatexMarkdownPlugin = (md: MarkdownItInstance, options?: KatexPluginOptions) => void;

/**
 * Formules `$…$` et `$$…$$` rendues par KaTeX, chargé à la demande : le plugin et
 * KaTeX (~270 kB) restent hors du bundle initial jusqu'au premier rendu.
 *
 * Requiert `@vscode/markdown-it-katex` et `katex` (peer dependencies optionnelles),
 * ainsi que la feuille de style `katex/dist/katex.min.css`. KaTeX produit aussi du
 * MathML, lu par les technologies d'assistance.
 *
 * Pendant un streaming, activer `repair: { math: true }` pour qu'une formule pas
 * encore fermée ne s'affiche pas en source brute.
 *
 * @example
 * ```typescript
 * provideMarkdown({ plugins: [katexPlugin()], repair: { math: true } })
 * ```
 */
export function katexPlugin(options: KatexPluginOptions = {}): MarkdownItPluginSource {
  return {
    load: async (): Promise<MarkdownItPlugin> => {
      const plugin = unwrap(await import('@vscode/markdown-it-katex'));
      return (md) => plugin(md, { throwOnError: false, ...options });
    },
  };
}

/** Le plugin est en CommonJS : selon le bundler, la fonction est sous un ou deux `default`. */
function unwrap(loaded: unknown): KatexMarkdownPlugin {
  let candidate = loaded;
  while (candidate && typeof candidate === 'object' && 'default' in candidate) {
    candidate = (candidate as { default: unknown }).default;
  }
  if (typeof candidate !== 'function') {
    throw new Error('[shikidown/math] @vscode/markdown-it-katex did not resolve to a markdown-it plugin.');
  }
  return candidate as KatexMarkdownPlugin;
}
