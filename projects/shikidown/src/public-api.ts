export { MarkdownComponent } from './lib/markdown.component';
export { MarkdownPipe } from './lib/markdown.pipe';
export { DEFAULT_LANGUAGE_NAMES, DEFAULT_THEME_NAMES, MarkdownService } from './lib/markdown.service';
export { provideMarkdown, registerAsCustomElement, registerComponentModules, selectorUsedIn } from './lib/markdown.provider';
export type {
  ComponentModule,
  ComponentModuleSource,
  HtmlPolicy,
  MarkdownConfig,
  MarkdownItPlugin,
  MarkdownItOptions,
  MarkdownItPluginSource,
  MarkdownThemePair,
  StreamingAnimation,
} from './lib/markdown.config';
export type {
  BlockParseState,
  BlockRenderOptions,
  BlockRenderResult,
  MarkdownItInstance,
  MarkdownStats,
  ParsedBlock,
  RenderedBlock,
} from './lib/markdown.types';
export { repairIncompleteMarkdown, type RepairOptions } from './lib/repair/repair-incomplete-markdown';
export {
  DEFAULT_ALLOWED_PROTOCOLS,
  isSafeUrl,
  sanitizeHtml,
  type SanitizeOptions,
} from './lib/sanitize/sanitize-html';
