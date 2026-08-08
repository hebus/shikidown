import { Injectable } from '@angular/core';
import MarkdownIt from 'markdown-it';
import { createHighlighter, type Highlighter } from 'shiki';

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  private highlighter?: Highlighter;

  // Configuration de markdown-it avec support HTML pour les Web Components
  private readonly md = new MarkdownIt({
    html: true,
    linkify: true,
    highlight: (code: string, lang: string): string => {
      if (this.highlighter) {
        return this.highlighter.codeToHtml(code, {
          lang: lang || 'typescript',
          theme: "poimandres"
        });
      }
      return `<pre><code>${code}</code></pre>`; // Fallback si Shiki n'est pas prêt
    }
  });

  async getRenderer(): Promise<MarkdownIt> {
    if (!this.highlighter) {
      this.highlighter = await createHighlighter({
        themes: ['github-dark', 'poimandres'],
        langs: ['typescript', 'html', 'css']
      });
    }
    return this.md;
  }
}