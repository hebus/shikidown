export const appName = 'shikidown';
export const appDescription =
  'Angular Markdown renderer with Shiki syntax highlighting, Angular component embedding, and incremental block rendering.';

export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
  user: 'hebus',
  repo: 'shikidown',
  branch: 'develop',
};

/** Where the MDX sources live, relative to the repository root — used by the "edit this page" link. */
export const contentDir = 'docs/content/docs';

export const siteUrl = `https://${gitConfig.user}.github.io/${gitConfig.repo}`;
export const npmUrl = `https://www.npmjs.com/package/${gitConfig.repo}`;

/**
 * Empty in development, `/shikidown` on GitHub Pages. Next.js prefixes `next/link` and asset URLs
 * with it automatically, but not plain anchors pointing at files served from `public/`.
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * The Angular demo application.
 *
 * It is not a Next.js route: the demo is built separately and copied into `public/demo` before
 * `next build`, so it must be linked with a plain anchor.
 *
 * In development that copy does not exist — it is gitignored, and the demo runs on its own dev
 * server instead. `next dev` would also not resolve `/demo/` to `/demo/index.html`, since it serves
 * `public/` without directory indexes. So the link points at `ng serve` while developing, and at
 * the published copy everywhere else.
 */
export const demoUrl =
  process.env.NODE_ENV === 'development' ? 'http://localhost:4200/' : `${basePath}/demo/`;
