import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';

/**
 * Links out of the demo application and into the documentation site.
 *
 * The demo is published under `<base>/demo/`, one level below the Fumadocs site that owns the root
 * of GitHub Pages. Resolving against `document.baseURI` rather than hardcoding the deployed URL
 * keeps these links correct wherever the site is published — including a fork under a different
 * repository name.
 *
 * Under `ng serve` the base href is `/`, so both links point back at the dev server; the
 * documentation runs separately on `http://localhost:3000` during development.
 */
export function siteLinks(): { home: string; docs: string } {
  const { baseURI } = inject(DOCUMENT);

  return {
    home: new URL('../', baseURI).href,
    docs: new URL('../docs/', baseURI).href,
  };
}
