import type { Type } from '@angular/core';
import type { LanguageInput, ThemeInput } from '@shikijs/core';
import type { BundledLanguage, BundledTheme, StringLiteralUnion } from 'shiki';
import type { MarkdownItInstance } from './markdown.types';
import type { RepairOptions } from './repair/repair-incomplete-markdown';
import type { SanitizeOptions } from './sanitize/sanitize-html';

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

/** Un plugin markdown-it : reçoit l'instance et la modifie en place. */
export type MarkdownItPlugin = (md: MarkdownItInstance) => void;

/**
 * Un plugin déjà chargé, ou un chargeur qui le résout à la demande.
 *
 * La forme paresseuse `{ load: () => import('markdown-it-foo') }` garde le plugin
 * hors du bundle initial — utile pour les gros paquets comme KaTeX.
 *
 * Elle passe par un objet là où `ComponentModuleSource` se contente d'une fonction
 * nue : un module est un objet et un chargeur une fonction, donc `typeof` les
 * sépare. Ici les deux formes seraient des fonctions, et l'arité ne les distingue
 * pas — un plugin qui ignore son paramètre a une arité de 0, tout comme un
 * chargeur. La clé `load` retire l'ambiguïté.
 */
export type MarkdownItPluginSource =
  | MarkdownItPlugin
  | { load: () => Promise<MarkdownItPlugin | { default: MarkdownItPlugin }> };

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
   * Seuls les thèmes de `DEFAULT_THEME_NAMES` sont préchargés automatiquement ; un thème hors de
   * cette liste doit être fourni via `extraThemes`, sans quoi le code reste non coloré.
   * @default { dark: 'github-dark', light: 'poimandres' }
   */
  theme?: StringLiteralUnion<BundledTheme> | MarkdownThemePair;
  /**
   * Thèmes Shiki additionnels, hors de la liste par défaut de shikidown (`DEFAULT_THEME_NAMES`).
   * Importé par l'application consommatrice elle-même — seule cette application en paie le chunk.
   * Le nom sous lequel le référencer dans `theme` est celui que le thème déclare (son champ `name`).
   *
   * Le loader paresseux `() => import(...)` est préférable à un import statique en tête de fichier :
   * `provideMarkdown()` est typiquement appelé depuis `app.config.ts`, lu au bootstrap, donc un
   * import statique finirait dans le bundle initial plutôt que dans un chunk chargé à la demande.
   *
   * @example
   * ```typescript
   * provideMarkdown({ theme: 'dracula', extraThemes: [() => import('@shikijs/themes/dracula')] });
   * ```
   */
  extraThemes?: ThemeInput[];
  /**
   * Langages Shiki à précharger, par nom, parmi ceux de `DEFAULT_LANGUAGE_NAMES`. Remplace la
   * liste par défaut plutôt que de l'étendre.
   */
  languages?: StringLiteralUnion<BundledLanguage>[];
  /**
   * Langages Shiki additionnels, hors de la liste par défaut de shikidown (`DEFAULT_LANGUAGE_NAMES`).
   * Importé par l'application consommatrice elle-même — seule cette application en paie le chunk.
   *
   * Le loader paresseux `() => import(...)` est préférable à un import statique en tête de fichier :
   * `provideMarkdown()` est typiquement appelé depuis `app.config.ts`, lu au bootstrap, donc un
   * import statique finirait dans le bundle initial plutôt que dans un chunk chargé à la demande.
   *
   * @example
   * ```typescript
   * provideMarkdown({ extraLanguages: [() => import('@shikijs/langs/go')] });
   * ```
   */
  extraLanguages?: LanguageInput[];
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
   *
   * @example
   * ```typescript
   * // Chargé à la demande — reste hors du bundle initial
   * provideMarkdown({ plugins: [{ load: () => import('@vscode/markdown-it-katex') }] })
   * ```
   */
  plugins?: MarkdownItPluginSource[];
  /** Options markdown-it personnalisées, fusionnées avec les défauts */
  markdownOptions?: MarkdownItOptions;
  /**
   * Traitement du HTML brut présent dans le Markdown :
   * - `'sanitize'` : filtré par liste blanche — balises de mise en forme, custom
   *   elements, attributs sans gestionnaire d'événement, URL de protocole admis
   *   (voir `sanitize`) ;
   * - `'escape'` : affiché comme du texte ;
   * - `'trusted'` : inséré tel quel. À réserver à un contenu dont l'application
   *   maîtrise entièrement l'origine — jamais à la sortie d'un LLM.
   *
   * Les liens Markdown suivent la même liste de protocoles, sauf en `'trusted'`.
   * @default 'sanitize'
   */
  htmlPolicy?: HtmlPolicy;
  /** Règles du filtrage `htmlPolicy: 'sanitize'`. */
  sanitize?: SanitizeOptions;
  /**
   * Active le rendu incrémental par blocs dans `MarkdownComponent`.
   * Seuls les blocs dont le texte source a changé sont re-parsés et re-rendus.
   * Les blocs inchangés sont servis depuis le cache → Shiki ne re-colorie pas inutilement.
   * N'a aucun effet sur `MarkdownPipe`.
   * @default false
   */
  incrementalRendering?: boolean;
  /**
   * Taille maximale du cache de blocs rendus et de celui des colorations Shiki
   * (les entrées les moins récemment utilisées sont évincées en premier).
   * @default 256
   */
  blockCacheSize?: number;
  /**
   * Réparation provisoire de la fin du document pendant le streaming
   * (`<shikidown [streaming]="true">`) : délimiteurs fermés, liens et balises
   * incomplets masqués. `false` la désactive ; un objet règle ses options.
   * @default true
   */
  repair?: boolean | RepairOptions;
  /**
   * Repère visuel par défaut des `<shikidown>` en streaming (surchargé par
   * l'input `animation`). Voir {@link StreamingAnimation}.
   * @default 'none'
   */
  animation?: StreamingAnimation;
}

/**
 * - `'none'` : aucun repère ;
 * - `'caret'` : un curseur fixe (non clignotant) à la fin du texte en cours ;
 * - `'fade'` : chaque nouveau bloc apparaît en fondu, une seule fois — les blocs
 *   déjà affichés ne rejouent pas l'animation. Désactivé par
 *   `prefers-reduced-motion: reduce`.
 */
export type StreamingAnimation = 'none' | 'caret' | 'fade';

export type HtmlPolicy = 'sanitize' | 'escape' | 'trusted';
