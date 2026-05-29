import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideMarkdown } from 'shikidown';
import { copyCodePlugin } from './copy-code.plugin';
import { routes } from './app.routes';
import { DemoCounterComponent } from '../components/demo-counter/demo-counter';
import { DemoAlertComponent } from '../components/demo-alert/demo-alert';
import { DemoBadgeComponent } from '../components/demo-badge/demo-badge';
import { DemoPipeComponent } from '../components/demo-pipe/demo-pipe';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideMarkdown({
      plugins: [copyCodePlugin],
      theme: { dark: 'github-dark', light: "catppuccin-latte" },
      languages: ['angular-html', 'angular-ts', 'typescript', 'javascript', 'html', 'css', 'bash', 'json', 'markdown', 'python', 'rust'],
      incrementalRendering: true,
      components: {
        'demo-counter': DemoCounterComponent,
        'demo-alert':   DemoAlertComponent,
        'demo-badge':   DemoBadgeComponent,
        'demo-pipe':    DemoPipeComponent,
      },
    }),
  ],
};
