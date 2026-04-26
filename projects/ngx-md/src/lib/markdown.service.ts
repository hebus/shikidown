import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import MarkdownIt from 'markdown-it';
import type { BundledTheme, Highlighter, StringLiteralUnion } from 'shiki';
import { MARKDOWN_CONFIG } from './markdown.tokens';
import type { MarkdownConfig, MarkdownThemePair } from './markdown.config';

const DEFAULT_LANGUAGES = [
  'typescript', 'javascript', 'jsx', 'tsx',
  'html', 'css', 'scss',
  'json', 'yaml',
  'bash', 'shell',
  'markdown', 'sql',
  'python', 'rust', 'go',
];

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
        const safeLang = loadedLangs.has(lang as never) ? lang : 'text';
        try {
          if (useDualTheme) {
            return hl.codeToHtml(code, {
              lang: safeLang,
              themes: { dark: themes.dark, light: themes.light },
            });
          }
          return hl.codeToHtml(code, { lang: safeLang, theme: themes.dark });
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
  }

  async parseAsync(content: string): Promise<string> {
    await this.initialize();
    return this.md!.render(content);
  }

  /** Synchronous parse — only works after initialize() has resolved */
  parse(content: string): string {
    if (!this.md) throw new Error('[ngx-md] MarkdownService not initialized. Call parseAsync() first.');
    return this.md.render(content);
  }
}
