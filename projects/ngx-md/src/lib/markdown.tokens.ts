import { InjectionToken, Type } from '@angular/core';
import type { MarkdownConfig } from './markdown.config';

export const MARKDOWN_CONFIG = new InjectionToken<MarkdownConfig>('NGX_MD_CONFIG');
export const MARKDOWN_COMPONENTS = new InjectionToken<Record<string, Type<unknown>>>('NGX_MD_COMPONENTS');
