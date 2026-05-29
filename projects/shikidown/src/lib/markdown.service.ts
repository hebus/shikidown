import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import MarkdownIt from 'markdown-it';
import type { BundledTheme, Highlighter, StringLiteralUnion } from 'shiki';
import { MARKDOWN_CONFIG } from './markdown.tokens';
import type { MarkdownConfig, MarkdownThemePair } from './markdown.config';
import { type MdToken, type ParsedBlock, type RenderedBlock, hashSource } from './markdown.types';

const DEFAULT_LANGUAGES = [
  'typescript', 'javascript', 'jsx', 'tsx',
  'html', 'css', 'scss',
  'json', 'yaml',
  'bash', 'shell',
  'markdown', 'sql',
  'python', 'rust', 'go',
];

const DEFAULT_CACHE_CAPACITY = 256;

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

  private md: MarkdownIt | null = null;
  private highlighter: Highlighter | null = null;
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
    const langs = this.config.languages ?? DEFAULT_LANGUAGES;

    let highlightFn: ((code: string, lang: string) => string) | undefined;

    if (isPlatformBrowser(this.platformId)) {
      const { createHighlighter } = await import('shiki');
      this.highlighter = await createHighlighter({
        themes: [themes.dark, ...(themes.light !== themes.dark ? [themes.light] : [])],
        langs,
      });

      const hl = this.highlighter;
      const loadedLangs = new Set(hl.getLoadedLanguages());
      const useDualTheme = themes.dark !== themes.light;

      highlightFn = (code: string, lang: string): string => {
        if (!lang || !loadedLangs.has(lang as never)) return '';
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

    for (const plugin of this.config.plugins ?? []) {
      (plugin as (md: MarkdownIt) => void)(this.md);
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
