/**
 * Réponse rejouée par la démo de streaming de la page d'accueil. Elle réunit ce
 * qu'un flux coupe mal : gras, lien, code inline, bloc de code, tableau, et un
 * composant Angular dont l'état doit survivre aux fragments suivants.
 */

const FENCE = '```';

export const STREAM_SAMPLE: Record<'fr' | 'en', string> = {
  fr: [
    'Voici comment **migrer un service vers les signals**, étape par étape.',
    '',
    '<demo-counter initial-count="0" label="Cliquez pendant le flux"></demo-counter>',
    '',
    '1. Remplacez chaque `BehaviorSubject` par un `signal()`.',
    '2. Exposez l’état dérivé avec `computed()`.',
    '3. Consultez [le guide officiel](https://angular.dev/guide/signals) pour les effets.',
    '',
    FENCE + 'typescript',
    '@Injectable({ providedIn: \'root\' })',
    'export class PanierService {',
    '  private readonly articles = signal<Article[]>([]);',
    '  readonly total = computed(() => this.articles().reduce((s, a) => s + a.prix, 0));',
    '}',
    FENCE,
    '',
    '| API | Rôle | Lecture |',
    '| --- | --- | --- |',
    '| `signal()` | état modifiable | synchrone |',
    '| `computed()` | état dérivé | paresseuse |',
    '| `effect()` | effet de bord | planifiée |',
    '',
    'Le compteur ci-dessus a gardé sa valeur : les blocs déjà affichés ne sont *jamais* recréés.',
  ].join('\n'),
  en: [
    'Here is how to **migrate a service to signals**, step by step.',
    '',
    '<demo-counter initial-count="0" label="Click during the stream"></demo-counter>',
    '',
    '1. Replace every `BehaviorSubject` with a `signal()`.',
    '2. Expose derived state with `computed()`.',
    '3. See [the official guide](https://angular.dev/guide/signals) for effects.',
    '',
    FENCE + 'typescript',
    '@Injectable({ providedIn: \'root\' })',
    'export class CartService {',
    '  private readonly items = signal<Item[]>([]);',
    '  readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));',
    '}',
    FENCE,
    '',
    '| API | Role | Read |',
    '| --- | --- | --- |',
    '| `signal()` | writable state | synchronous |',
    '| `computed()` | derived state | lazy |',
    '| `effect()` | side effect | scheduled |',
    '',
    'The counter above kept its value: blocks already displayed are *never* recreated.',
  ].join('\n'),
};
