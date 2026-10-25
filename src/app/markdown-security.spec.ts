import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { isSafeUrl, type MarkdownConfig, MarkdownService, provideMarkdown, sanitizeHtml } from 'shikidown';

// Plateforme serveur : le filtrage ne dépend pas de Shiki, ni du DOM.
async function render(markdown: string, config: MarkdownConfig = {}): Promise<string> {
  TestBed.configureTestingModule({
    providers: [{ provide: PLATFORM_ID, useValue: 'server' }, provideMarkdown(config)],
  });
  return TestBed.inject(MarkdownService).parseAsync(markdown);
}

describe('sanitizeHtml', () => {
  it.each([
    ['<script>alert(1)</script>texte', 'texte'],
    ['<img src="x.png" onerror="alert(1)">', '<img src="x.png">'],
    ['<a href="javascript:alert(1)">lien</a>', '<a>lien</a>'],
    ['<a href="jav&#x61;script:alert(1)">lien</a>', '<a>lien</a>'],
    ['<a href="java\tscript:alert(1)">lien</a>', '<a>lien</a>'],
    ['<a href=" JAVASCRIPT:alert(1)">lien</a>', '<a>lien</a>'],
    ['<iframe src="https://evil.example"></iframe>après', 'après'],
    ['<style>body{display:none}</style>', ''],
    ['<svg onload="alert(1)"><circle /></svg>', ''],
    ['<form action="https://evil.example"><input name="pwd"></form>', ''],
    ['<div style="position:fixed">x</div>', '<div>x</div>'],
    ['<!-- commentaire -->texte', 'texte'],
    ['<p title=\'a "b"\'>x</p>', '<p title="a &quot;b&quot;">x</p>'],
  ])('neutralises %j', (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });

  it.each([
    '<strong class="x">gras</strong>',
    '<a href="https://angular.dev">doc</a>',
    '<a href="#section">ancre</a>',
    '<a href="/relatif">relatif</a>',
    '<a href="mailto:a@b.c">mail</a>',
    '<img src="data:image/png;base64,AAAA" alt="pixel">',
    '<details open><summary>Plus</summary>contenu</details>',
    '<td colspan="2" aria-label="cellule">x</td>',
  ])('keeps %j', (input) => {
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('keeps custom elements with their attributes, minus handlers', () => {
    expect(sanitizeHtml('<demo-alert type="info" title="Note" onclick="x()"></demo-alert>')).toBe(
      '<demo-alert type="info" title="Note"></demo-alert>',
    );
  });

  it('validates URL attributes on custom elements too', () => {
    expect(sanitizeHtml('<demo-link href="javascript:alert(1)"></demo-link>')).toBe('<demo-link></demo-link>');
  });

  it('restricts custom elements to an allow-list when given one', () => {
    const options = { customElements: ['demo-alert'] };
    expect(sanitizeHtml('<demo-alert></demo-alert><other-el>x</other-el>', options)).toBe(
      '<demo-alert></demo-alert>x',
    );
  });

  it('forces rel=noopener on links that open a new tab', () => {
    expect(sanitizeHtml('<a href="https://a.b" target="_blank" rel="opener">x</a>')).toBe(
      '<a href="https://a.b" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });

  it('escapes a tag that is not terminated', () => {
    expect(sanitizeHtml('<img src=x onerror=alert(1)')).toBe('&lt;img src=x onerror=alert(1)');
  });

  it('honours extra options', () => {
    expect(sanitizeHtml('<div style="color:red">x</div>', { allowStyle: true })).toBe('<div style="color:red">x</div>');
    expect(sanitizeHtml('<center>x</center>', { allowedTags: ['center'] })).toBe('<center>x</center>');
    expect(isSafeUrl('ftp://a.b')).toBe(false);
    expect(isSafeUrl('ftp://a.b', ['ftp'])).toBe(true);
  });
});

describe('MarkdownService HTML policy', () => {
  it('sanitizes raw HTML by default', async () => {
    const html = await render('Texte <img src="x.png" onerror="alert(1)">\n\n<div onclick="x()">bloc</div>');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).toContain('<img src="x.png">');
    expect(html).toContain('<div>bloc</div>');
  });

  it('keeps embedded components', async () => {
    const html = await render('<demo-counter initial-count="3"></demo-counter>');
    expect(html).toContain('<demo-counter initial-count="3"></demo-counter>');
  });

  it('refuses dangerous markdown links and images', async () => {
    const html = await render('[a](javascript:alert(1)) [b](vbscript:x) ![c](file:///etc/passwd)');
    expect(html).not.toMatch(/href="(javascript|vbscript)/);
    expect(html).not.toContain('<img');
  });

  it('applies the configured protocol list to markdown links', async () => {
    const html = await render('[ftp](ftp://a.b/c)', { sanitize: { allowedProtocols: ['https', 'ftp'] } });
    expect(html).toContain('href="ftp://a.b/c"');
  });

  it('escapes raw HTML with the escape policy', async () => {
    const html = await render('<b>gras</b>', { htmlPolicy: 'escape' });
    expect(html).toContain('&lt;b&gt;gras&lt;/b&gt;');
  });

  it('inserts raw HTML untouched with the trusted policy', async () => {
    const html = await render('<div onclick="x()">bloc</div>', { htmlPolicy: 'trusted' });
    expect(html).toContain('onclick="x()"');
  });

  it('escapes markup inside a mermaid fence', async () => {
    const html = await render(['```mermaid', 'graph TD;', 'A[<img src=x onerror=alert(1)>]-->B;', '```'].join('\n'));
    expect(html).not.toContain('<img');
  });
});
