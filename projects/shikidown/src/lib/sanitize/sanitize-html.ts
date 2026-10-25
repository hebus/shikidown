/**
 * Filtrage du HTML brut présent dans le Markdown.
 *
 * Le texte d'un LLM est une entrée non fiable : un `<img onerror>` ou un lien
 * `javascript:` qu'il recopierait s'exécuterait dans la page. Ce filtre opère
 * sur les fragments HTML que markdown-it isole (tokens `html_block` et
 * `html_inline`), sans DOM — il tourne donc aussi côté serveur — et selon une
 * liste blanche : balise ou attribut inconnu = retiré.
 *
 * Il ne s'applique pas au HTML produit par markdown-it lui-même ni par les
 * plugins, choisis par l'application.
 */

export interface SanitizeOptions {
  /**
   * Protocoles admis dans les URL (`href`, `src`…), liens Markdown compris. Les
   * URL relatives et les ancres sont toujours admises, ainsi que les images
   * `data:image/(gif|png|jpeg|webp)`.
   * @default ['http', 'https', 'mailto', 'tel']
   */
  allowedProtocols?: string[];
  /** Balises admises en plus de la liste par défaut (formatage, tableaux, listes…). */
  allowedTags?: string[];
  /**
   * Conserve l'attribut `style`. Désactivé par défaut : il permet de masquer ou
   * superposer du contenu et de déclencher des requêtes (`url(...)`).
   * @default false
   */
  allowStyle?: boolean;
  /**
   * Custom elements admis. `'any'` laisse passer tout nom valide : seuls ceux que
   * l'application a enregistrés s'instancient, les autres restent inertes. Une
   * liste restreint aux sélecteurs nommés.
   * @default 'any'
   */
  customElements?: 'any' | readonly string[];
}

export const DEFAULT_ALLOWED_PROTOCOLS: readonly string[] = ['http', 'https', 'mailto', 'tel'];

const DEFAULT_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'colgroup',
  'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 'rp', 'rt',
  'ruby', 's', 'samp', 'section', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
]);

/** Balises dont le contenu est retiré avec elles : ce n'est pas du texte à afficher. */
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'noembed', 'noframes', 'template',
  'textarea', 'title', 'xmp', 'plaintext', 'frameset', 'applet',
]);

const GLOBAL_ATTRIBUTES = new Set(['id', 'class', 'title', 'lang', 'dir', 'role', 'hidden', 'tabindex']);

const TAG_ATTRIBUTES: Record<string, readonly string[]> = {
  a: ['href', 'target', 'rel', 'name'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  td: ['colspan', 'rowspan', 'align', 'headers'],
  th: ['colspan', 'rowspan', 'align', 'scope', 'headers', 'abbr'],
  col: ['span'],
  colgroup: ['span'],
  ol: ['start', 'type', 'reversed'],
  li: ['value'],
  details: ['open'],
  time: ['datetime'],
  del: ['datetime', 'cite'],
  ins: ['datetime', 'cite'],
  q: ['cite'],
  blockquote: ['cite'],
  abbr: ['title'],
};

/** Attributs dont la valeur est une URL, à valider quel que soit l'élément. */
const URL_ATTRIBUTES = new Set([
  'href', 'src', 'cite', 'action', 'formaction', 'poster', 'background', 'longdesc', 'xlink:href',
]);

const TAG_RE =
  /<!--[\s\S]*?(?:-->|$)|<![^>]*>?|<\?[^>]*>?|<(\/?)([A-Za-z][A-Za-z0-9-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
const ATTRIBUTE_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const CUSTOM_ELEMENT_RE = /^[a-z][a-z0-9._-]*-[a-z0-9._-]*$/;

/** Filtre un fragment HTML selon la liste blanche. */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const protocols = options.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS;
  const extraTags = new Set(options.allowedTags?.map((t) => t.toLowerCase()));
  let out = '';
  let last = 0;
  let skipUntil: string | null = null;

  for (const match of html.matchAll(TAG_RE)) {
    const index = match.index!;
    const [whole, closing, rawName, attributes, selfClosing] = match;
    const name = rawName?.toLowerCase();

    if (skipUntil) {
      if (closing && name === skipUntil) {
        skipUntil = null;
        last = index + whole.length;
      }
      continue;
    }

    out += escapeText(html.slice(last, index));
    last = index + whole.length;

    // Commentaires, doctype, instructions de traitement : retirés.
    if (!name) continue;

    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !selfClosing) skipUntil = name;
      continue;
    }

    const custom = CUSTOM_ELEMENT_RE.test(name) && customElementAllowed(name, options);
    if (!custom && !DEFAULT_TAGS.has(name) && !extraTags.has(name)) continue;

    if (closing) {
      out += `</${name}>`;
      continue;
    }
    out += `<${name}${sanitizeAttributes(name, attributes, custom, protocols, options)}${selfClosing ? ' /' : ''}>`;
  }

  if (!skipUntil) out += escapeText(html.slice(last));
  return out;
}

function customElementAllowed(name: string, options: SanitizeOptions): boolean {
  const allowed = options.customElements ?? 'any';
  return allowed === 'any' || allowed.includes(name);
}

/** Un `<` qui n'ouvre pas une balise reconnue (balise tronquée, par exemple) est échappé. */
function escapeText(text: string): string {
  return text.replace(/</g, '&lt;');
}

function sanitizeAttributes(
  tag: string,
  attributes: string,
  custom: boolean,
  protocols: readonly string[],
  options: SanitizeOptions,
): string {
  const kept: Array<[string, string | null]> = [];

  for (const [, rawName, double, single, unquoted] of attributes.matchAll(ATTRIBUTE_RE)) {
    const name = rawName.toLowerCase();
    const value = double ?? single ?? unquoted ?? null;

    if (!/^[a-z_:][a-z0-9_:.-]*$/.test(name) || name.startsWith('on')) continue;
    if (name === 'style' && !options.allowStyle) continue;
    if (!custom && name !== 'style' && !isAllowedAttribute(tag, name)) continue;
    if (name === 'srcset') continue;
    if (URL_ATTRIBUTES.has(name) && (value === null || !isSafeUrl(value, protocols))) continue;

    kept.push([name, value]);
  }

  // Un lien ouvert dans un nouvel onglet ne doit pas donner la main sur la page d'origine.
  if (tag === 'a' && kept.some(([name]) => name === 'target')) {
    const rel = kept.findIndex(([name]) => name === 'rel');
    if (rel !== -1) kept.splice(rel, 1);
    kept.push(['rel', 'noopener noreferrer']);
  }

  return kept.map(([name, value]) => (value === null ? ` ${name}` : ` ${name}="${value.replace(/"/g, '&quot;')}"`)).join('');
}

function isAllowedAttribute(tag: string, name: string): boolean {
  return (
    GLOBAL_ATTRIBUTES.has(name) ||
    name.startsWith('aria-') ||
    name.startsWith('data-') ||
    (TAG_ATTRIBUTES[tag]?.includes(name) ?? false)
  );
}

/**
 * Vrai si l'URL est relative, une ancre, ou d'un protocole admis. Les entités et
 * caractères de contrôle sont neutralisés avant l'examen : `jav&#x61;script:` ou
 * `java\tscript:` sont des formes que le navigateur interprète.
 */
export function isSafeUrl(url: string, protocols: readonly string[] = DEFAULT_ALLOWED_PROTOCOLS): boolean {
  const normalized = decodeEntities(url).replace(/[\u0000- \u007f-\u009f]/g, '').toLowerCase();
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(normalized);
  if (!scheme) return true;
  if (protocols.includes(scheme[1])) return true;
  return /^data:image\/(gif|png|jpeg|webp);/.test(normalized);
}

const NAMED_ENTITIES: Record<string, string> = {
  colon: ':',
  tab: '\t',
  newline: '\n',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  sol: '/',
  lpar: '(',
  rpar: ')',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (entity, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}
