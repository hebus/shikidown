import { TestBed } from '@angular/core/testing';
import { type BlockParseState, MarkdownService, provideMarkdown } from 'shikidown';
import { chunk, type ChunkStrategy, CORPUS, LONG_ANSWER, prefixes } from './testing/streaming-fixtures';

const FENCE = '```';

async function service(): Promise<MarkdownService> {
  TestBed.configureTestingModule({ providers: [provideMarkdown()] });
  const md = TestBed.inject(MarkdownService);
  await md.initialize();
  return md;
}

const html = (blocks: { html: string }[]) => blocks.map((b) => b.html).join('');

describe('MarkdownService.renderBlocksAsync', () => {
  describe('incremental parsing', () => {
    // Le parsing de la seule fin du document doit être indiscernable d'un parsing
    // complet, à chaque étape du flux et quel que soit le découpage.
    const cases: Array<[string, ChunkStrategy]> = Object.keys(CORPUS).flatMap((name) =>
      (['char', 'word', 'random'] as const).map((s): [string, ChunkStrategy] => [name, s]),
    );

    it.each(cases)('matches a full parse for %s split by %s', async (name, strategy) => {
      const md = await service();
      let previous: BlockParseState | undefined;
      for (const prefix of prefixes(chunk(CORPUS[name], strategy))) {
        for (const streaming of [false, true]) {
          const incremental = await md.renderBlocksAsync(prefix, { previous, streaming });
          const full = await md.renderBlocksAsync(prefix, { streaming });
          expect(html(incremental.blocks), `after ${JSON.stringify(prefix.slice(-30))}`).toBe(html(full.blocks));
          if (!streaming) previous = incremental.state;
        }
      }
    }, 60_000);

    it('renders the final document the same whatever the chunking', async () => {
      const md = await service();
      const finals = new Set<string>();
      for (const strategy of ['char', 'word', 'line', 'random'] as const) {
        let previous: BlockParseState | undefined;
        for (const prefix of prefixes(chunk(LONG_ANSWER, strategy))) {
          previous = (await md.renderBlocksAsync(prefix, { previous, streaming: true })).state;
        }
        finals.add(html((await md.renderBlocksAsync(LONG_ANSWER, { previous })).blocks));
      }
      expect(finals.size).toBe(1);
      expect([...finals][0]).toBe(html(await md.parseBlocksAsync(LONG_ANSWER)));
    }, 60_000);

    it('only reparses the tail of an appended document', async () => {
      const md = await service();
      let previous: BlockParseState | undefined;
      md.resetStats();
      for (const prefix of prefixes(chunk(LONG_ANSWER, 'word'))) {
        previous = (await md.renderBlocksAsync(prefix, { previous, streaming: true })).state;
      }
      const stats = md.getStats();
      // Un parsing complet tant que le document n'a qu'un bloc, puis la fin seulement.
      expect(stats.fullParses).toBeLessThan(20);
      expect(stats.tailParses).toBeGreaterThan(stats.fullParses * 50);
    });

    it('falls back to a full parse when a reference definition appears', async () => {
      const md = await service();
      const first = await md.renderBlocksAsync('Voir [la doc][doc].\n\nSuite');
      md.resetStats();
      const next = await md.renderBlocksAsync('Voir [la doc][doc].\n\nSuite\n\n[doc]: https://angular.dev', {
        previous: first.state,
      });
      expect(md.getStats().fullParses).toBe(1);
      expect(next.blocks[0].html).toContain('href="https://angular.dev"');
    });

    it('falls back to a full parse when the beginning changed', async () => {
      const md = await service();
      const first = await md.renderBlocksAsync('# Un\n\nDeux');
      md.resetStats();
      const next = await md.renderBlocksAsync('# Zéro\n\nDeux', { previous: first.state });
      expect(md.getStats().fullParses).toBe(1);
      expect(next.blocks[0].html).toContain('Zéro');
    });
  });

  describe('streaming', () => {
    it('repairs the end of the document', async () => {
      const md = await service();
      const { blocks } = await md.renderBlocksAsync('Du **gras en cours', { streaming: true });
      expect(blocks[0].html).toContain('<strong>gras en cours</strong>');
    });

    it('does not repair once the stream is over', async () => {
      const md = await service();
      const { blocks } = await md.renderBlocksAsync('Du **gras en cours');
      expect(blocks[0].html).toContain('**gras en cours');
    });

    it('defers highlighting until the fence closes', async () => {
      const md = await service();
      const open = [FENCE + 'ts', 'const answer = 42;'].join('\n');
      md.resetStats();

      const pending = await md.renderBlocksAsync(open, { streaming: true });
      expect(md.getStats().highlights).toBe(0);
      expect(pending.blocks[0].html).toContain('class="shiki');
      expect(pending.blocks[0].html).toContain('const answer = 42;');

      await md.renderBlocksAsync(`${open}\n${FENCE}`, { streaming: true });
      expect(md.getStats().highlights).toBe(1);
    });

    it('highlights an unclosed fence once the stream is over', async () => {
      const md = await service();
      md.resetStats();
      await md.renderBlocksAsync([FENCE + 'ts', 'const a = 1;'].join('\n'));
      expect(md.getStats().highlights).toBe(1);
    });

    it('highlights each closed block once over a whole stream', async () => {
      const md = await service();
      const fences = (LONG_ANSWER.match(/^```(typescript|bash)$/gm) ?? []).length;
      let previous: BlockParseState | undefined;
      md.resetStats();
      for (const prefix of prefixes(chunk(LONG_ANSWER, 'word'))) {
        previous = (await md.renderBlocksAsync(prefix, { previous, streaming: true })).state;
      }
      // Le corpus répète les mêmes blocs : le cache de coloration les sert.
      expect(md.getStats().highlights).toBeLessThanOrEqual(fences);
    });

    it('shows a mermaid diagram as code until its fence closes', async () => {
      const md = await service();
      const open = [FENCE + 'mermaid', 'graph TD;', 'A-->B;'].join('\n');
      const pending = await md.renderBlocksAsync(open, { streaming: true });
      expect(pending.blocks[0].html).not.toContain('class="mermaid"');
      expect(pending.blocks[0].html).toContain('graph TD;');

      const done = await md.renderBlocksAsync(`${open}\n${FENCE}`, { streaming: true });
      expect(done.blocks[0].html).toContain('class="mermaid"');
    });

    it('does not cache the active block', async () => {
      const md = await service();
      await md.renderBlocksAsync('Un\n\nDeux', { streaming: true });
      md.resetStats();
      await md.renderBlocksAsync('Un\n\nDeux', { streaming: true });
      expect(md.getStats()).toMatchObject({ blockCacheHits: 1, blockRenders: 1 });
    });

    it('abandons a cancelled request', async () => {
      const md = await service();
      const controller = new AbortController();
      controller.abort();
      await expect(md.renderBlocksAsync('x', { signal: controller.signal })).rejects.toThrow();
    });
  });
});
