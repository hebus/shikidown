import { computed, inject, Injectable, PLATFORM_ID, resource } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { VERSIONS } from '../app/app-version';

/**
 * Le manifeste de la dernière version publiée. Ce point d'accès du registre
 * répond avec `Access-Control-Allow-Origin: *` ; `/-/package/…/dist-tags`, plus
 * léger, ne le fait pas et serait bloqué par le navigateur.
 */
const LATEST_URL = 'https://registry.npmjs.org/shikidown/latest';

/**
 * Version de shikidown actuellement publiée sur npm, telle que la démo l'annonce.
 *
 * La constante `VERSIONS.lib` n'est mise à jour qu'au moment d'une release : la
 * démo, déployée depuis develop, peut annoncer une version qui n'est pas celle
 * qu'un `npm install` installerait. Le registre fait foi ; la constante reste la
 * valeur affichée tant qu'il n'a pas répondu, ou s'il est injoignable.
 */
@Injectable({ providedIn: 'root' })
export class PublishedVersionService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly latest = resource({
    loader: async ({ abortSignal }) => {
      if (!isPlatformBrowser(this.platformId)) return undefined;
      const response = await fetch(LATEST_URL, { signal: abortSignal });
      if (!response.ok) return undefined;
      const { version } = (await response.json()) as { version?: unknown };
      return typeof version === 'string' ? version : undefined;
    },
  });

  readonly version = computed(() => (this.latest.hasValue() ? this.latest.value() : undefined) ?? VERSIONS.lib);
}
