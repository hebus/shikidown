/**
 * Réparation provisoire du Markdown tronqué par un flux.
 *
 * Un LLM émet son texte par fragments : la fin du document s'arrête souvent au
 * milieu d'une syntaxe (`**gras en cou`, `[lien](https://exe`, `` `code ``).
 * Rendu tel quel, markdown-it affiche ces délimiteurs bruts, puis le rendu
 * « saute » quand le fragment qui les ferme arrive.
 *
 * `repairIncompleteMarkdown` produit une **représentation d'affichage** où ces
 * syntaxes sont fermées ou masquées. Elle ne touche que la fin du document, ne
 * modifie jamais la source de l'appelant (la fonction est pure) et ne doit être
 * appliquée que pendant le streaming : le rendu final se fait sur la source brute.
 *
 * Inspirée de `remend` (Streamdown, licence Apache-2.0) pour la liste des cas,
 * pas pour le code : les règles de flanking suivent CommonMark, dont markdown-it
 * est une implémentation.
 */

export interface RepairOptions {
  /**
   * Ferme un bloc `$$` laissé ouvert et masque une formule inline `$…` pas encore
   * fermée. À activer avec un plugin mathématique (voir `shikidown/math`).
   */
  math?: boolean;
}

const FENCE_RE = /^\s*(`{3,}|~{3,})(.*)$/;
const BLOCK_START_RE = /^\s{0,3}([-*+]\s|\d{1,9}[.)]\s|#{1,6}(\s|$)|>|\|)/;
const SINGLE_LINE_BLOCK_RE = /^\s{0,3}(#{1,6}(\s|$)|\||(?:[-*_]\s*){3,}$)|^\s*(`{3,}|~{3,})/;
const PUNCT_RE = /[\p{P}\p{S}]/u;

export function repairIncompleteMarkdown(source: string, options: RepairOptions = {}): string {
  if (!source) return source;

  const lines = source.split('\n');
  const fence = openFenceAtEnd(lines);

  // Le contenu d'un fence n'est pas du Markdown : rien à réparer, et markdown-it
  // ferme lui-même un fence resté ouvert à la fin du document.
  if (fence) return source;

  // Une ligne finale qui n'est encore qu'un début de fence (« `` ») s'afficherait
  // comme du code inline vide.
  const last = lines[lines.length - 1];
  if (/^\s*(`{1,2}|~{1,2})$/.test(last)) {
    lines.pop();
    return lines.join('\n');
  }

  if (options.math && mathBlockOpen(lines)) return `${source}\n$$`;

  // Une source terminée par un saut de ligne n'a pas de ligne tronquée ; une
  // dernière ligne de fence est ici une fermeture, aucun fence n'étant ouvert.
  if (last === '' || FENCE_RE.test(last)) return source;

  const repairedLast = repairLastLine(lines);
  if (repairedLast === null) {
    lines.pop();
    return lines.join('\n');
  }
  lines[lines.length - 1] = repairedLast;

  const start = inlineRegionStart(lines);
  const head = lines.slice(0, start);
  const region = lines.slice(start).join('\n');

  // Dans une ligne de tableau, chaque cellule est un contexte inline à part :
  // seule la dernière cellule peut porter un délimiteur ouvert.
  const cellStart = /^\s*\|/.test(region) ? region.lastIndexOf('|') + 1 : 0;
  const repaired = region.slice(0, cellStart) + repairInline(region.slice(cellStart), options);

  return [...head, repaired].join('\n');
}

/** Le fence encore ouvert à la fin du document, s'il y en a un. */
function openFenceAtEnd(lines: string[]): { char: string; length: number } | null {
  let open: { char: string; length: number } | null = null;
  for (const line of lines) {
    const match = FENCE_RE.exec(line);
    if (!match) continue;
    const [, marker, rest] = match;
    if (!open) {
      // Un fence de backticks ne peut pas porter de backtick dans son info string.
      if (marker[0] === '`' && rest.includes('`')) continue;
      open = { char: marker[0], length: marker.length };
    } else if (marker[0] === open.char && marker.length >= open.length && rest.trim() === '') {
      open = null;
    }
  }
  return open;
}

function mathBlockOpen(lines: string[]): boolean {
  return lines.filter((l) => l.trim() === '$$').length % 2 === 1;
}

/**
 * Nettoie la dernière ligne, encore en cours d'écriture. Renvoie `null` quand
 * la ligne doit être retirée de l'affichage le temps que la suite arrive.
 */
function repairLastLine(lines: string[]): string | null {
  const last = lines[lines.length - 1];
  const previous = lines.length > 1 ? lines[lines.length - 2] : '';

  // Marqueur de liste ou de titre seul : une puce ou un titre vide.
  if (/^\s*([-*+]|\d{1,9}[.)]|#{1,6})\s*$/.test(last)) return null;

  // Début de soulignement setext : transformerait le paragraphe précédent en titre.
  if (previous.trim() && /^\s{0,3}(=+|-{1,2})\s*$/.test(last)) return null;

  // Ligne de séparation d'un tableau en cours d'écriture : on la complète pour que
  // l'en-tête s'affiche déjà en tableau plutôt qu'en paragraphe de barres verticales.
  if (previous.includes('|') && /^\s*\|?[\s:|-]*$/.test(last) && last.includes('|')) {
    if (!last.includes('-')) return null;
    const columns = splitRow(previous).length;
    return `|${' --- |'.repeat(columns)}`;
  }

  // Balise HTML pas encore fermée (`<demo-cou`) : elle s'afficherait en texte.
  return last.replace(/<\/?[A-Za-z][\w-]*(\s[^<>]*)?$/, '');
}

function splitRow(row: string): string[] {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
}

/**
 * Début du dernier contexte inline : un paragraphe peut courir sur plusieurs
 * lignes, mais un délimiteur ne traverse pas un titre, une ligne de tableau ou
 * un nouvel élément de liste.
 */
function inlineRegionStart(lines: string[]): number {
  let i = lines.length - 1;
  while (
    i > 0 &&
    lines[i - 1].trim() !== '' &&
    !BLOCK_START_RE.test(lines[i]) &&
    !SINGLE_LINE_BLOCK_RE.test(lines[i - 1])
  ) {
    i--;
  }
  return i;
}

interface Delimiter {
  char: string;
  length: number;
  /** Index du délimiteur dans le texte. */
  index: number;
}

/** Ferme ou retire les syntaxes inline ouvertes à la fin de `text`. */
function repairInline(text: string, options: RepairOptions): string {
  const { text: withCode, protectedRanges } = repairCodeSpans(text);
  const withMath = options.math ? hideOpenInlineMath(withCode, protectedRanges) : withCode;
  const withLinks = repairLinks(withMath, protectedRanges);
  return repairEmphasis(withLinks, codeSpanRanges(withLinks));
}

/**
 * Ferme un code span ouvert, ou retire son ouverture s'il est encore vide.
 * Renvoie aussi les plages de code, où rien d'autre ne doit être interprété.
 */
function repairCodeSpans(text: string): { text: string; protectedRanges: Array<[number, number]> } {
  const ranges: Array<[number, number]> = [];
  const runs = [...text.matchAll(/`+/g)];
  let open: RegExpMatchArray | null = null;

  for (const run of runs) {
    if (!open) {
      open = run;
    } else if (run[0].length === open[0].length) {
      ranges.push([open.index!, run.index! + run[0].length]);
      open = null;
    }
  }

  if (!open) return { text, protectedRanges: ranges };

  const content = text.slice(open.index! + open[0].length);
  if (content.trim() === '') {
    return { text: text.slice(0, open.index), protectedRanges: ranges };
  }
  const closed = text + open[0];
  ranges.push([open.index!, closed.length]);
  return { text: closed, protectedRanges: ranges };
}

/**
 * Formule inline `$…` pas encore fermée : masquée jusqu'à sa fermeture, plutôt
 * qu'affichée en LaTeX brut puis remplacée d'un coup par son rendu.
 */
function hideOpenInlineMath(text: string, protectedRanges: Array<[number, number]>): string {
  const singles: number[] = [];
  for (const match of text.matchAll(/\$+/g)) {
    const index = match.index!;
    if (match[0].length === 1 && !isEscaped(text, index) && !inRanges(index, protectedRanges)) singles.push(index);
  }
  if (singles.length % 2 === 0) return text;
  const open = singles[singles.length - 1];
  const after = text[open + 1];
  // `$` suivi d'une espace n'ouvre pas de formule (« coûte 5 $ ») ; en fin de texte, si.
  return after === undefined || !/\s/.test(after) ? text.slice(0, open) : text;
}

function codeSpanRanges(text: string): Array<[number, number]> {
  return repairCodeSpans(text).protectedRanges;
}

function inRanges(index: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([from, to]) => index >= from && index < to);
}

/**
 * Lien ou image interrompu en fin de texte : `[libellé`, `[libellé]`,
 * `[libellé](https://exe`. Le libellé reste affiché, une image incomplète
 * disparaît (elle déclencherait une requête vers une URL tronquée).
 */
function repairLinks(text: string, protectedRanges: Array<[number, number]>): string {
  const match = /(!?)\[([^[\]]*)(?:\](?:\(([^()]*))?)?$/.exec(text);
  if (!match || inRanges(match.index, protectedRanges)) return text;

  const [whole, bang, label] = match;
  // `[libellé](url)` déjà fermé ne correspond pas : le motif s'arrête avant `)`.
  // Une case à cocher `[ ]` / `[x]` complète n'est pas un lien en cours, ni un
  // indice collé à un mot (`tableau[0]`).
  if (whole.endsWith(']') && /^[ xX]$/.test(label)) return text;
  if (!bang && match.index > 0 && /\w/.test(text[match.index - 1])) return text;

  return text.slice(0, match.index) + (bang ? '' : label);
}

/**
 * Pile de délimiteurs simplifiée de CommonMark : appariement des `*`, `_` et
 * `~~`, puis fermeture, dans l'ordre inverse, de ceux qui restent ouverts.
 */
function repairEmphasis(text: string, protectedRanges: Array<[number, number]>): string {
  const stack: Delimiter[] = [];
  let trailing: Delimiter | null = null;

  for (const run of text.matchAll(/\*+|_+|~+/g)) {
    const index = run.index!;
    if (inRanges(index, protectedRanges) || isEscaped(text, index)) continue;

    const char = run[0][0];
    let length = run[0].length;
    if (char === '~') {
      if (length < 2) continue;
      length = 2;
    }

    const before = index === 0 ? ' ' : text[index - 1];
    const afterIndex = index + run[0].length;
    const after = afterIndex >= text.length ? ' ' : text[afterIndex];
    const { canOpen, canClose } = flanking(char, before, after);

    if (canClose) {
      for (let s = stack.length - 1; s >= 0 && length > 0; s--) {
        if (stack[s].char !== char) continue;
        const used = Math.min(length, stack[s].length);
        stack[s].length -= used;
        length -= used;
        // Les délimiteurs ouverts au-dessus ne peuvent plus se fermer.
        stack.splice(stack[s].length === 0 ? s : s + 1);
        break;
      }
    }

    if (length > 0 && canOpen) {
      stack.push({ char, length, index });
    } else if (length > 0 && afterIndex === text.length && /\s/.test(before)) {
      // Délimiteur seul en fin de texte (« texte ** ») : l'ouverture d'un gras qui
      // n'a pas encore de contenu. On le masque plutôt que de l'afficher brut.
      trailing = { char, length: run[0].length, index };
    }
  }

  let result = trailing ? text.slice(0, trailing.index) : text;

  // Une ouverture sans contenu derrière elle est masquée ; les autres sont fermées.
  while (stack.length && result.slice(stack[stack.length - 1].index + stack[stack.length - 1].length).trim() === '') {
    result = result.slice(0, stack.pop()!.index);
  }
  if (!stack.length) return result;

  // Un délimiteur fermant ne peut pas suivre une espace : on ferme avant elle.
  const body = result.trimEnd();
  const closers = stack.reverse().map((d) => d.char.repeat(d.length)).join('');
  return body + closers + result.slice(body.length);
}

function isEscaped(text: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) backslashes++;
  return backslashes % 2 === 1;
}

function flanking(char: string, before: string, after: string): { canOpen: boolean; canClose: boolean } {
  const ws = (c: string) => /\s/.test(c);
  const punct = (c: string) => PUNCT_RE.test(c);
  const left = !ws(after) && (!punct(after) || ws(before) || punct(before));
  const right = !ws(before) && (!punct(before) || ws(after) || punct(after));

  if (char === '_') {
    return {
      canOpen: left && (!right || punct(before)),
      canClose: right && (!left || punct(after)),
    };
  }
  return { canOpen: left, canClose: right };
}
