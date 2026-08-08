# shikidown documentation site

The official documentation for [shikidown](https://www.npmjs.com/package/shikidown), built with
[Fumadocs](https://fumadocs.dev) on Next.js and published as a **static export** to GitHub Pages.

This is a standalone npm project. It is not part of the Angular workspace at the repository root
and has its own `package.json` and lockfile.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
```

The Angular demo application is developed separately, from the repository root (`npm start`, on
port 4200). The two sites only become one under `next build`, so in development the links between
them point at each other's dev server — `lib/shared.ts` here, `src/app/site-links.ts` on the
Angular side. Nothing to start in a particular order, and no dead links either way.

## Writing documentation

Pages are MDX files under `content/docs`, and sidebar order comes from the `meta.json` next to
them. Beyond the [Fumadocs defaults](https://fumadocs.dev/docs/ui/components), these components are
available in MDX without importing them: `Steps` / `Step`, `Tabs` / `Tab`, `TypeTable`,
`Accordions` / `Accordion`, and `Mermaid` — see `components/mdx.tsx`.

Project-wide values — site name, repository, npm URL, the path the demo is served from — live in
`lib/shared.ts`.

## Deployment

`.github/workflows/deploy-gh-pages.yml` publishes the whole site on every push to `develop`:

1. the Angular demo is built with `--base-href /shikidown/demo/`;
2. its output is copied to `docs/public/demo`, which Next.js then copies verbatim into `out/`;
3. this site is exported with `NEXT_PUBLIC_BASE_PATH=/shikidown`;
4. `docs/out` is uploaded as the GitHub Pages artifact.

The build order matters: `public/` is read while Next.js builds, so the demo has to exist first.

| Path | Served from |
|---|---|
| `/shikidown/` | this site's landing page |
| `/shikidown/docs/` | this site's documentation |
| `/shikidown/demo/` | the Angular demo, using hash routing |

Search is Orama running in the browser: the index is pre-computed into `out/api/search` at build
time, so no server is involved.
