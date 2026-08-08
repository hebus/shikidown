import {
  ENVIRONMENT_INITIALIZER,
  EnvironmentProviders,
  inject,
  Injector,
  makeEnvironmentProviders,
  PLATFORM_ID,
  reflectComponentType,
  Type,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createCustomElement } from '@angular/elements';
import { MARKDOWN_COMPONENTS, MARKDOWN_CONFIG } from './markdown.tokens';
import type { ComponentModule, ComponentModuleSource, MarkdownConfig } from './markdown.config';

export function provideMarkdown(config: MarkdownConfig = {}): EnvironmentProviders {
  const { components = {}, componentModules = [], ...rest } = config;

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
        // Pas d'attente : un module paresseux se résout après le bootstrap, et
        // l'enregistrement tardif reste valide (upgrade rétroactif, cf. plus bas).
        if (componentModules.length) void registerComponentModules(componentModules, injector);
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

/**
 * Un nom de custom element valide comporte au moins un tiret et commence par
 * une minuscule. Écarte donc les sélecteurs d'attribut (`[mermaid]`), les
 * sélecteurs multiples (`a, b`) et les noms d'un seul mot — qu'un module peut
 * légitimement exporter sans qu'ils soient destinés au Markdown.
 */
function isCustomElementName(selector: string): boolean {
  return /^[a-z][a-z0-9.\-_]*-[a-z0-9.\-_]*$/.test(selector);
}

/**
 * Enregistre tous les composants exportés par les modules donnés, en lisant
 * leur sélecteur dans le décorateur : rien à déclarer côté appelant. Les
 * exports qui ne sont pas des composants — constantes, fonctions, directives à
 * sélecteur d'attribut — sont ignorés.
 *
 * Une source peut être une fonction `() => import('./x')`, auquel cas le module
 * n'est chargé qu'ici : c'est ce qui permet de garder les composants d'une page
 * hors du bundle initial. Enregistrer après que le HTML soit rendu ne pose pas
 * de problème, la spécification des custom elements « upgradant »
 * rétroactivement les balises déjà présentes dans le DOM.
 *
 * `isUsed` restreint l'enregistrement aux sélecteurs réellement employés par le
 * document — voir {@link selectorUsedIn}. Sans lui, tout composant exporté par
 * le module est enregistré.
 *
 * Idempotent, et sans effet côté serveur.
 */
export async function registerComponentModules(
  sources: ComponentModuleSource[],
  injector: Injector,
  isUsed?: (selector: string) => boolean,
): Promise<void> {
  if (typeof customElements === 'undefined') return;

  const modules = await Promise.all(
    sources.map((source) => (typeof source === 'function' ? source() : Promise.resolve(source))),
  );

  for (const module of modules) {
    registerModule(module, injector, isUsed);
  }
}

/**
 * Vrai si `content` contient une balise ouvrante pour ce sélecteur.
 *
 * Le test se fait sur la source Markdown, où les composants apparaissent tels
 * quels (`<demo-foo>` / `<demo-foo />`). Le caractère suivant doit délimiter la
 * balise, sans quoi `<demo-foo>` ferait aussi correspondre `demo-foo-bar`.
 */
export function selectorUsedIn(content: string, selector: string): boolean {
  const index = content.indexOf(`<${selector}`);
  if (index === -1) return false;
  const next = content[index + selector.length + 1];
  return next === undefined || next === '>' || next === '/' || /\s/.test(next);
}

function registerModule(
  module: ComponentModule,
  injector: Injector,
  isUsed?: (selector: string) => boolean,
): void {
  for (const exported of Object.values(module)) {
    // Une classe est une fonction : ce filtre écarte les constantes exportées
    // par le module, dont `undefined`, sur lequel reflectComponentType lèverait.
    if (typeof exported !== 'function') continue;

    const mirror = reflectComponentType(exported as Type<unknown>);
    if (!mirror || !isCustomElementName(mirror.selector)) continue;

    // Un module de page exporte souvent plus que ses balises Markdown : un dialogue
    // monté impérativement, un composant hôte réutilisé ailleurs. Les définir tous
    // ne serait pas neutre — `customElements.define` est global et rétroactif, si
    // bien qu'un composant créé par ailleurs via `createComponent()` verrait son
    // élément hôte « upgradé » à l'insertion dans le DOM, donc instancié une
    // seconde fois, hors du contexte d'injection prévu par son créateur.
    if (isUsed && !isUsed(mirror.selector)) continue;

    registerAsCustomElement(mirror.selector, exported as Type<unknown>, injector);
  }
}
