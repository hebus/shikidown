import {
  ENVIRONMENT_INITIALIZER,
  EnvironmentProviders,
  inject,
  Injector,
  makeEnvironmentProviders,
  PLATFORM_ID,
  Type,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createCustomElement } from '@angular/elements';
import { MARKDOWN_COMPONENTS, MARKDOWN_CONFIG } from './markdown.tokens';
import type { MarkdownConfig } from './markdown.config';

export function provideMarkdown(config: MarkdownConfig = {}): EnvironmentProviders {
  const { components = {}, ...rest } = config;

  return makeEnvironmentProviders([
    { provide: MARKDOWN_CONFIG, useValue: rest },
    { provide: MARKDOWN_COMPONENTS, useValue: components as Record<string, Type<unknown>> },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        // Guard : pas de custom elements côté serveur (SSR)
        if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

        const injector = inject(Injector);
        for (const [selector, ComponentClass] of Object.entries(components)) {
          registerAsCustomElement(selector, ComponentClass as Type<unknown>, injector);
        }
      },
    },
  ]);
}

/**
 * Enregistre un composant Angular comme Web Component.
 * Protégé contre le double enregistrement (appels multiples).
 */
export function registerAsCustomElement(
  selector: string,
  componentClass: Type<unknown>,
  injector: Injector,
): void {
  if (customElements.get(selector)) return;
  const element = createCustomElement(componentClass, { injector });
  customElements.define(selector, element);
}
