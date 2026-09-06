import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import MarkdownIt from 'markdown-it';
import type { HighlighterCore, LanguageInput, ThemeInput } from '@shikijs/core';
import type { BundledLanguage, BundledTheme, StringLiteralUnion } from 'shiki';
import { MARKDOWN_CONFIG } from './markdown.tokens';
import type { MarkdownConfig, MarkdownThemePair } from './markdown.config';
import { type MarkdownItInstance, type MdToken, type ParsedBlock, type RenderedBlock, hashSource } from './markdown.types';

/**
 * Loaders pour les langages préchargés par défaut — un `import()` littéral par langage, pas le
 * registre bundlé de Shiki (`'shiki'` ou `'shiki/langs'`), qui déclare un `import()` statique pour
 * chacune de ses ~235 grammaires quelle que soit la liste réellement demandée à l'exécution. Un
 * bundler résout ces appels littéraux au moment du build : importer depuis le registre de Shiki
 * tirerait ces ~235 cibles dans le graphe de build. `() => import(...)`, pas un import statique en
 * tête de fichier : `MarkdownService` est `providedIn: 'root'` et atteint dès que `provideMarkdown()`
 * s'initialise, donc un import statique finirait dans le bundle initial de l'appli plutôt que dans
 * un chunk chargé à la demande dans `_init()`.
 */
const DEFAULT_LANGS: Record<string, LanguageInput> = {
  typescript: () => import('@shikijs/langs/typescript'),
  javascript: () => import('@shikijs/langs/javascript'),
  jsx: () => import('@shikijs/langs/jsx'),
  tsx: () => import('@shikijs/langs/tsx'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  scss: () => import('@shikijs/langs/scss'),
  json: () => import('@shikijs/langs/json'),
  yaml: () => import('@shikijs/langs/yaml'),
  bash: () => import('@shikijs/langs/bash'),
  shell: () => import('@shikijs/langs/shell'),
  markdown: () => import('@shikijs/langs/markdown'),
  sql: () => import('@shikijs/langs/sql'),
  python: () => import('@shikijs/langs/python'),
  rust: () => import('@shikijs/langs/rust'),
  go: () => import('@shikijs/langs/go'),
};

/** Même rationale que {@link DEFAULT_LANGS} : couvre les défauts codés en dur de
 * {@link MarkdownService.resolveTheme} (`github-dark`/`poimandres`) et la paire dark/light
 * documentée dans le README (`github-dark`/`catppuccin-latte`). */
const DEFAULT_THEMES: Record<string, ThemeInput> = {
  'github-dark': () => import('@shikijs/themes/github-dark'),
  'github-light': () => import('@shikijs/themes/github-light'),
  poimandres: () => import('@shikijs/themes/poimandres'),
  'catppuccin-latte': () => import('@shikijs/themes/catppuccin-latte'),
};

/** Noms des langages préchargés par défaut — voir `extraLanguages` sur `MarkdownConfig` pour en ajouter d'autres. */
export const DEFAULT_LANGUAGE_NAMES = Object.keys(DEFAULT_LANGS) as StringLiteralUnion<BundledLanguage>[];
/** Noms des thèmes préchargés par défaut — voir `extraThemes` sur `MarkdownConfig` pour en ajouter d'autres. */
export const DEFAULT_THEME_NAMES = Object.keys(DEFAULT_THEMES) as StringLiteralUnion<BundledTheme>[];

const DEFAULT_CACHE_CAPACITY = 256;

/**
 * Extrait la fonction plugin de ce qu'un `import()` a rendu.
 *
 * Le nombre d'enveloppes `default` dépend du bundler, pas du plugin. Quand esbuild
 * met un module CommonJS dans son propre chunk paresseux, le `default` du chunk est
 * l'objet `module.exports` lui-même — qui porte déjà son propre `default` :
 *
 *   export { chunkXYZ as default }   //  chunkXYZ === { __esModule: true, default: fn }
 *
 * Le serveur de développement, lui, pré-bundle les dépendances en appliquant
 * l'interop et n'en laisse qu'une. Déballer un nombre fixe de couches marche donc
 * d'un côté et casse de l'autre : on déballe jusqu'à trouver la fonction.
 */
function unwrapPlugin(loaded: unknown): (md: MarkdownItInstance) => void {
  let candidate = loaded;

  while (candidate && typeof candidate === 'object' && 'default' in candidate) {
    candidate = (candidate as { default: unknown }).default;
  }

  if (typeof candidate !== 'function') {
    throw new Error(
      '[shikidown] A plugin loader resolved to ' +
        (candidate === null ? 'null' : typeof candidate) +
        ' instead of a function. `load` must resolve to a markdown-it plugin, ' +
        'or to a module whose default export is one.',
    );
  }

  return candidate as (md: MarkdownItInstance) => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly config: MarkdownConfig = inject(MARKDOWN_CONFIG, { optional: true }) ?? {};

  private md: MarkdownItInstance | null = null;
  private highlighter: HighlighterCore | null = null;
  private initPromise: Promise<void> | null = null;

  // Cache LRU simplifié : Map à ordre d'insertion, éviction du plus ancien quand plein.
  private readonly blockCache = new Map<string, string>();
  private readonly cacheCapacity: number = this.config.blockCacheSize ?? DEFAULT_CACHE_CAPACITY;

  private resolveTheme(): MarkdownThemePair {
    const t = this.config.theme;
    if (!t) return { dark: 'github-dark', light: 'poimandres' };
    if (typeof t === 'string') return { dark: t as StringLiteralUnion<BundledTheme>, light: t as StringLiteralUnion<BundledTheme> };
    return t;
  }

  async initialize(): Promise<void> {
    if (this.md) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    const themes = this.resolveTheme();
    const requestedLangs = new Set(this.config.languages ?? DEFAULT_LANGUAGE_NAMES);
    const requestedThemes = new Set([themes.dark, themes.light]);

    let highlightFn: ((code: string, lang: string) => string) | undefined;

    if (isPlatformBrowser(this.platformId)) {
      const langs: LanguageInput[] = [
        ...Object.entries(DEFAULT_LANGS).filter(([id]) => requestedLangs.has(id)).map(([, lang]) => lang),
        ...(this.config.extraLanguages ?? []),
      ];
      const highlighterThemes: ThemeInput[] = [
        ...Object.entries(DEFAULT_THEMES).filter(([name]) => requestedThemes.has(name)).map(([, theme]) => theme),
        ...(this.config.extraThemes ?? []),
      ];

      // Importés ici plutôt qu'en tête de fichier : `MarkdownService` est `providedIn: 'root'`,
      // donc un import statique de `@shikijs/core`/`@shikijs/engine-oniguruma` (et de leurs
      // dépendances, dont vscode-textmate) finirait dans le bundle initial de l'appli plutôt que
      // dans un chunk chargé à la demande ici.
      const [{ createHighlighterCore }, { createOnigurumaEngine }] = await Promise.all([
        import('@shikijs/core'),
        import('@shikijs/engine-oniguruma'),
      ]);
      this.highlighter = await createHighlighterCore({
        langs,
        themes: highlighterThemes,
        engine: createOnigurumaEngine(import('shiki/wasm')),
      });

      const hl = this.highlighter;
      const loadedLangs = new Set(hl.getLoadedLanguages());
      const useDualTheme = themes.dark !== themes.light;

      highlightFn = (code: string, lang: string): string => {
        if (!lang || !loadedLangs.has(lang)) return '';
        try {
          if (useDualTheme) {
            return hl.codeToHtml(code, {
              lang,
              themes: { dark: themes.dark, light: themes.light },
            });
          }
          return hl.codeToHtml(code, { lang, theme: themes.dark });
        } catch {
          return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
        }
      };
    }

    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: highlightFn,
      ...this.config.markdownOptions,
    });

    // Résolution en parallèle, application séquentielle : les chargeurs paresseux
    // se téléchargent de front, mais l'ordre de déclaration reste significatif.
    const plugins = await Promise.all(
      (this.config.plugins ?? []).map((source) =>
        typeof source === 'function' ? Promise.resolve(source) : source.load().then(unwrapPlugin),
      ),
    );
    for (const plugin of plugins) {
      plugin(this.md);
    }

    // Mermaid fence: output a <pre class="mermaid"> placeholder so mermaid.run()
    // can render it client-side without Shiki interfering.
    const originalFence = this.md.renderer.rules['fence']?.bind(this.md.renderer.rules);
    this.md.renderer.rules['fence'] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.info.trim() === 'mermaid') {
        return `<pre class="mermaid" data-mermaid-src="${escapeHtml(token.content.trim())}">${token.content.trim()}</pre>`;
      }
      return originalFence
        ? originalFence(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options);
    };
  }

  // ─── API publique principale (inchangée) ──────────────────────────────────

  async parseAsync(content: string): Promise<string> {
    await this.initialize();
    return this.md!.render(content);
  }

  /** Synchronous parse — only works after initialize() has resolved */
  parse(content: string): string {
    if (!this.md) throw new Error('[shikidown] MarkdownService not initialized. Call parseAsync() first.');
    return this.md.render(content);
  }

  // ─── API rendu incrémental ────────────────────────────────────────────────

  /**
   * Parse le contenu en blocs indépendants et retourne le HTML de chacun.
   * Les blocs inchangés (même hash source) sont servis depuis le cache.
   * Utilisé par `MarkdownComponent` quand `incrementalRendering: true`.
   */
  async parseBlocksAsync(content: string): Promise<RenderedBlock[]> {
    await this.initialize();
    const lines = content.split('\n');
    const tokens = this.md!.parse(content, {});
    return this.groupTokensToBlocks(tokens, lines)
      .map((b) => ({ hash: b.hash, html: this.renderBlock(b) }));
  }

  /** Vide le cache de blocs (utile si le thème Shiki change à runtime). */
  clearCache(): void {
    this.blockCache.clear();
  }

  // ─── Privé ────────────────────────────────────────────────────────────────

  /**
   * Regroupe un tableau plat de tokens markdown-it en blocs racine autonomes.
   * Algorithme de comptage de profondeur — O(n), plugin-agnostique (ne regarde
   * que la propriété `nesting`, pas le type du token).
   */
  private groupTokensToBlocks(tokens: MdToken[], lines: string[]): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];
    let i = 0;

    while (i < tokens.length) {
      const t = tokens[i];

      if (t.nesting === 1) {
        // Token ouvrant : collecter jusqu'au token fermant correspondant (profondeur 0)
        const group: MdToken[] = [t];
        let depth = 1;
        i++;
        while (depth > 0 && i < tokens.length) {
          group.push(tokens[i]);
          if (tokens[i].nesting === 1)  depth++;
          if (tokens[i].nesting === -1) depth--;
          i++;
        }
        blocks.push(this.makeBlock(group, lines));
      } else {
        // Token auto-fermant (nesting === 0) : fence, hr, html_block, code_block…
        blocks.push(this.makeBlock([t], lines));
        i++;
      }
    }

    return blocks;
  }

  private makeBlock(tokens: MdToken[], lines: string[]): ParsedBlock {
    const [startLine, endLine] = tokens[0].map ?? [0, 0];
    const source = lines.slice(startLine, endLine).join('\n');
    return { hash: hashSource(source), startLine, endLine, tokens, source };
  }

  private renderBlock(block: ParsedBlock): string {
    const cached = this.blockCache.get(block.hash);
    if (cached !== undefined) return cached;

    const html = this.md!.renderer.render(block.tokens, this.md!.options, {});

    // Éviction LRU : supprimer l'entrée la plus ancienne si le cache est plein
    if (this.blockCache.size >= this.cacheCapacity) {
      this.blockCache.delete(this.blockCache.keys().next().value!);
    }
    this.blockCache.set(block.hash, html);
    return html;
  }
}
