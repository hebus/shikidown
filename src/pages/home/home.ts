import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarkdownComponent } from 'shikidown';
import { MermaidDirective } from 'shikidown/mermaid';
import { LanguageService } from '../../services/language.service';
import { siteLinks } from '../../app/site-links';
import { animateHome } from './home-animations';
import { HOME_CONTENT, STACK } from './home-content';
import { FeatureVisualComponent } from './feature-visual';
import { LiveWindowComponent } from './live-window';
import { StreamCompareComponent } from './stream-compare';
import { COMPARE_SAMPLE, STREAM_SAMPLE } from './stream-sample';

const INSTALL_COMMAND = 'npm i shikidown';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MarkdownComponent,
    MermaidDirective,
    FeatureVisualComponent,
    LiveWindowComponent,
    StreamCompareComponent,
  ],
  host: { class: 'block', '[class.motion-pending]': 'motionPending()' },
  styles: `
    /* Masqué jusqu'à ce que GSAP ait posé l'état de départ de l'entrée du hero :
       sans cela, le hero s'afficherait une fraction de seconde avant de s'animer. */
    :host(.motion-pending) [data-anim='pill'],
    :host(.motion-pending) [data-anim='word'],
    :host(.motion-pending) [data-anim='hero-fade'],
    :host(.motion-pending) [data-anim='window'] {
      visibility: hidden;
    }

    /* Plus Jakarta Sans donne au point et à l'apostrophe de larges approches :
       en corps de titre, ils semblent détachés du mot. */
    .punct-apostrophe {
      margin-inline: -0.06em;
    }
    .punct-end {
      margin-inline-start: -0.07em;
    }

    .hero-grid {
      background-image:
        linear-gradient(to right, rgb(99 102 241 / 0.08) 1px, transparent 1px),
        linear-gradient(to bottom, rgb(99 102 241 / 0.08) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent);
    }

    /* Halo qui suit le pointeur sur les cartes de fonctionnalités. */
    .feature-card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), rgb(99 102 241 / 0.14), transparent 45%);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    .feature-card:hover::before {
      opacity: 1;
    }
  `,
  template: `
    <main>
      <!-- ─── Hero ───────────────────────────────────────────────────────── -->
      <section class="relative isolate overflow-hidden">
        <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div class="hero-grid absolute inset-0"></div>
          <div data-anim="blob" class="absolute -top-40 left-[8%] h-[28rem] w-[28rem] rounded-full bg-indigo-400/30 dark:bg-indigo-600/30 blur-3xl"></div>
          <div data-anim="blob" class="absolute top-10 right-[5%] h-[24rem] w-[24rem] rounded-full bg-fuchsia-400/25 dark:bg-fuchsia-600/25 blur-3xl"></div>
          <div data-anim="blob" class="absolute top-72 left-[38%] h-[20rem] w-[20rem] rounded-full bg-cyan-300/25 dark:bg-cyan-500/20 blur-3xl"></div>
        </div>

        <div class="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 px-4 pt-8 pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-12 lg:pb-24">
          <div>
            <a
              data-anim="pill"
              routerLink="/guide"
              fragment="streaming"
              class="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-white/70 dark:bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 backdrop-blur hover:border-indigo-400 transition-colors"
            >
              <span class="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">v3</span>
              {{ c().pill }}
              <span aria-hidden="true">→</span>
            </a>

            <h1 class="mt-5 text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              @for (line of c().title; track $index) {
                <span class="block">
                  @for (word of line; track $index) {
                    <span class="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
                      <span data-anim="word" class="inline-block" [class]="word.accent ? accentClass : ''">
                        @for (part of punctuated(word.text); track $index) {
                          <span [class]="part.kind">{{ part.text }}</span>
                        }
                      </span>
                    </span>{{ ' ' }}
                  }
                </span>
              }
            </h1>

            <p data-anim="hero-fade" class="mt-5 max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
              {{ c().subtitle }}
            </p>

            <div data-anim="hero-fade" class="mt-7 flex flex-wrap items-center gap-3">
              <a
                routerLink="/guide"
                class="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:-translate-y-0.5 hover:bg-indigo-700 motion-reduce:transform-none"
              >{{ c().start }} <span aria-hidden="true">→</span></a>
              <a
                routerLink="/playground"
                class="rounded-xl border border-gray-300 dark:border-white/15 bg-white/70 dark:bg-white/5 px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 backdrop-blur transition hover:-translate-y-0.5 hover:border-gray-400 dark:hover:border-white/30 motion-reduce:transform-none"
              >{{ c().playground }}</a>
            </div>

            <div data-anim="hero-fade" class="mt-6">
              <button
                type="button"
                (click)="copyInstall()"
                class="group inline-flex items-center gap-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-900 px-4 py-2.5 font-mono text-sm text-gray-100 transition hover:border-indigo-400"
                [attr.aria-label]="c().copy + ' : ' + installCommand"
              >
                <span class="text-indigo-400" aria-hidden="true">$</span>
                <span>{{ installCommand }}</span>
                <span class="text-gray-400 group-hover:text-white" aria-hidden="true">{{ copied() ? '✓' : '⧉' }}</span>
              </button>
              <span class="sr-only" aria-live="polite">{{ copied() ? c().copied : '' }}</span>
            </div>
          </div>

          <app-live-window data-anim="window" [source]="streamSample()" [labels]="c().window" />
        </div>
      </section>

      <!-- ─── Briques ────────────────────────────────────────────────────── -->
      <section class="border-y border-gray-200/70 dark:border-white/5 bg-white/50 dark:bg-white/[0.02]">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6">
          <span class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{{ c().builtOn }}</span>
          <ul data-anim="stagger" class="flex flex-wrap items-center justify-center gap-x-8 gap-y-3" role="list">
            @for (name of stack; track name) {
              <li class="text-base font-semibold text-gray-600 dark:text-gray-300">{{ name }}</li>
            }
          </ul>
        </div>
      </section>

      <div class="mx-auto max-w-6xl space-y-28 px-4 py-24">
        <!-- ─── Chiffres ───────────────────────────────────────────────── -->
        <section>
          <div data-anim="reveal" class="mx-auto max-w-2xl text-center">
            <span class="inline-flex items-center rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {{ c().statsEyebrow }}
            </span>
            <h2 class="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">{{ c().statsTitle }}</h2>
            <p class="mt-4 text-gray-600 dark:text-gray-300">{{ c().statsIntro }}</p>
          </div>
          <ul data-anim="stagger" class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" role="list">
            @for (stat of c().stats; track stat.label) {
              <li class="flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6">
                <p class="flex items-center gap-2 text-xs font-semibold" aria-hidden="true">
                  <span class="rounded-md bg-indigo-600 px-1.5 py-0.5 text-white">v3</span>
                  <span class="text-gray-500 dark:text-gray-400">
                    {{ lang() === 'fr' ? 'v2 :' : 'v2:' }} <span class="line-through decoration-rose-500/70 decoration-2">{{ stat.v2 }}</span>
                  </span>
                </p>
                <p class="mt-3 text-5xl font-extrabold tracking-tight" aria-hidden="true">
                  <span [class]="accentClass">{{ stat.prefix ?? '' }}</span><span
                    [class]="accentClass"
                    [attr.data-count-from]="stat.from"
                    [attr.data-count-to]="stat.to"
                  >{{ format(stat.to) }}</span>
                </p>
                <p class="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300" aria-hidden="true">{{ stat.label }}</p>
                <span class="sr-only">{{ stat.spoken }}</span>
              </li>
            }
          </ul>
          <p class="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">{{ c().statsNote }}</p>
        </section>

        <!-- ─── Avant / après ──────────────────────────────────────────── -->
        <section>
          <div data-anim="reveal" class="mx-auto max-w-2xl text-center">
            <h2 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">{{ c().compare.title }}</h2>
            <p class="mt-4 text-gray-600 dark:text-gray-300">{{ c().compare.intro }}</p>
          </div>
          <app-stream-compare data-anim="reveal" class="mt-12" [source]="compareSample()" [labels]="compareLabels()" />
        </section>

        <!-- ─── Fonctionnalités ────────────────────────────────────────── -->
        <section>
          <div data-anim="reveal" class="mx-auto max-w-2xl text-center">
            <h2 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">{{ c().featuresTitle }}</h2>
            <p class="mt-4 text-gray-600 dark:text-gray-300">{{ c().featuresIntro }}</p>
          </div>
          <ul data-anim="stagger" class="mt-12 grid gap-5 md:grid-cols-3" role="list">
            @for (feature of c().features; track feature.icon) {
              <li
                class="feature-card relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 motion-reduce:transform-none"
                [class.md:col-span-2]="feature.wide"
                (pointermove)="trackPointer($event)"
              >
                <app-feature-visual [kind]="feature.icon" [labels]="c().visuals" />
                <div class="mt-5 flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30" aria-hidden="true">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      @switch (feature.icon) {
                        @case ('stream') { <svg:path d="M4 6h16M4 12h10M4 18h6" /><svg:path d="M18 15v6" /> }
                        @case ('component') { <svg:rect x="3" y="3" width="7" height="7" rx="1.5" /><svg:rect x="14" y="3" width="7" height="7" rx="1.5" /><svg:rect x="3" y="14" width="7" height="7" rx="1.5" /><svg:rect x="14" y="14" width="7" height="7" rx="1.5" /> }
                        @case ('code') { <svg:path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /> }
                        @case ('shield') { <svg:path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Z" /><svg:path d="m9 12 2 2 4-4" /> }
                        @case ('diagram') { <svg:rect x="3" y="3" width="6" height="6" rx="1" /><svg:rect x="15" y="15" width="6" height="6" rx="1" /><svg:path d="M9 6h4a2 2 0 0 1 2 2v7" /> }
                        @case ('feather') { <svg:path d="M20 4c-6 0-12 5-12 12v4M8 16h7M10 11h6" /> }
                      }
                    </svg>
                  </span>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ feature.title }}</h3>
                </div>
                <p class="mt-2 leading-relaxed text-gray-600 dark:text-gray-300">{{ feature.desc }}</p>
              </li>
            }
          </ul>
        </section>

        <!-- ─── Vitrine Mermaid / KaTeX ────────────────────────────────── -->
        <section>
          <div data-anim="reveal" class="mx-auto max-w-2xl text-center">
            <h2 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">{{ c().showcaseTitle }}</h2>
            <p class="mt-4 text-gray-600 dark:text-gray-300">{{ c().showcaseIntro }}</p>
          </div>
          <div data-anim="stagger" class="mt-12 grid gap-5 lg:grid-cols-2">
            <div class="flex min-h-56 items-center justify-center overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6">
              <shikidown mermaid [content]="c().mermaid" class="prose prose-slate dark:prose-invert w-full max-w-none" />
            </div>
            <div class="flex min-h-56 items-center justify-center overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6">
              <shikidown [content]="c().katex" class="prose prose-lg prose-slate dark:prose-invert max-w-none" />
            </div>
          </div>
        </section>

        <!-- ─── Démarrage ──────────────────────────────────────────────── -->
        <section>
          <h2 data-anim="reveal" class="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {{ c().stepsTitle }}
          </h2>
          <ol data-anim="stagger" class="mt-12 grid gap-5 lg:grid-cols-3" role="list">
            @for (step of c().steps; track step.title; let i = $index) {
              <li class="flex min-w-0 flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6">
                <span class="flex items-center gap-3">
                  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white" aria-hidden="true">{{ i + 1 }}</span>
                  <span class="font-semibold text-gray-900 dark:text-white">{{ step.title }}</span>
                </span>
                <p class="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{{ step.desc }}</p>
                <shikidown [content]="step.markdown" class="prose prose-sm prose-slate dark:prose-invert mt-4 max-w-none" />
              </li>
            }
          </ol>
        </section>

        <!-- ─── Appel final ────────────────────────────────────────────── -->
        <section
          data-anim="reveal"
          class="relative isolate overflow-hidden rounded-3xl bg-linear-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-6 py-16 text-center shadow-2xl shadow-indigo-500/30 sm:px-16"
        >
          <div class="pointer-events-none absolute -top-24 -right-24 -z-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true"></div>
          <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">{{ c().ctaTitle }}</h2>
          <p class="mx-auto mt-4 max-w-xl text-indigo-100">{{ c().ctaText }}</p>
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <a routerLink="/guide" class="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow transition hover:bg-indigo-50">{{ c().start }}</a>
            <a [href]="links.docs" class="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              {{ c().docs }} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </div>
    </main>
  `,
})
export class HomeComponent {
  private readonly langService = inject(LanguageService);
  private readonly doc = inject(DOCUMENT);

  /** Absolute link to the documentation site the demo is published alongside. */
  readonly links = siteLinks();
  readonly stack = STACK;
  readonly installCommand = INSTALL_COMMAND;

  /**
   * Dégradé des mots mis en avant. Les teintes claires du mode sombre seraient
   * illisibles sur fond blanc : chaque mode a les siennes (contraste AA texte large).
   */
  readonly accentClass =
    'bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 dark:from-indigo-400 dark:via-violet-300 dark:to-cyan-300 bg-clip-text text-transparent';

  readonly lang = this.langService.lang;
  readonly c = computed(() => HOME_CONTENT[this.lang()]);
  readonly streamSample = computed(() => STREAM_SAMPLE[this.lang()]);
  readonly compareSample = computed(() => COMPARE_SAMPLE[this.lang()]);
  readonly compareLabels = computed(() => ({
    ...this.c().compare,
    pause: this.c().window.pause,
    resume: this.c().window.resume,
  }));

  readonly copied = signal(false);
  protected readonly motionPending = signal(
    this.doc.defaultView?.matchMedia('(prefers-reduced-motion: no-preference)').matches ?? false,
  );

  private readonly numberFormat = computed(() => new Intl.NumberFormat(this.lang()));

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    let revert: () => void = () => {};
    let destroyed = false;
    destroyRef.onDestroy(() => {
      destroyed = true;
      revert();
    });

    afterNextRender(() => {
      animateHome(host, (value) => this.format(value))
        .then((cleanup) => (destroyed ? cleanup() : (revert = cleanup)))
        // GSAP indisponible : la page reste entièrement lisible, simplement sans animation.
        .catch(() => undefined)
        .finally(() => this.motionPending.set(false));
    });
  }

  /** Découpe un mot du titre pour resserrer sa ponctuation (voir `.punct-*`). */
  punctuated(text: string): { text: string; kind: string }[] {
    return text
      .split(/(’|\.$)/)
      .filter(Boolean)
      .map((part) => ({ text: part, kind: part === '’' ? 'punct-apostrophe' : part === '.' ? 'punct-end' : '' }));
  }

  format(value: number): string {
    return this.numberFormat().format(value);
  }

  async copyInstall(): Promise<void> {
    try {
      await this.doc.defaultView?.navigator.clipboard.writeText(INSTALL_COMMAND);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission) : la commande reste lisible.
    }
  }

  /** Position du pointeur, pour le halo des cartes de fonctionnalités. */
  trackPointer(event: PointerEvent): void {
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--y', `${event.clientY - rect.top}px`);
  }
}
