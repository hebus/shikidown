/**
 * Versions the demo advertises to visitors.
 *
 * These used to be written out at every mention — the navbar badge, the home page hero, the
 * playground tables — and drifted apart: the badge still read `v1.0` at 2.3.0, and the hero
 * promoted Angular 21 well into Angular 22. One constant means one place to edit at release time.
 *
 * `lib` tracks `projects/shikidown/package.json` and is updated by `npm run release`. The navbar
 * badge only falls back to it: it shows the version actually published on npm
 * (PublishedVersionService), which is what `npm install` gets. The playground samples use it as is.
 * Reading package.json directly would remove the duplication, but the file sits outside `src/`
 * and pulling it in widens the tsconfig for a single string.
 */
export const VERSIONS = {
  lib: '2.5.2',
  angular: '22',
  shiki: '4',
  /** Both majors are supported — the peer range is `>=14.0.0`. */
  markdownIt: '14 / 15',
  tailwind: '4',
} as const;
