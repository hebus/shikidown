import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideMarkdown } from 'ngx-md';
import { routes } from './app.routes';
import { DemoCounterComponent } from '../components/demo-counter/demo-counter';
import { DemoAlertComponent } from '../components/demo-alert/demo-alert';
import { DemoBadgeComponent } from '../components/demo-badge/demo-badge';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideMarkdown({
      theme: { dark: 'github-dark', light: "catppuccin-latte" },
      languages: ['angular-html', 'angular-ts', 'typescript', 'javascript', 'html', 'css', 'bash', 'json', 'markdown', 'python', 'rust'],
      components: {
        'demo-counter': DemoCounterComponent,
        'demo-alert':   DemoAlertComponent,
        'demo-badge':   DemoBadgeComponent,
      },
    }),
  ],
};
