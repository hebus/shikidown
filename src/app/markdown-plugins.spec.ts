import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MarkdownService, provideMarkdown, type MarkdownItInstance } from 'shikidown';
import { copyCodePlugin } from './copy-code.plugin';

// `initialize()` only loads Shiki under isPlatformBrowser. Forcing the platform to
// 'server' keeps the highlighter's WASM out of these tests while still walking the
// whole markdown-it construction — which is where plugins are applied.
function serviceWith(plugins: Array<(md: MarkdownItInstance) => void>): MarkdownService {
  TestBed.configureTestingModule({
    providers: [{ provide: PLATFORM_ID, useValue: 'server' }, provideMarkdown({ plugins })],
  });
  return TestBed.inject(MarkdownService);
}

/** Avoids nesting backticks inside a template literal. */
const fence = (info: string, body: string): string => ['```' + info, body, '```'].join('\n');

describe('provideMarkdown plugins', () => {
  it('applies a plugin to the markdown-it instance', async () => {
    // Bracket access: `rules` is an index signature and
    // noPropertyAccessFromIndexSignature is on.
    const shout = (md: MarkdownItInstance): void => {
      md.renderer.rules['text'] = (tokens, idx) => tokens[idx].content.toUpperCase();
    };

    expect(await serviceWith([shout]).parseAsync('hello')).toContain('HELLO');
  });

  it('hands the plugin a usable markdown-it instance', async () => {
    // The point of the test: under markdown-it 15 the default export is a callable
    // const rather than a class. MarkdownItInstance has to stay inhabitable.
    const seen: MarkdownItInstance[] = [];
    await serviceWith([(md) => void seen.push(md)]).parseAsync('x');

    expect(seen).toHaveLength(1);
    expect(typeof seen[0].render).toBe('function');
    expect(typeof seen[0].use).toBe('function');
    expect(seen[0].renderer.rules).toBeDefined();
  });

  it('applies plugins in declaration order', async () => {
    const order: string[] = [];
    await serviceWith([() => void order.push('first'), () => void order.push('second')]).parseAsync('x');

    expect(order).toEqual(['first', 'second']);
  });

  it('keeps a plugin fence renderer alive under the mermaid override', async () => {
    // The service reassigns rules['fence'] *after* the plugins run, delegating to
    // whatever was there before. A plugin that decorates fences must survive it —
    // copyCodePlugin depends on exactly that.
    const html = await serviceWith([copyCodePlugin]).parseAsync(fence('ts', 'const a = 1;'));

    expect(html).toContain('class="code-block');
  });

  it('lets the mermaid fence win over the plugin', async () => {
    const html = await serviceWith([copyCodePlugin]).parseAsync(fence('mermaid', 'graph TD;\nA-->B;'));

    expect(html).toContain('class="mermaid"');
    expect(html).not.toContain('class="code-block');
  });
});
