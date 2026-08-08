import { DOCUMENT } from '@angular/common';
import { inject, isDevMode } from '@angular/core';

/** Where the documentation site runs under `npm run dev`, from the `docs/` project. */
const DOCS_DEV_SERVER = 'http://localhost:3000/';

/**
 * Links out of the demo application and into the documentation site.
 *
 * Once deployed, the demo is published under `<base>/demo/`, one level below the Fumadocs site that
 * owns the root of GitHub Pages — so resolving against `document.baseURI` rather than hardcoding
 * the deployed URL keeps these links correct wherever the site is published, including a fork under
 * a different repository name.
 *
 * Under `ng serve` there is no site above the demo: the documentation is a separate project on its
 * own port. Resolving relatively there would silently send visitors back to the demo itself, so the
 * dev server is used instead.
 */
export function siteLinks(): { home: string; docs: string } {
  const { baseURI } = inject(DOCUMENT);

  if (isDevMode()) {
    return { home: DOCS_DEV_SERVER, docs: `${DOCS_DEV_SERVER}docs/` };
  }

  return {
    home: new URL('../', baseURI).href,
    docs: new URL('../docs/', baseURI).href,
  };
}
