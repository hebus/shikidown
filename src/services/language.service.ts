import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Lang = 'fr' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly lang = signal<Lang>(
    isPlatformBrowser(this.platformId)
      ? ((localStorage.getItem('lang') as Lang) ?? 'fr')
      : 'fr'
  );

  toggle(): void {
    const next: Lang = this.lang() === 'fr' ? 'en' : 'fr';
    this.lang.set(next);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', next);
    }
  }
}
