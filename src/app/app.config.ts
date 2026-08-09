import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withHashLocation,
  withInMemoryScrolling,
} from '@angular/router';
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
    // Hash routing: the demo is served from `<site>/demo/`, and GitHub Pages only ever falls back
    // to the 404.html sitting at the root of the site — which belongs to the documentation. Without
    // it, reloading or sharing a deep link such as /demo/playground would land on the docs' 404.
    provideRouter(
      routes,
      withHashLocation(),
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled' }),
    ),
    provideMarkdown({
      // KaTeX is ~266 kB and most pages carry no formula, so it is loaded on demand
      // rather than bundled into the initial chunk. Its stylesheet stays eager
      // (angular.json) — it is small, and it has to be in place before the first
      // formula paints.
      plugins: [copyCodePlugin, { load: () => import('@vscode/markdown-it-katex') }],
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
