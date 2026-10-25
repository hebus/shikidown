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
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MarkdownComponent } from 'shikidown';
import { StreamPlayback } from '../../app/stream-simulator';
import type { HomeContent } from './home-content';
import { whenVisible } from './when-visible';

/**
 * Fenêtre d'assistant qui rédige une réponse en direct avec `<shikidown [streaming]>`.
 *
 * La lecture démarre quand la fenêtre devient visible, sauf si l'utilisateur a
 * demandé à réduire les animations : la réponse complète est alors affichée.
 * Elle dure plus de cinq secondes, d'où le bouton pause (WCAG 2.2.2).
 */
@Component({
  selector: 'app-live-window',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  host: { class: 'block' },
  template: `
    <div class="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-gray-900/80 shadow-2xl shadow-indigo-500/10 dark:shadow-indigo-500/20 backdrop-blur">
      <div class="flex items-center gap-3 border-b border-gray-200/80 dark:border-white/10 px-4 py-2.5">
        <span class="flex gap-1.5" aria-hidden="true">
          <span class="h-3 w-3 rounded-full bg-red-400"></span>
          <span class="h-3 w-3 rounded-full bg-amber-400"></span>
          <span class="h-3 w-3 rounded-full bg-emerald-400"></span>
        </span>
        <span class="truncate text-xs font-medium text-gray-600 dark:text-gray-300">{{ labels().title }}</span>
        <span class="ml-auto flex items-center gap-2">
          <span class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300" aria-live="polite">
            <span
              class="h-2 w-2 rounded-full"
              [class]="playback.state() === 'playing' ? 'bg-emerald-500 motion-safe:animate-pulse' : 'bg-gray-400'"
              aria-hidden="true"
            ></span>
            {{ status() }}
          </span>
          <button
            type="button"
            (click)="toggle()"
            class="rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
          >{{ action() }}</button>
        </span>
      </div>
      <div
        #scroller
        class="h-[26rem] overflow-y-auto px-5 py-4 text-left"
        role="region"
        tabindex="0"
        [attr.aria-label]="labels().region"
      >
        <shikidown
          [content]="playback.text()"
          [streaming]="playback.state() === 'playing' || playback.state() === 'paused'"
          animation="caret"
          class="prose prose-sm prose-slate dark:prose-invert max-w-none"
        />
      </div>
    </div>
  `,
})
export class LiveWindowComponent {
  readonly source = input.required<string>();
  readonly labels = input.required<HomeContent['window']>();

  readonly playback = new StreamPlayback(() => this.source(), { intervalMs: 40, maxChunk: 8 });

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  protected readonly status = computed(() => {
    const labels = this.labels();
    switch (this.playback.state()) {
      case 'playing':
        return labels.playing;
      case 'paused':
        return labels.paused;
      default:
        return labels.done;
    }
  });

  protected readonly action = computed(() => {
    const labels = this.labels();
    switch (this.playback.state()) {
      case 'playing':
        return labels.pause;
      case 'paused':
        return labels.resume;
      default:
        return labels.replay;
    }
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const win = inject(DOCUMENT).defaultView;
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.playback.destroy());

    // Changement de langue : la réponse complète, dans la nouvelle langue.
    effect(() => {
      this.source();
      untracked(() => this.playback.showAll());
    });

    // Suit la fin du texte pendant la génération, sauf si le lecteur est remonté.
    effect(() => {
      this.playback.text();
      if (untracked(() => this.playback.state()) !== 'playing') return;
      const el = this.scroller().nativeElement;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
        win?.requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
      }
    });

    afterNextRender(() => {
      const stop = whenVisible(host, () => this.playback.play());
      destroyRef.onDestroy(stop);
    });
  }

  protected toggle(): void {
    if (this.playback.state() === 'playing') this.playback.pause();
    else this.playback.play();
  }
}
