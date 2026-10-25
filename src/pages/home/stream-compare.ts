import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  untracked,
} from '@angular/core';
import { MarkdownComponent } from 'shikidown';
import { StreamPlayback } from '../../app/stream-simulator';
import type { HomeContent } from './home-content';
import { whenVisible } from './when-visible';

/**
 * Le même flux, coupé aux mêmes endroits, rendu deux fois : en Markdown classique
 * (recalcul de chaque fragment, sans réparation) et par shikidown en streaming.
 * Les deux panneaux lisent le même signal, la comparaison est donc exacte.
 *
 * Chaque panneau rend aussi le texte complet, invisible, dans la même cellule de
 * grille : il prend sa hauteur finale dès le départ, sans barre de défilement.
 */
@Component({
  selector: 'app-stream-compare',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  host: { class: 'block' },
  template: `
    <div class="grid gap-5 md:grid-cols-2">
      <figure class="flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900">
        <figcaption class="border-b border-gray-200 dark:border-white/10 px-5 py-3">
          <span class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <span class="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true"></span>{{ labels().before }}
          </span>
          <span class="mt-0.5 block text-xs text-gray-600 dark:text-gray-400">{{ labels().beforeDesc }}</span>
        </figcaption>
        <div class="grid px-5 py-4">
          <shikidown [content]="source()" [class]="ghostClass" aria-hidden="true" inert />
          <shikidown
            [content]="playback.text()"
            [incremental]="true"
            class="prose prose-sm prose-slate dark:prose-invert max-w-none [grid-area:1/1]"
          />
        </div>
      </figure>

      <figure class="flex flex-col overflow-hidden rounded-2xl border border-indigo-300 dark:border-indigo-500/40 bg-white dark:bg-gray-900 shadow-xl shadow-indigo-500/10">
        <figcaption class="border-b border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 px-5 py-3">
          <span class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <span class="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true"></span>{{ labels().after }}
          </span>
          <span class="mt-0.5 block text-xs text-gray-600 dark:text-gray-400">{{ labels().afterDesc }}</span>
        </figcaption>
        <div class="grid px-5 py-4">
          <shikidown [content]="source()" [class]="ghostClass" aria-hidden="true" inert />
          <shikidown
            [content]="playback.text()"
            [streaming]="streaming()"
            animation="caret"
            class="prose prose-sm prose-slate dark:prose-invert max-w-none [grid-area:1/1]"
          />
        </div>
      </figure>
    </div>

    <div class="mt-6 flex justify-center">
      <button
        type="button"
        (click)="toggle()"
        class="inline-flex items-center gap-2 rounded-full border border-indigo-300 dark:border-indigo-500/50 px-5 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
      >
        <span aria-hidden="true">{{ streaming() ? '❚❚' : '▶' }}</span>
        {{ action() }}
      </button>
    </div>
  `,
})
export class StreamCompareComponent {
  readonly source = input.required<string>();
  readonly labels = input.required<HomeContent['compare'] & { pause: string; resume: string }>();

  // Assez lent pour que l'œil voie la différence entre les deux panneaux.
  readonly playback = new StreamPlayback(() => this.source(), { intervalMs: 70, maxChunk: 5 });

  /** Rendu complet invisible qui réserve la hauteur finale du panneau. */
  protected readonly ghostClass = 'invisible prose prose-sm prose-slate dark:prose-invert max-w-none [grid-area:1/1]';

  protected readonly streaming = computed(() => {
    const state = this.playback.state();
    return state === 'playing' || state === 'paused';
  });

  protected readonly action = computed(() => {
    const labels = this.labels();
    switch (this.playback.state()) {
      case 'playing':
        return labels.pause;
      case 'paused':
        return labels.resume;
      default:
        return labels.play;
    }
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.playback.destroy());

    effect(() => {
      this.source();
      untracked(() => this.playback.showAll());
    });

    afterNextRender(() => {
      const stop = whenVisible(host, () => this.playback.play(), 0.5);
      destroyRef.onDestroy(stop);
    });
  }

  protected toggle(): void {
    if (this.playback.state() === 'playing') this.playback.pause();
    else this.playback.play();
  }
}
