import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// Empty in development, `/shikidown` on GitHub Pages — see .github/workflows/deploy-gh-pages.yml.
// Next.js rejects a trailing slash here.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
  // Without this, Next.js walks up and finds the Angular workspace lockfile at the repository root.
  turbopack: { root: import.meta.dirname },
  basePath,
  // GitHub Pages resolves `/docs/` to `/docs/index.html`, never to `/docs.html`.
  trailingSlash: true,
  // The image optimizer is a server feature, unavailable in a static export.
  images: { unoptimized: true },
};

export default withMDX(config);
