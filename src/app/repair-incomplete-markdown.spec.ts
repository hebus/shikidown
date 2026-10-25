import MarkdownIt from 'markdown-it';
import { repairIncompleteMarkdown as repair } from 'shikidown';
import { chunk, CORPUS, prefixes } from './testing/streaming-fixtures';

const FENCE = '```';

describe('repairIncompleteMarkdown', () => {
  describe('emphasis', () => {
    it.each([
      ['**texte en cours', '**texte en cours**'],
      ['*texte en cours', '*texte en cours*'],
      ['_texte en cours', '_texte en cours_'],
      ['~~rature en cours', '~~rature en cours~~'],
      ['**gras *et italique', '**gras *et italique***'],
      ['**gras en cours ', '**gras en cours** '],
    ])('closes %j', (input, expected) => {
      expect(repair(input)).toBe(expected);
    });

    it.each([
      ['texte **', 'texte '],
      ['texte *', 'texte '],
      ['**', ''],
      ['un **gras** puis **', 'un **gras** puis '],
    ])('hides a lone opener in %j', (input, expected) => {
      expect(repair(input)).toBe(expected);
    });

    it.each([
      'un **gras** fermé',
      'snake_case_identifier',
      '2 * 3 * 4',
      'un \\*astérisque échappé',
      'a ~ b',
    ])('leaves %j untouched', (input) => {
      expect(repair(input)).toBe(input);
    });

    it('does not carry a delimiter across a heading', () => {
      expect(repair('# Titre **ouvert\n\nsuite')).toBe('# Titre **ouvert\n\nsuite');
      expect(repair('# Titre **ouvert\nsuite')).toBe('# Titre **ouvert\nsuite');
    });

    it('does not reach back into a closed fence', () => {
      const input = [FENCE, 'a ** b', FENCE, 'texte *ouvert'].join('\n');
      expect(repair(input)).toBe(input + '*');
    });

    it('closes across the lines of one paragraph', () => {
      expect(repair('**gras\nsur deux lignes')).toBe('**gras\nsur deux lignes**');
    });
  });

  describe('inline code', () => {
    it('closes an open code span', () => {
      expect(repair('voir `const x =')).toBe('voir `const x =`');
    });

    it('hides an empty opener', () => {
      expect(repair('voir `')).toBe('voir ');
    });

    it('does not treat delimiters inside code as emphasis', () => {
      expect(repair('`a * b` et `c')).toBe('`a * b` et `c`');
      expect(repair('`**`')).toBe('`**`');
    });
  });

  describe('links', () => {
    it.each([
      ['[documentation](https://exemple', 'documentation'],
      ['voir [la doc](', 'voir la doc'],
      ['voir [la doc]', 'voir la doc'],
      ['voir [la do', 'voir la do'],
      ['image ![alt](https://exemple.com/a.pn', 'image '],
    ])('renders %j as its label', (input, expected) => {
      expect(repair(input)).toBe(expected);
    });

    it.each(['[doc](https://exemple.com)', '- [ ] tâche', '- [x] faite', 'tableau[0]'])(
      'leaves %j untouched',
      (input) => {
        expect(repair(input)).toBe(input);
      },
    );
  });

  describe('blocks', () => {
    it('leaves an open fence alone', () => {
      const input = [FENCE + 'ts', 'const a = **1'].join('\n');
      expect(repair(input)).toBe(input);
    });

    it('keeps a closing fence on the last line', () => {
      const input = [FENCE + 'mermaid', 'graph TD;', FENCE].join('\n');
      expect(repair(input)).toBe(input);
    });

    it('drops a fence opener still being typed', () => {
      expect(repair('texte\n``')).toBe('texte');
    });

    it('drops a lone list or heading marker', () => {
      expect(repair('- a\n-')).toBe('- a');
      expect(repair('texte\n\n##')).toBe('texte\n');
      expect(repair('1. a\n2.')).toBe('1. a');
    });

    it('drops a setext underline that has just started', () => {
      expect(repair('Paragraphe\n-')).toBe('Paragraphe');
      expect(repair('Paragraphe\n=')).toBe('Paragraphe');
    });

    it('completes a table separator row', () => {
      expect(repair('| a | b |\n|--')).toBe('| a | b |\n| --- | --- |');
      expect(repair('| a | b |\n|')).toBe('| a | b |');
    });

    it('closes emphasis in the last table cell only', () => {
      expect(repair('| a | b |\n|---|---|\n| **x** | *y')).toBe('| a | b |\n|---|---|\n| **x** | *y*');
    });

    it('hides a partial HTML tag', () => {
      expect(repair('texte <demo-cou')).toBe('texte ');
      expect(repair('a < b')).toBe('a < b');
    });

    it('closes a math block only when asked', () => {
      expect(repair('$$\nx^2')).toBe('$$\nx^2');
      expect(repair('$$\nx^2', { math: true })).toBe('$$\nx^2\n$$');
    });

    it('hides an inline formula until it closes, when asked', () => {
      expect(repair('soit $x^2 + ', { math: true })).toBe('soit ');
      expect(repair('soit $x^2$ et $', { math: true })).toBe('soit $x^2$ et ');
      expect(repair('soit $x^2$ fini', { math: true })).toBe('soit $x^2$ fini');
      expect(repair('coûte 5 $ ou', { math: true })).toBe('coûte 5 $ ou');
      expect(repair('soit $x^2 + ')).toBe('soit $x^2 + ');
    });
  });

  describe('on complete documents', () => {
    it.each(Object.entries(CORPUS))('is a no-op on %s', (_, doc) => {
      expect(repair(doc)).toBe(doc);
      expect(repair(doc.trimEnd())).toBe(doc.trimEnd());
    });
  });

  describe('while streaming', () => {
    // Le texte réparé ne doit jamais montrer de délimiteur `**` orphelin : c'est
    // le symptôme visible que la couche existe pour éviter.
    const md = new MarkdownIt();

    it.each(Object.entries(CORPUS))('never renders a raw ** in %s', (_, doc) => {
      for (const prefix of prefixes(chunk(doc, 'char'))) {
        const html = md.render(repair(prefix));
        const outsideCode = html.replace(/<code[\s\S]*?<\/code>/g, '');
        expect(outsideCode, `prefix: ${JSON.stringify(prefix.slice(-40))}`).not.toContain('**');
      }
    });

    it('does not modify the caller source', () => {
      const source = '**gras';
      repair(source);
      expect(source).toBe('**gras');
    });
  });
});
