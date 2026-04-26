import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type BadgeColor = 'gray' | 'red' | 'orange' | 'amber' | 'green' | 'teal' | 'blue' | 'indigo' | 'purple' | 'pink';

const COLOR_MAP: Record<BadgeColor, string> = {
  gray:   'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  red:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  amber:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  green:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  teal:   'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  blue:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  pink:   'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
};

@Component({
  selector: 'demo-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ' + colorClass()">
      @if (dot()) {
        <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
      }
      {{ label() }}
    </span>
  `,
})
export class DemoBadgeComponent {
  readonly label = input<string>('');
  readonly color = input<BadgeColor>('blue');
  readonly dot   = input(false);

  readonly colorClass = computed(() => COLOR_MAP[this.color()] ?? COLOR_MAP.blue);
}
