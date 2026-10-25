/**
 * Corpus de référence pour les tests de streaming : chaque document est rendu
 * comme si un LLM l'émettait fragment par fragment, puis comparé au rendu du
 * document complet.
 */

const FENCE = '```';

export const LLM_ANSWER = [
  '# Migrer un service Angular vers les signals',
  '',
  'Voici une **réponse typique** d’un assistant, avec du *texte riche*, du `code inline`',
  'et un [lien vers la doc](https://angular.dev/guide/signals).',
  '',
  '## Étapes',
  '',
  '1. Remplacer les `BehaviorSubject` par des `signal()`.',
  '2. Exposer l’état dérivé avec `computed()` :',
  '   - un sous-élément ;',
  '   - un autre, avec du **gras**.',
  '3. Supprimer les abonnements manuels.',
  '',
  '> **Note :** les signals ne remplacent pas RxJS pour les flux d’événements.',
  '> Ils servent à modéliser un état.',
  '',
  FENCE + 'typescript',
  '@Injectable({ providedIn: \'root\' })',
  'export class CartService {',
  '  private readonly items = signal<Item[]>([]);',
  '  readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));',
  '',
  '  add(item: Item): void {',
  '    this.items.update((list) => [...list, item]);',
  '  }',
  '}',
  FENCE,
  '',
  '| API | Rôle | Lecture |',
  '| --- | :--- | ---: |',
  '| `signal()` | état mutable | synchrone |',
  '| `computed()` | état dérivé | paresseuse |',
  '| `effect()` | effet de bord | planifiée |',
  '',
  'Pour vérifier le comportement :',
  '',
  FENCE + 'bash',
  'npm test -- --watch=false',
  FENCE,
  '',
  '---',
  '',
  'Un diagramme pour finir :',
  '',
  FENCE + 'mermaid',
  'graph TD;',
  '  A[Service] --> B[Signal];',
  '  B --> C[Template];',
  FENCE,
  '',
  'Fin de la réponse, avec un dernier _mot_ et ~~une rature~~.',
  '',
].join('\n');

export const NESTED_STRUCTURES = [
  '- premier',
  '- second',
  '',
  '  paragraphe dans le second élément',
  '',
  '  > citation imbriquée',
  '',
  '- troisième',
  '',
  'Titre setext',
  '============',
  '',
  'Paragraphe interrompu',
  '| a | b |',
  '|---|---|',
  '| 1 | 2 |',
  '',
  '    bloc de code indenté',
  '',
  '<div class="note">HTML brut</div>',
  '',
  'Fin.',
].join('\n');

export const PYTHON_HEAVY = [
  'Deux blocs consécutifs :',
  '',
  FENCE + 'python',
  ...Array.from({ length: 40 }, (_, i) => `def f${i}(x):\n    return x * ${i}  # commentaire ${i}`),
  FENCE,
  '',
  FENCE + 'json',
  '{ "a": 1, "b": [true, false, null], "c": { "d": "e" } }',
  FENCE,
  '',
].join('\n');

export const CORPUS: Record<string, string> = {
  'llm-answer': LLM_ANSWER,
  'nested-structures': NESTED_STRUCTURES,
  'python-heavy': PYTHON_HEAVY,
};

/** Une longue réponse : le corpus répété, pour les mesures de performance. */
export const LONG_ANSWER = Array.from({ length: 8 }, () => LLM_ANSWER).join('\n');

/** Stratégies de découpage d'un document en fragments successifs. */
export type ChunkStrategy = 'char' | 'word' | 'line' | 'random';

/**
 * Découpe `doc` en fragments. `random` utilise un générateur déterministe pour
 * que chaque exécution coupe au même endroit (milieu de token, d'URL, de ligne
 * de tableau…) et qu'un échec reste reproductible.
 */
export function chunk(doc: string, strategy: ChunkStrategy, seed = 42): string[] {
  switch (strategy) {
    case 'char':
      return [...doc];
    case 'word':
      return doc.split(/(?<=\s)/);
    case 'line':
      return doc.split(/(?<=\n)/);
    case 'random': {
      let state = seed;
      const next = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
      const out: string[] = [];
      for (let i = 0; i < doc.length; ) {
        const size = 1 + Math.floor(next() * 12);
        out.push(doc.slice(i, i + size));
        i += size;
      }
      return out;
    }
  }
}

/** Les préfixes successifs d'un document, tels qu'un composant les reçoit en streaming. */
export function prefixes(chunks: string[]): string[] {
  const out: string[] = [];
  let acc = '';
  for (const c of chunks) out.push((acc += c));
  return out;
}
