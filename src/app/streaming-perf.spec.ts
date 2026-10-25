import { TestBed } from '@angular/core/testing';
import { type BlockParseState, MarkdownService, type MarkdownStats, provideMarkdown } from 'shikidown';
import { chunk, LONG_ANSWER, LLM_ANSWER, PYTHON_HEAVY, prefixes } from './testing/streaming-fixtures';

/**
 * Mesures de performance du streaming. Les temps sont indicatifs (ils dépendent
 * de la machine) et seulement affichés ; les compteurs de travail, eux, sont
 * déterministes et vérifiés.
 *
 * Référence v2.5.1, flux mot par mot (`parseBlocksAsync` sans état) :
 * court ≈ 520 ms, long ≈ 1 780 ms, gros bloc Python ≈ 2 260 ms.
 */

/** Le builder Angular masque `console.log` des specs : on écrit directement sur stdout. */
function report(results: object): void {
  const out = (globalThis as { process?: { stdout?: { write(s: string): void } } }).process?.stdout;
  out?.write(`[bench] ${JSON.stringify(results)}\n`);
}

async function service(): Promise<MarkdownService> {
  TestBed.configureTestingModule({ providers: [provideMarkdown()] });
  const md = TestBed.inject(MarkdownService);
  await md.initialize();
  return md;
}

interface Run {
  ms: number;
  stats: MarkdownStats;
}

/** Rejoue `doc` mot par mot, comme `<shikidown>` le recevrait d'un LLM. */
async function stream(md: MarkdownService, doc: string, incremental: boolean): Promise<Run> {
  md.clearCache();
  md.resetStats();
  let previous: BlockParseState | undefined;
  const start = performance.now();
  for (const text of prefixes(chunk(doc, 'word'))) {
    if (incremental) {
      previous = (await md.renderBlocksAsync(text, { previous, streaming: true })).state;
    } else {
      await md.parseBlocksAsync(text);
    }
  }
  await md.renderBlocksAsync(doc, { previous });
  return { ms: Math.round(performance.now() - start), stats: md.getStats() };
}

describe('streaming performance', () => {
  const docs = { short: LLM_ANSWER, long: LONG_ANSWER, code: PYTHON_HEAVY };

  it('does less work with the streaming path than with the v2 path', async () => {
    const md = await service();
    const results: Record<string, { v2: Run; streaming: Run }> = {};

    for (const [name, doc] of Object.entries(docs)) {
      results[name] = { v2: await stream(md, doc, false), streaming: await stream(md, doc, true) };
    }
    report(
      Object.fromEntries(
        Object.entries(results).map(([name, { v2, streaming }]) => [
          name,
          {
            v2: `${v2.ms} ms, ${v2.stats.highlights} highlights, ${v2.stats.fullParses} full parses`,
            streaming: `${streaming.ms} ms, ${streaming.stats.highlights} highlights, ${streaming.stats.fullParses} full / ${streaming.stats.tailParses} tail parses`,
          },
        ]),
      ),
    );

    // Un bloc de code n'est coloré qu'une fois fermé, et une seule fois.
    expect(results['code'].streaming.stats.highlights).toBe(2);
    expect(results['code'].v2.stats.highlights).toBeGreaterThan(100);
    for (const { v2, streaming } of Object.values(results)) {
      expect(streaming.stats.highlights).toBeLessThanOrEqual(v2.stats.highlights);
      expect(streaming.stats.fullParses).toBeLessThan(v2.stats.fullParses);
    }
  }, 120_000);
});
