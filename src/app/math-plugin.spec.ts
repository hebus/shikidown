import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MarkdownService, provideMarkdown } from 'shikidown';
import { katexPlugin } from 'shikidown/math';

async function service(): Promise<MarkdownService> {
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: 'server' },
      provideMarkdown({ plugins: [katexPlugin()], repair: { math: true } }),
    ],
  });
  return TestBed.inject(MarkdownService);
}

describe('katexPlugin', () => {
  it('renders inline and block formulas, with MathML', async () => {
    const html = await (await service()).parseAsync('Soit $x^2$.\n\n$$\n\\frac{a}{b}\n$$');
    expect(html).toContain('class="katex"');
    expect(html).toContain('<math');
    expect(html).toContain('katex-block');
  });

  it('shows an invalid formula without breaking the document', async () => {
    const html = await (await service()).parseAsync('Avant $\\frac{a}{$ après\n\nSuite');
    expect(html).toContain('Suite');
  });

  it('hides a formula that is still being streamed', async () => {
    const md = await service();
    const { blocks } = await md.renderBlocksAsync('Soit $\\frac{a', { streaming: true });
    expect(blocks[0].html).not.toContain('frac');

    const block = await md.renderBlocksAsync('$$\n\\frac{a}{b}', { streaming: true });
    expect(block.blocks[0].html).toContain('katex-block');
  });
});
