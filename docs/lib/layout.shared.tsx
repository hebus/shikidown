import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, demoUrl, gitConfig, npmUrl } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-md bg-fd-primary text-fd-primary-foreground text-xs font-black"
          >
            S
          </span>
          <span className="font-semibold">{appName}</span>
        </>
      ),
    },
    links: [
      {
        text: 'Documentation',
        url: '/docs',
        active: 'nested-url',
      },
      {
        text: 'Demo',
        url: demoUrl,
        external: true,
      },
      {
        text: 'npm',
        url: npmUrl,
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
