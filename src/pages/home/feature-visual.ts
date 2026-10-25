import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarkdownComponent } from 'shikidown';
import type { FeatureIcon, HomeContent } from './home-content';

/**
 * Illustration en tête de chaque carte de fonctionnalité. Plutôt que des images,
 * de petites mises en scène — dont plusieurs rendues par shikidown lui-même :
 * le code est coloré par Shiki, la formule par KaTeX, le compteur est un vrai
 * composant Angular embarqué dans du Markdown.
 *
 * Les illustrations purement décoratives sont masquées aux lecteurs d'écran : le
 * texte de la carte porte l'information.
 */
@Component({
  selector: 'app-feature-visual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  host: { class: 'block' },
  template: `
    <div class="relative flex h-44 items-center justify-center overflow-hidden rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-5">
      @switch (kind()) {
        @case ('stream') {
          <div class="flex w-full max-w-lg flex-col gap-3" aria-hidden="true">
            <div class="self-end rounded-2xl rounded-br-sm bg-indigo-600 px-3.5 py-2 text-sm text-white shadow">{{ labels().question }}</div>
            <div class="self-start rounded-2xl rounded-bl-sm border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-200 shadow-sm">
              {{ labels().answerStart }} <strong class="text-gray-900 dark:text-white">{{ labels().answerBold }}</strong><span class="ml-0.5 text-indigo-500">▍</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <code class="rounded-md bg-rose-100 dark:bg-rose-500/15 px-2 py-1 text-rose-700 dark:text-rose-300 line-through decoration-rose-400/70">**{{ labels().answerBold }}</code>
              <span class="text-gray-400">→</span>
              <span class="rounded-md bg-emerald-100 dark:bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-700 dark:text-emerald-300">{{ labels().answerBold }}</span>
              <span class="text-gray-500 dark:text-gray-400">{{ labels().repaired }}</span>
            </div>
          </div>
        }
        @case ('component') {
          <!-- Interactif : un vrai composant, embarqué via le Markdown. -->
          <shikidown [content]="labels().counter" class="block" />
        }
        @case ('code') {
          <shikidown
            [content]="labels().code"
            class="prose prose-sm prose-slate dark:prose-invert w-full max-w-none [&_pre]:my-0"
            aria-hidden="true"
          />
        }
        @case ('diagram') {
          <div class="flex w-full items-center justify-around gap-6" aria-hidden="true">
            <svg viewBox="0 0 240 90" class="h-24 w-auto text-indigo-500 dark:text-indigo-400">
              <defs>
                <marker id="feature-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 0 10 5 0 10z" fill="currentColor" />
                </marker>
              </defs>
              <rect x="2" y="30" width="56" height="30" rx="15" fill="none" stroke="currentColor" stroke-width="2" />
              <rect x="92" y="6" width="56" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="2" />
              <rect x="92" y="54" width="56" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="2" />
              <rect x="182" y="30" width="56" height="30" rx="6" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2" />
              <path d="M58 40 90 22M58 50 90 68M148 21 180 40M148 69 180 50" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#feature-arrow)" />
            </svg>
            <shikidown [content]="labels().formula" class="prose prose-slate dark:prose-invert max-w-none" />
          </div>
        }
        @case ('feather') {
          <div class="w-full max-w-lg space-y-2.5 text-xs" aria-hidden="true">
            @for (bar of labels().bundle; track bar.label; let first = $first) {
              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-right text-gray-600 dark:text-gray-300">{{ bar.label }}</span>
                <span
                  class="h-3.5 rounded-full"
                  [style.width.%]="bar.width"
                  [class]="first ? 'bg-linear-to-r from-indigo-500 to-fuchsia-500' : 'border border-dashed border-indigo-300 dark:border-indigo-500/50 bg-indigo-100/60 dark:bg-indigo-500/10'"
                ></span>
              </div>
            }
            <p class="pl-31 text-gray-500 dark:text-gray-400">{{ labels().lazyNote }}</p>
          </div>
        }
        @case ('shield') {
          <div class="w-full max-w-md space-y-2 font-mono text-[11px] leading-relaxed" aria-hidden="true">
            <div class="flex items-center gap-2 rounded-lg bg-rose-100/80 dark:bg-rose-500/10 px-3 py-2 text-rose-700 dark:text-rose-300">
              <span class="font-sans font-bold">✕</span>
              <span class="truncate line-through decoration-rose-400/70">&lt;img src="x" onerror="alert(1)"&gt;</span>
            </div>
            <div class="flex items-center gap-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
              <span class="font-sans font-bold">✓</span>
              <span class="truncate">&lt;img src="x"&gt;</span>
            </div>
            <div class="flex items-center gap-2 rounded-lg bg-rose-100/80 dark:bg-rose-500/10 px-3 py-2 text-rose-700 dark:text-rose-300">
              <span class="font-sans font-bold">✕</span>
              <span class="truncate line-through decoration-rose-400/70">[lien](javascript:steal())</span>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class FeatureVisualComponent {
  readonly kind = input.required<FeatureIcon>();
  readonly labels = input.required<HomeContent['visuals']>();
}
