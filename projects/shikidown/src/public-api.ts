export { MarkdownComponent } from './lib/markdown.component';
export { MarkdownPipe } from './lib/markdown.pipe';
export { MarkdownService } from './lib/markdown.service';
export { provideMarkdown, registerAsCustomElement, registerComponentModules, selectorUsedIn } from './lib/markdown.provider';
export type {
  ComponentModule,
  ComponentModuleSource,
  MarkdownConfig,
  MarkdownItPlugin,
  MarkdownItPluginSource,
  MarkdownThemePair,
} from './lib/markdown.config';
export type { MarkdownItInstance, ParsedBlock, RenderedBlock } from './lib/markdown.types';
