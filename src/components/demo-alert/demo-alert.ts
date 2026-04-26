import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type AlertType = 'info' | 'success' | 'warning' | 'danger';

const ALERT_STYLES: Record<AlertType, string> = {
  info:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
  danger:  'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
};

const ALERT_ICONS: Record<AlertType, string> = {
  info:    'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger:  '🚨',
};

@Component({
  selector: 'demo-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="'flex flex-col items-start gap-3 rounded-lg border p-4 my-3 ' + styles()">
      <div class="text-xl leading-none mt-0.5">
        <span class="shrink-0" [attr.aria-hidden]="true">{{ icon() }}</span>
        @if (title()) {
          <span class="ms-2 font-semibold">{{ title() }}</span>
        }
      </div>
      <div class="min-w-0">
        <p class="text-sm leading-relaxed">{{ message() }}</p>
      </div>
    </div>
  `,
})
export class DemoAlertComponent {
  readonly type = input<AlertType>('info');
  readonly title = input<string>('');
  readonly message = input<string>('');

  readonly styles = computed(() => ALERT_STYLES[this.type()] ?? ALERT_STYLES.info);
  readonly icon   = computed(() => ALERT_ICONS[this.type()] ?? ALERT_ICONS.info);
}
