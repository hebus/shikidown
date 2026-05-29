import type { Type } from '@angular/core';
import type MarkdownIt from 'markdown-it';
import type { BundledLanguage, BundledTheme, StringLiteralUnion } from 'shiki';

/** Paire de thèmes Shiki pour dark/light mode */
export interface MarkdownThemePair {
  dark: StringLiteralUnion<BundledTheme>;
  light: StringLiteralUnion<BundledTheme>;
}

/** Options markdown-it supportées */
export interface MarkdownItOptions {
  html?: boolean;
  xhtmlOut?: boolean;
  breaks?: boolean;
  langPrefix?: string;
  linkify?: boolean;
  typographer?: boolean;
  quotes?: string;
}

export interface MarkdownConfig {
  /**
   * Thème(s) Shiki à utiliser.
   * - `string` : un seul thème (ex. `'github-dark'`)
   * - `{ dark, light }` : paire de thèmes pour le dual-mode
   *
   * Bénéficie du même intellisense que `createHighlighter({ themes })`.
   * @default { dark: 'github-dark', light: 'poimandres' }
   */
  theme?: StringLiteralUnion<BundledTheme> | MarkdownThemePair;
  /**
   * Langages Shiki à précharger.
   * Bénéficie du même intellisense que `createHighlighter({ langs })`.
   */
  languages?: StringLiteralUnion<BundledLanguage>[];
  /** Composants Angular enregistrés par sélecteur CSS pour l'embedding dans le Markdown */
  components?: Record<string, Type<unknown>>;
  /**
   * Plugins markdown-it supplémentaires, appliqués dans l'ordre de déclaration.
   * Chaque plugin reçoit l'instance `MarkdownIt` et peut appeler `.use()` ou modifier les règles directement.
   *
   * @example
   * ```typescript
   * import markdownItAnchor from 'markdown-it-anchor';
   * import markdownItFootnote from 'markdown-it-footnote';
   *
   * provideMarkdown({ plugins: [markdownItAnchor, markdownItFootnote] })
   * ```
   */
  plugins?: Array<(md: MarkdownIt) => void>;
  /** Options markdown-it personnalisées, fusionnées avec les défauts */
  markdownOptions?: MarkdownItOptions;
  /**
   * Active le rendu incrémental par blocs dans `MarkdownComponent`.
   * Seuls les blocs dont le texte source a changé sont re-parsés et re-rendus.
   * Les blocs inchangés sont servis depuis le cache → Shiki ne re-colorie pas inutilement.
   * N'a aucun effet sur `MarkdownPipe`.
   * @default false
   */
  incrementalRendering?: boolean;
  /**
   * Taille maximale du cache de blocs rendus (entrées les plus anciennes évincées en premier).
   * @default 256
   */
  blockCacheSize?: number;
}
