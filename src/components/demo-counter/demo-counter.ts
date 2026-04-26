import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { numberAttribute } from '@angular/core';

@Component({
  selector: 'demo-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-3 shadow-sm my-2">
      <button
        (click)="decrement()"
        class="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-lg font-bold transition hover:bg-red-200 dark:hover:bg-red-900/60 select-none"
        aria-label="Décrementer"
      >−</button>

      <div class="min-w-[4rem] text-center">
        <span class="block text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{{ count() }}</span>
        @if (label()) {
          <span class="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ label() }}</span>
        }
      </div>

      <button
        (click)="increment()"
        class="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-lg font-bold transition hover:bg-green-200 dark:hover:bg-green-900/60 select-none"
        aria-label="Incrémenter"
      >+</button>
    </div>
  `,
})
export class DemoCounterComponent {
  readonly initialCount = input(0, { transform: numberAttribute });
  readonly label = input<string>('');

  private readonly _count = signal(0);
  readonly count = this._count.asReadonly();

  constructor() {
    effect(() => this._count.set(this.initialCount()));
  }

  increment(): void { this._count.update((n) => n + 1); }
  decrement(): void { this._count.update((n) => n - 1); }
}
