'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Renders a Mermaid diagram inside MDX.
 *
 * `mermaid` is only imported on the client, and only when a diagram is actually mounted, so pages
 * without one never download it.
 */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '');
  const container = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { default: mermaid } = await import('mermaid');

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        fontFamily: 'inherit',
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      });

      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, chart.trim(), container.current!);
        if (!cancelled) setSvg(svg);
      } catch (error) {
        console.error('[docs] failed to render Mermaid diagram', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, id, resolvedTheme]);

  return (
    // No `role` here: the container is empty until the SVG lands, and an `img` role without an
    // accessible name fails an audit. Mermaid emits its own <title>/aria-roledescription on the SVG.
    <div
      ref={container}
      className="my-6 flex justify-center overflow-x-auto rounded-xl border border-fd-border bg-fd-card p-4 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
