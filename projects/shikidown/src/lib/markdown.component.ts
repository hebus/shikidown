import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  PLATFORM_ID,
  resource,
  signal,
  Type,
  ViewEncapsulation,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownService } from './markdown.service';
import { registerAsCustomElement, registerComponentModules, selectorUsedIn } from './markdown.provider';
import { MARKDOWN_CONFIG } from './markdown.tokens';
import type { ComponentModuleSource, StreamingAnimation } from './markdown.config';
import type { BlockParseState } from './markdown.types';
import { assignBlockIds, type KeyedBlock } from './block-identity';
import { MarkdownHtmlDirective } from './markdown-html.directive';

/**
 * Composant principal de rendu Markdown.
 *
 * Les composants Angular passés via `[components]` sont enregistrés automatiquement
 * comme Web Components (Custom Elements) afin d'être reconnus par le navigateur
 * lorsqu'ils apparaissent dans le HTML rendu.
 *
 * Pour un texte généré par un LLM, passer le texte accumulé à `[content]` et
 * `[streaming]="true"` tant que la génération dure : la fin du document est
 * réparée pour l'affichage, seuls les derniers blocs sont recalculés, et les
 * blocs déjà affichés — avec les composants qu'ils contiennent — sont conservés.
 *
 * @example
 * <shikidown [content]="md" class="prose dark:prose-invert max-w-none" />
 * <shikidown [content]="answer()" [streaming]="generating()" />
 */
@Component({
  selector: 'shikidown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Le HTML injecté n'est pas concerné par l'encapsulation émulée : les règles
  // ci-dessous sont préfixées par `shikidown` pour rester confinées.
  encapsulation: ViewEncapsulation.None,
  imports: [MarkdownHtmlDirective],
  host: {
    class: 'block',
    '[class.shikidown-caret]': "animationMode() === 'caret'",
    '[class.shikidown-fade]': "animationMode() === 'fade'",
    // Les technologies d'assistance attendent la fin du flux plutôt que d'annoncer
    // chaque fragment.
    '[attr.aria-busy]': "streaming() ? 'true' : null",
  },
  template: `
    @if (
      (renderResource.isLoading() && renderResource.value() === undefined) ||
      (blockResource.isLoading() && !displayedBlocks().length)
    ) {
      <div class="animate-pulse motion-reduce:animate-none space-y-3 py-2">
        <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    } @else if (renderResource.error() || blockResource.error()) {
      <div class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">
        <strong>Render error:</strong> {{ renderResource.error() ?? blockResource.error() }}
      </div>
    } @else if (incrementalMode()) {
      <div class="shikidown-content">
        @for (block of displayedBlocks(); track block.id) {
          <div
            class="shikidown-block"
            [shikidownHtml]="block.html"
            [attr.data-streaming]="streaming() && $last ? '' : null"
          ></div>
        }
      </div>
    } @else {
      <div [innerHTML]="renderResource.value()" class="shikidown-content"></div>
    }
  `,
  styles: `
    shikidown .shikidown-table {
      overflow-x: auto;
    }

    /* Curseur personnalisable par variables CSS, posées sur <shikidown> ou un ancêtre. */
    shikidown.shikidown-caret .shikidown-block[data-streaming] > :last-child:not(ul, ol)::after,
    shikidown.shikidown-caret .shikidown-block[data-streaming] > :is(ul, ol):last-child > li:last-child::after {
      content: var(--shikidown-caret-content, '▍');
      margin-inline-start: 0.1em;
      color: var(--shikidown-caret-color, currentColor);
      opacity: var(--shikidown-caret-opacity, 0.6);
      animation: var(--shikidown-caret-animation, none);
    }

    shikidown.shikidown-fade .shikidown-block {
      animation: shikidown-fade-in var(--shikidown-fade-duration, 180ms) ease-out;
    }

    @keyframes shikidown-fade-in {
      from {
        opacity: 0;
      }
    }

    /* Fourni pour --shikidown-caret-animation, qui ne clignote pas par défaut. */
    @keyframes shikidown-caret-blink {
      50% {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      shikidown.shikidown-fade .shikidown-block,
      shikidown.shikidown-caret .shikidown-block[data-streaming] > :last-child:not(ul, ol)::after,
      shikidown.shikidown-caret .shikidown-block[data-streaming] > :is(ul, ol):last-child > li:last-child::after {
        animation: none;
      }
    }
  `,
})
export class MarkdownComponent {
  private readonly mdService = inject(MarkdownService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly config = inject(MARKDOWN_CONFIG, { optional: true }) ?? {};

  readonly content = input<string>('');

  /**
   * Le contenu est en cours de génération. Active le rendu incrémental, la
   * réparation provisoire de la fin du document et la coloration différée des
   * blocs de code encore ouverts. Repasser à `false` en fin de flux déclenche le
   * rendu définitif.
   */
  readonly streaming = input(false);

  /**
   * Rendu par blocs : seuls les blocs modifiés sont recalculés et réécrits.
   * Par défaut, `incrementalRendering` de la configuration, ou `true` pendant
   * le streaming.
   */
  readonly incremental = input<boolean | undefined>(undefined);

  /**
   * Repère visuel du streaming : `'caret'` marque la fin du texte en cours,
   * `'fade'` fait apparaître chaque nouveau bloc en fondu. Désactivé par défaut,
   * et sans effet quand l'utilisateur a demandé à réduire les animations.
   */
  readonly animation = input<StreamingAnimation | undefined>(undefined);

  /**
   * Composants Angular supplémentaires à rendre dans ce Markdown.
   * Ils sont automatiquement enregistrés comme Custom Elements lors du premier rendu.
   * Les composants déclarés dans `provideMarkdown()` n'ont pas besoin d'être répétés ici.
   */
  readonly components = input<Record<string, Type<unknown>>>({});

  /**
   * Modules de composants à enregistrer pour ce Markdown, sélecteurs déduits
   * des décorateurs. Accepte des fonctions `() => import('...')` : le module
   * reste alors hors du bundle initial, ce qui est le moyen de ne charger que
   * les composants de la page affichée.
   */
  readonly componentModules = input<ComponentModuleSource[]>([]);

  protected readonly incrementalMode = computed(
    () => this.incremental() ?? (this.streaming() || (this.config.incrementalRendering ?? false)),
  );

  protected readonly animationMode = computed(() => this.animation() ?? this.config.animation ?? 'none');

  // Holds the last successfully rendered blocks; preserved while blockResource re-loads
  // so the template never flickers and Web Component state is not destroyed between keystrokes
  readonly displayedBlocks = signal<KeyedBlock[]>([]);

  /** Découpage du rendu précédent : seule la fin d'un document qui s'allonge est reparsée. */
  private parseState: BlockParseState | undefined;
  private nextBlockId = 0;

  readonly renderResource = resource({
    params: () => ({ text: this.incrementalMode() ? null : this.content() }),
    loader: async ({ params, abortSignal }) => {
      if (!params.text) return this.sanitizer.bypassSecurityTrustHtml('');
      const html = await this.mdService.parseAsync(params.text);
      abortSignal.throwIfAborted();
      return this.sanitizer.bypassSecurityTrustHtml(html);
    },
  });

  readonly blockResource = resource({
    params: () => ({ text: this.incrementalMode() ? this.content() : null, streaming: this.streaming() }),
    loader: async ({ params, abortSignal }): Promise<KeyedBlock[]> => {
      if (!params.text) {
        this.parseState = undefined;
        return [];
      }
      const result = await this.mdService.renderBlocksAsync(params.text, {
        previous: this.parseState,
        streaming: params.streaming,
        signal: abortSignal,
      });
      this.parseState = result.state;
      return assignBlockIds(this.displayedBlocks(), result.blocks, () => this.nextBlockId++);
    },
  });

  constructor() {
    // Propagate completed block renders to displayedBlocks (skips intermediate loading states)
    effect(() => {
      const blocks = this.blockResource.value();
      if (blocks !== undefined) this.displayedBlocks.set(blocks);
    });

    // Register local Web Components (idempotent)
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      for (const [selector, ComponentClass] of Object.entries(this.components())) {
        registerAsCustomElement(selector, ComponentClass, this.injector);
      }
      // Les signaux sont lus ici, dans le contexte réactif ; le chargement des
      // modules se poursuit en dehors (un effect ne peut pas attendre).
      const modules = this.componentModules();
      const content = this.content();
      // Seuls les sélecteurs présents dans ce document sont définis : un module de
      // page exporte souvent d'autres composants (un dialogue monté impérativement,
      // par exemple), que `customElements.define` — global et rétroactif — ferait
      // instancier une seconde fois à leur insertion dans le DOM. L'effect se
      // rejoue quand le contenu change, et l'enregistrement tardif reste valide.
      if (modules.length) {
        void registerComponentModules(modules, this.injector, (selector) =>
          selectorUsedIn(content, selector),
        );
      }
    });
  }
}
