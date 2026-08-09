import type { Type } from '@angular/core';
import type { BundledLanguage, BundledTheme, StringLiteralUnion } from 'shiki';
import type { MarkdownItInstance } from './markdown.types';

/** Paire de thèmes Shiki pour dark/light mode */
export interface MarkdownThemePair {
  dark: StringLiteralUnion<BundledTheme>;
  light: StringLiteralUnion<BundledTheme>;
}

/**
 * Un module exportant des composants — typiquement le résultat d'un `import()`.
 * Les sélecteurs sont lus dans les décorateurs, il n'y a donc rien à déclarer :
 * les exports qui ne sont pas des composants sont simplement ignorés.
 */
export type ComponentModule = Record<string, unknown>;

/**
 * Un module déjà chargé, ou une fonction qui le charge à la demande.
 * La forme paresseuse `() => import('./x')` garde le module hors du bundle
 * initial jusqu'à ce qu'une page en ait besoin.
 */
export type ComponentModuleSource = ComponentModule | (() => Promise<ComponentModule>);

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
   * Modules de composants à enregistrer, sans avoir à lister les sélecteurs :
   * ils sont lus dans les décorateurs. Alternative à `components` quand les
   * composants sont nombreux, ou qu'on veut les charger paresseusement.
   *
   * @example
   * ```typescript
   * // Chargé au démarrage, sélecteurs déduits
   * import * as demos from './demos';
   * provideMarkdown({ componentModules: [demos] })
   *
   * // Chargé à la demande — reste hors du bundle initial
   * provideMarkdown({ componentModules: [() => import('./demos')] })
   * ```
   */
  componentModules?: ComponentModuleSource[];
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
  plugins?: Array<(md: MarkdownItInstance) => void>;
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
