import type { Type } from '@angular/core';
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
  /** Plugins markdown-it supplémentaires */
  plugins?: Array<(md: unknown) => void>;
  /** Options markdown-it personnalisées, fusionnées avec les défauts */
  markdownOptions?: MarkdownItOptions;
}
