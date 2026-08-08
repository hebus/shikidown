import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withHashLocation,
  withInMemoryScrolling,
} from '@angular/router';
import { provideMarkdown } from 'shikidown';
import { copyCodePlugin } from './copy-code.plugin';
import markdownItKatex from '@vscode/markdown-it-katex';
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
      plugins: [copyCodePlugin, markdownItKatex],
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
