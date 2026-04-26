import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
      <nav class="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">

        <!-- Logo -->
        <a routerLink="/" class="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-lg">
          <span class="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white text-sm font-black">M</span>
          <span>shikidown</span>
          <span class="hidden sm:inline text-xs font-normal text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">v1.0</span>
        </a>

        <!-- Links -->
        <ul class="hidden sm:flex items-center gap-1 text-sm">
          @for (link of navLinks; track link.path) {
            <li>
              <a
                [routerLink]="link.path"
                routerLinkActive="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                [routerLinkActiveOptions]="{ exact: link.path === '/' }"
                class="rounded-md px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >{{ link.label }}</a>
            </li>
          }
        </ul>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            (click)="toggleDark()"
            class="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            [attr.aria-label]="isDark() ? 'Activer le mode clair' : 'Activer le mode sombre'"
          >
            @if (isDark()) { ☀️ } @else { 🌙 }
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener"
            class="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="GitHub"
          >⭐</a>
        </div>
      </nav>
    </header>
  `,
})
export class NavbarComponent {
  private readonly doc = inject(DOCUMENT);

  readonly navLinks = [
    { label: 'Accueil',    path: '/' },
    { label: 'Guide',      path: '/guide' },
    { label: 'Composants', path: '/components' },
    { label: 'Playground', path: '/playground' },
  ];

  readonly isDark = signal(false);

  constructor() {
    const prefersDark = this.doc.documentElement.classList.contains('dark')
      || (!('dark' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    this.isDark.set(prefersDark);
    this.applyTheme(prefersDark);
  }

  toggleDark(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    this.applyTheme(next);
    localStorage.setItem('dark', String(next));
  }

  private applyTheme(dark: boolean): void {
    this.doc.documentElement.classList.toggle('dark', dark);
  }
}
