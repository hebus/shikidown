import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type Lang = 'fr' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);

  readonly lang = signal<Lang>(
    isPlatformBrowser(this.platformId)
      ? ((localStorage.getItem('lang') as Lang) ?? 'fr')
      : 'fr'
  );

  constructor() {
    // index.html hardcodes lang="fr", so the document contradicted the UI as soon as
    // a visitor switched to English — and stayed wrong on reload for anyone whose
    // stored preference is English. Screen readers pick their voice from this.
    effect(() => {
      this.doc.documentElement.lang = this.lang();
    });
  }

  toggle(): void {
    const next: Lang = this.lang() === 'fr' ? 'en' : 'fr';
    this.lang.set(next);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', next);
    }
  }
}
