import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import MarkdownIt from 'markdown-it';
import type { HighlighterCore, LanguageInput, ThemeInput } from '@shikijs/core';
import type { BundledLanguage, BundledTheme, StringLiteralUnion } from 'shiki';
import { MARKDOWN_CONFIG } from './markdown.tokens';
import type { MarkdownConfig, MarkdownThemePair } from './markdown.config';
import {
  type BlockParseState,
  type BlockRenderOptions,
  type BlockRenderResult,
  type MarkdownItInstance,
  type MarkdownStats,
  type MdToken,
  type ParsedBlock,
  type RenderedBlock,
  hashSource,
} from './markdown.types';
import { LruCache } from './lru-cache';
import { repairIncompleteMarkdown, type RepairOptions } from './repair/repair-incomplete-markdown';
import { DEFAULT_ALLOWED_PROTOCOLS, isSafeUrl, sanitizeHtml } from './sanitize/sanitize-html';

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

  private readonly cacheCapacity: number = this.config.blockCacheSize ?? DEFAULT_CACHE_CAPACITY;
  // La source est conservée avec le HTML : le hash 32 bits ne sert qu'à indexer,
  // une collision ne doit pas servir le rendu d'un autre bloc.
  private readonly blockCache = new LruCache<{ source: string; html: string }>(this.cacheCapacity);
  private readonly highlightCache = new LruCache<string>(this.cacheCapacity);
  private readonly repairOptions: RepairOptions | null =
    this.config.repair === false ? null : this.config.repair === true || !this.config.repair ? {} : this.config.repair;

  /** Vrai pendant le rendu d'un fence encore ouvert : voir `highlightFn`. */
  private plainHighlight = false;

  private readonly stats: MarkdownStats = {
    fullParses: 0,
    tailParses: 0,
    blockRenders: 0,
    blockCacheHits: 0,
    highlights: 0,
    highlightCacheHits: 0,
  };

  private resolveTheme(): MarkdownThemePair {
    const t = this.config.theme;
    if (!t) return { dark: 'github-dark', light: 'poimandres' };
    if (typeof t === 'string') return { dark: t as StringLiteralUnion<BundledTheme>, light: t as StringLiteralUnion<BundledTheme> };
    return t;
  }

  async initialize(): Promise<void> {
    if (this.md) return;
    if (this.initPromise) return this.initPromise;
    // Un échec (réseau indisponible au chargement d'un chunk) ne doit pas rester
    // mémorisé : l'appel suivant retente l'initialisation.
    this.initPromise = this._init().catch((err: unknown) => {
      this.initPromise = null;
      throw err;
    });
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

      const toHtml = (code: string, lang: string): string =>
        useDualTheme
          ? hl.codeToHtml(code, { lang, themes: { dark: themes.dark, light: themes.light } })
          : hl.codeToHtml(code, { lang, theme: themes.dark });

      highlightFn = (code: string, lang: string): string => {
        if (!lang || !loadedLangs.has(lang)) return '';
        // Fence encore ouvert pendant le streaming : le code change à chaque fragment,
        // le tokeniser à chaque fois serait du travail jeté. Le thème en `text` garde
        // le même `<pre>` (fond, police) que le rendu final, sans couleurs syntaxiques.
        // Ce rendu provisoire n'est pas mis en cache : il change à chaque fragment
        // et évincerait les colorations définitives.
        if (this.plainHighlight) return toHtml(code, 'text');

        const key = `${lang}\u0000${code}`;
        const cached = this.highlightCache.get(key);
        if (cached !== undefined) {
          this.stats.highlightCacheHits++;
          return cached;
        }
        let html: string;
        try {
          html = toHtml(code, lang);
          this.stats.highlights++;
        } catch {
          html = `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
        }
        this.highlightCache.set(key, html);
        return html;
      };
    }

    const policy = this.config.htmlPolicy ?? 'sanitize';
    this.md = new MarkdownIt({
      html: policy !== 'escape',
      linkify: true,
      typographer: true,
      highlight: highlightFn,
      ...this.config.markdownOptions,
    });

    // Tableaux : un conteneur défilant horizontalement évite qu'un tableau large
    // déborde de la page ; focusable pour pouvoir le faire défiler au clavier.
    // Posées avant les plugins, ces règles leur restent surchargeables.
    const rules = this.md.renderer.rules;
    rules['table_open'] = (tokens, idx, options, _env, self) =>
      `<div class="shikidown-table" tabindex="0">${self.renderToken(tokens, idx, options)}`;
    rules['table_close'] = (tokens, idx, options, _env, self) => `${self.renderToken(tokens, idx, options)}</div>`;
    rules['th_open'] = (tokens, idx, options, _env, self) => {
      tokens[idx].attrSet('scope', 'col');
      return self.renderToken(tokens, idx, options);
    };

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
    const renderFence: NonNullable<typeof originalFence> = (tokens, idx, options, env, self) =>
      originalFence ? originalFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);

    this.md.renderer.rules['fence'] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const open = isOpenFence(token, env as Partial<RenderEnv>);

      // Un diagramme encore ouvert est montré comme du code : Mermaid échouerait à
      // le rendre à chaque fragment, et le source reste lisible pendant la génération.
      if (token.info.trim() === 'mermaid' && !open) {
        const source = escapeHtml(token.content.trim());
        return `<pre class="mermaid" data-mermaid-src="${source}">${source}</pre>`;
      }
      if (!open) return renderFence(tokens, idx, options, env, self);

      this.plainHighlight = true;
      try {
        return renderFence(tokens, idx, options, env, self);
      } finally {
        this.plainHighlight = false;
      }
    };

    if (policy !== 'trusted') {
      const sanitize = this.config.sanitize ?? {};
      const protocols = sanitize.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS;
      this.md.validateLink = (url) => isSafeUrl(url, protocols);

      // Poussée après les plugins : le filtre voit le HTML brut tel qu'ils l'ont laissé.
      this.md.core.ruler.push('shikidown_sanitize', (state) => {
        for (const token of state.tokens) {
          if (token.type === 'html_block') token.content = sanitizeHtml(token.content, sanitize);
          for (const child of token.children ?? []) {
            if (child.type === 'html_inline') child.content = sanitizeHtml(child.content, sanitize);
          }
        }
      });
    }
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
    return (await this.renderBlocksAsync(content)).blocks;
  }

  /**
   * Comme {@link parseBlocksAsync}, pour un document reçu par fragments.
   *
   * Avec l'état `previous` du rendu précédent, seul le dernier bloc est reparsé
   * quand le début du document n'a pas changé : un ajout en fin de document ne
   * peut modifier que ce bloc (un paragraphe qui devient titre setext ou tableau,
   * une liste qui s'allonge). Le document entier est reparsé sinon, ou dès qu'il
   * contient une définition de référence `[id]: url`, qui peut changer le rendu
   * d'un lien situé plus haut.
   *
   * Avec `streaming`, la fin du document est réparée pour l'affichage et le
   * dernier bloc n'est pas mis en cache : son rendu est provisoire.
   */
  async renderBlocksAsync(content: string, options: BlockRenderOptions = {}): Promise<BlockRenderResult> {
    await this.initialize();
    options.signal?.throwIfAborted();

    const normalized = content.replace(/\r\n?/g, '\n');
    const streaming = options.streaming ?? false;
    const source = streaming && this.repairOptions ? repairIncompleteMarkdown(normalized, this.repairOptions) : normalized;
    const lines = source.split('\n');
    const parsed = this.parseIncremental(source, lines, options.previous);

    // Le rendu d'un lien `[texte][id]` dépend des définitions du document entier :
    // elles font partie de la clé de cache de chaque bloc.
    const references = referenceDefinitionsKey(source);
    const last = parsed.length - 1;
    const blocks = parsed.map((block, i) => ({
      hash: block.hash,
      html: this.renderBlock(block, { lines, active: streaming && i === last }, references),
    }));
    return { blocks, state: { source, blocks: parsed } };
  }

  /** Compteurs de travail cumulés depuis le dernier {@link resetStats}. */
  getStats(): MarkdownStats {
    return { ...this.stats };
  }

  resetStats(): void {
    for (const key of Object.keys(this.stats) as (keyof MarkdownStats)[]) this.stats[key] = 0;
  }

  /** Vide les caches de blocs et de coloration. */
  clearCache(): void {
    this.blockCache.clear();
    this.highlightCache.clear();
  }

  // ─── Privé ────────────────────────────────────────────────────────────────

  private parseIncremental(source: string, lines: string[], previous?: BlockParseState): ParsedBlock[] {
    if (previous && previous.blocks.length > 1 && !REFERENCE_DEFINITION.test(source)) {
      const kept = previous.blocks.length - 1;
      const boundary = previous.blocks[kept].startLine;
      const prefix = linesPrefix(previous.source, boundary);

      if (source.startsWith(prefix)) {
        this.stats.tailParses++;
        const tokens = this.md!.parse(lines.slice(boundary).join('\n'), {});
        for (const token of tokens) {
          if (token.map) token.map = [token.map[0] + boundary, token.map[1] + boundary];
        }
        return [...previous.blocks.slice(0, kept), ...this.groupTokensToBlocks(tokens, lines)];
      }
    }

    this.stats.fullParses++;
    return this.groupTokensToBlocks(this.md!.parse(source, {}), lines);
  }

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

  private renderBlock(block: ParsedBlock, env: RenderEnv, references: string): string {
    const key = `${block.hash}:${references}`;
    // Le bloc actif d'un flux change à chaque fragment : le mettre en cache
    // évincerait des blocs stables au profit d'états qui ne reviendront pas.
    if (!env.active) {
      const cached = this.blockCache.get(key);
      if (cached?.source === block.source) {
        this.stats.blockCacheHits++;
        return cached.html;
      }
    }

    this.stats.blockRenders++;
    const html = this.md!.renderer.render(block.tokens, this.md!.options, env);
    if (!env.active) this.blockCache.set(key, { source: block.source, html });
    return html;
  }
}

/** Contexte passé aux règles de rendu markdown-it (leur paramètre `env`). */
type RenderEnv = {
  /** Lignes du document, pour retrouver la fin d'un fence. */
  lines: string[];
  /** Dernier bloc d'un document en cours de génération. */
  active: boolean;
};

/** Une définition de référence (`[id]: url`, `[^note]:`) agit sur tout le document. */
const REFERENCE_DEFINITION = /^ {0,3}\[[^\]\n]+\]:/m;

/** Empreinte des lignes de définition de référence, vide s'il n'y en a pas. */
function referenceDefinitionsKey(source: string): string {
  const definitions = source.match(/^ {0,3}\[[^\]\n]+\]:.*$/gm);
  return definitions ? hashSource(definitions.join('\n')) : '';
}

/** Les `count` premières lignes de `source`, saut de ligne final compris. */
function linesPrefix(source: string, count: number): string {
  let index = 0;
  for (let line = 0; line < count; line++) {
    index = source.indexOf('\n', index) + 1;
    if (index === 0) return source;
  }
  return source.slice(0, index);
}

/**
 * Un fence du bloc actif que sa ligne de fermeture n'a pas encore atteint :
 * markdown-it le ferme lui-même à la fin du document, mais son contenu est
 * appelé à changer.
 */
function isOpenFence(token: MdToken, env: Partial<RenderEnv> | undefined): boolean {
  if (!env?.active || !env.lines || !token.map) return false;
  const [start, end] = token.map;
  // markdown-it ne compte pas les lignes blanches qui terminent le document.
  let lineCount = env.lines.length;
  while (lineCount > 0 && env.lines[lineCount - 1].trim() === '') lineCount--;
  if (end < lineCount) return false;
  if (end - 1 <= start) return true;
  const closing = /^\s*(`{3,}|~{3,})\s*$/.exec(env.lines[end - 1]);
  return !closing || closing[1][0] !== token.markup[0] || closing[1].length < token.markup.length;
}
