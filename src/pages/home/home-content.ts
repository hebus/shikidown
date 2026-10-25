import { VERSIONS } from '../../app/app-version';

/** Textes de la page d'accueil, séparés du template pour garder celui-ci lisible. */

type Lang = 'fr' | 'en';

const FENCE = '```';

/** Un mot du titre ; `accent` le passe en dégradé. */
export interface TitleWord {
  readonly text: string;
  readonly accent?: boolean;
}

export interface Stat {
  /** Valeur de départ du compteur animé, et valeur finale affichée. */
  readonly from: number;
  readonly to: number;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly label: string;
  /** Phrase complète lue par les lecteurs d'écran à la place du compteur. */
  readonly spoken: string;
}

export type FeatureIcon = 'stream' | 'component' | 'code' | 'shield' | 'diagram' | 'feather';

export interface Feature {
  readonly icon: FeatureIcon;
  readonly title: string;
  readonly desc: string;
  /** Occupe deux colonnes de la grille. */
  readonly wide?: boolean;
}

export interface Step {
  readonly title: string;
  readonly desc: string;
  readonly markdown: string;
}

export interface HomeContent {
  readonly pill: string;
  readonly title: readonly (readonly TitleWord[])[];
  readonly subtitle: string;
  readonly start: string;
  readonly playground: string;
  readonly copy: string;
  readonly copied: string;
  readonly window: {
    readonly title: string;
    readonly playing: string;
    readonly paused: string;
    readonly done: string;
    readonly pause: string;
    readonly resume: string;
    readonly replay: string;
  };
  readonly builtOn: string;
  readonly statsTitle: string;
  readonly stats: readonly Stat[];
  readonly statsNote: string;
  readonly compare: {
    readonly title: string;
    readonly intro: string;
    readonly before: string;
    readonly beforeDesc: string;
    readonly after: string;
    readonly afterDesc: string;
    readonly play: string;
  };
  readonly featuresTitle: string;
  readonly featuresIntro: string;
  readonly features: readonly Feature[];
  readonly showcaseTitle: string;
  readonly showcaseIntro: string;
  readonly mermaid: string;
  readonly katex: string;
  readonly stepsTitle: string;
  readonly steps: readonly Step[];
  readonly ctaTitle: string;
  readonly ctaText: string;
  readonly docs: string;
}

const STEPS_CODE = {
  install: [FENCE + 'bash', 'npm install shikidown', FENCE].join('\n'),
  provide: [
    FENCE + 'typescript',
    '// app.config.ts',
    'providers: [',
    '  provideMarkdown({',
    "    components: { 'my-chart': Chart },",
    '  }),',
    ']',
    FENCE,
  ].join('\n'),
  use: [
    FENCE + 'html',
    '<shikidown',
    '  [content]="answer()"',
    '  [streaming]="generating()"',
    '  animation="caret" />',
    FENCE,
  ].join('\n'),
};

const MERMAID = [
  FENCE + 'mermaid',
  'flowchart LR',
  '  LLM([LLM]) -->|fragments| R[Réparation]',
  '  R --> P[Parsing de la fin]',
  '  P --> D[DOM corrigé en place]',
  FENCE,
].join('\n');

const MERMAID_EN = [
  FENCE + 'mermaid',
  'flowchart LR',
  '  LLM([LLM]) -->|fragments| R[Repair]',
  '  R --> P[Tail parsing]',
  '  P --> D[DOM patched in place]',
  FENCE,
].join('\n');

// Chaque commande LaTeX double son antislash pour survivre à la chaîne JS.
const KATEX = ['$$', '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}', '$$'].join('\n');

export const HOME_CONTENT: Record<Lang, HomeContent> = {
  fr: {
    pill: 'Nouveau en v3 · Streaming LLM et sécurité par défaut',
    title: [
      [{ text: 'Du' }, { text: 'Markdown' }, { text: 'qui' }, { text: 's’écrit', accent: true }, { text: 'en', accent: true }, { text: 'direct.', accent: true }],
      [{ text: 'Des' }, { text: 'composants' }, { text: 'Angular' }, { text: 'bien', accent: true }, { text: 'vivants.', accent: true }],
    ],
    subtitle:
      "shikidown affiche les réponses de vos assistants IA pendant qu'elles s'écrivent : coloration Shiki digne d'un IDE, composants Angular interactifs, diagrammes et formules. Sans clignotement, sans faille XSS.",
    start: 'Démarrer en 2 minutes',
    playground: 'Ouvrir le playground',
    copy: 'Copier la commande',
    copied: 'Commande copiée',
    window: {
      title: 'assistant — réponse en direct',
      playing: 'En cours de génération',
      paused: 'En pause',
      done: 'Terminé',
      pause: 'Mettre en pause',
      resume: 'Reprendre',
      replay: 'Rejouer',
    },
    builtOn: 'Construit sur',
    statsTitle: 'Moins de travail, à chaque fragment',
    stats: [
      { from: 415, to: 2, label: 'colorations Shiki pour un bloc de 80 lignes streamé mot à mot, au lieu de 415', spoken: '2 colorations Shiki au lieu de 415 pour un bloc de 80 lignes streamé mot à mot' },
      { from: 1824, to: 10, label: 'parsings complets sur une longue réponse, au lieu de 1 824', spoken: '10 parsings complets au lieu de 1 824 sur une longue réponse' },
      { from: 1, to: 11, prefix: '×', label: 'plus rapide, au minimum, sur notre benchmark de streaming d’un gros bloc de code', spoken: 'au moins 11 fois plus rapide sur notre benchmark de streaming d’un gros bloc de code' },
      { from: 20, to: 0, label: 'composant Angular recréé pendant le flux', spoken: 'aucun composant Angular recréé pendant le flux' },
    ],
    statsNote: 'Mesuré par streaming-perf.spec.ts, chemin 2.x contre chemin 3.0 dans la même exécution. Les temps varient selon la machine (×11 à ×17 observés) ; les nombres de colorations et de parsings sont déterministes.',
    compare: {
      title: 'Le même flux, deux rendus',
      intro: 'À gauche, un rendu Markdown classique recalculé à chaque fragment. À droite, shikidown en mode streaming. Même texte, mêmes coupures.',
      before: 'Rendu classique',
      beforeDesc: 'Délimiteurs bruts, liens cassés, code recoloré à chaque fragment.',
      after: 'shikidown en streaming',
      afterDesc: 'Syntaxe réparée, blocs stables, code coloré une fois fermé.',
      play: 'Lancer la comparaison',
    },
    featuresTitle: 'Tout ce qu’il faut pour du Markdown riche',
    featuresIntro: "Une seule balise, et vos contenus deviennent des interfaces.",
    features: [
      { icon: 'stream', title: 'Streaming LLM', desc: "Fin du document réparée à l'affichage, seul le dernier bloc recalculé, curseur personnalisable. Le texte ne saute plus.", wide: true },
      { icon: 'component', title: 'Composants vivants', desc: 'Insérez vos composants Angular par leur sélecteur. Ils gardent leur état, même pendant le flux.' },
      { icon: 'code', title: 'Shiki, qualité IDE', desc: 'Coloration syntaxique précise, thèmes clair et sombre sans recoloration au changement.' },
      { icon: 'diagram', title: 'Diagrammes et formules', desc: 'Mermaid et KaTeX en entry points optionnels, chargés seulement quand une page en a besoin.', wide: true },
      { icon: 'feather', title: 'Léger et paresseux', desc: 'Langages, thèmes, plugins et composants chargés à la demande : votre bundle initial reste petit.', wide: true },
      { icon: 'shield', title: 'Sûr par défaut', desc: 'HTML brut filtré par liste blanche, URL contrôlées : un LLM ne peut pas injecter de script.' },
    ],
    showcaseTitle: 'Diagrammes et formules, dans le même Markdown',
    showcaseIntro: 'Un bloc mermaid devient un SVG, une formule $$ un rendu KaTeX accessible.',
    mermaid: MERMAID,
    katex: KATEX,
    stepsTitle: 'En place en trois étapes',
    steps: [
      { title: 'Installer', desc: 'npm installe avec lui Shiki et markdown-it, ses dépendances de pair.', markdown: STEPS_CODE.install },
      { title: 'Configurer', desc: 'Déclarez vos composants : ils deviennent des balises utilisables dans le Markdown.', markdown: STEPS_CODE.provide },
      { title: 'Afficher', desc: 'Passez le texte, même incomplet : shikidown s’occupe du reste.', markdown: STEPS_CODE.use },
    ],
    ctaTitle: 'Prêt à donner vie à votre Markdown ?',
    ctaText: `Angular ${VERSIONS.angular}, Shiki ${VERSIONS.shiki}, markdown-it ${VERSIONS.markdownIt}. Open source, licence MIT.`,
    docs: 'Lire la documentation',
  },
  en: {
    pill: 'New in v3 · LLM streaming and safe defaults',
    title: [
      [{ text: 'Markdown' }, { text: 'that' }, { text: 'writes', accent: true }, { text: 'itself', accent: true }, { text: 'live.', accent: true }],
      [{ text: 'Angular' }, { text: 'components' }, { text: 'that' }, { text: 'stay', accent: true }, { text: 'alive.', accent: true }],
    ],
    subtitle:
      'shikidown renders your AI assistants’ answers while they are being written: IDE-grade Shiki highlighting, interactive Angular components, diagrams and formulas. No flicker, no XSS.',
    start: 'Get started in 2 minutes',
    playground: 'Open the playground',
    copy: 'Copy the command',
    copied: 'Command copied',
    window: {
      title: 'assistant — live answer',
      playing: 'Generating',
      paused: 'Paused',
      done: 'Done',
      pause: 'Pause',
      resume: 'Resume',
      replay: 'Replay',
    },
    builtOn: 'Built on',
    statsTitle: 'Less work, on every fragment',
    stats: [
      { from: 415, to: 2, label: 'Shiki highlights for an 80-line block streamed word by word, instead of 415', spoken: '2 Shiki highlights instead of 415 for an 80-line block streamed word by word' },
      { from: 1824, to: 10, label: 'full parses on a long answer, instead of 1,824', spoken: '10 full parses instead of 1,824 on a long answer' },
      { from: 1, to: 11, prefix: '×', label: 'faster, at the very least, on our large code block streaming benchmark', spoken: 'at least 11 times faster on our large code block streaming benchmark' },
      { from: 20, to: 0, label: 'Angular components recreated during the stream', spoken: 'no Angular component recreated during the stream' },
    ],
    statsNote: 'Measured by streaming-perf.spec.ts, 2.x path against 3.0 path in the same run. Timings depend on the machine (×11 to ×17 observed); highlight and parse counts are deterministic.',
    compare: {
      title: 'The same stream, two renderings',
      intro: 'Left, a classic Markdown render recomputed on every fragment. Right, shikidown in streaming mode. Same text, same cuts.',
      before: 'Classic rendering',
      beforeDesc: 'Raw delimiters, broken links, code re-highlighted on every fragment.',
      after: 'shikidown streaming',
      afterDesc: 'Repaired syntax, stable blocks, code highlighted once closed.',
      play: 'Run the comparison',
    },
    featuresTitle: 'Everything rich Markdown needs',
    featuresIntro: 'One tag, and your content becomes an interface.',
    features: [
      { icon: 'stream', title: 'LLM streaming', desc: 'Document end repaired for display, only the last block recomputed, customisable caret. Text no longer jumps.', wide: true },
      { icon: 'component', title: 'Living components', desc: 'Insert your Angular components by selector. They keep their state, even during the stream.' },
      { icon: 'code', title: 'Shiki, IDE grade', desc: 'Precise syntax highlighting, light and dark themes with no re-highlighting on switch.' },
      { icon: 'diagram', title: 'Diagrams and formulas', desc: 'Mermaid and KaTeX as optional entry points, loaded only when a page needs them.', wide: true },
      { icon: 'feather', title: 'Light and lazy', desc: 'Languages, themes, plugins and components loaded on demand: your initial bundle stays small.', wide: true },
      { icon: 'shield', title: 'Safe by default', desc: 'Raw HTML filtered against an allow-list, URLs checked: an LLM cannot inject a script.' },
    ],
    showcaseTitle: 'Diagrams and formulas, in the same Markdown',
    showcaseIntro: 'A mermaid block becomes an SVG, a $$ formula an accessible KaTeX rendering.',
    mermaid: MERMAID_EN,
    katex: KATEX,
    stepsTitle: 'Up and running in three steps',
    steps: [
      { title: 'Install', desc: 'npm brings Shiki and markdown-it along, as its peer dependencies.', markdown: STEPS_CODE.install },
      { title: 'Configure', desc: 'Declare your components: they become tags you can use in Markdown.', markdown: STEPS_CODE.provide },
      { title: 'Render', desc: 'Pass the text, even unfinished: shikidown handles the rest.', markdown: STEPS_CODE.use },
    ],
    ctaTitle: 'Ready to bring your Markdown to life?',
    ctaText: `Angular ${VERSIONS.angular}, Shiki ${VERSIONS.shiki}, markdown-it ${VERSIONS.markdownIt}. Open source, MIT licence.`,
    docs: 'Read the documentation',
  },
};

/** Les briques sur lesquelles shikidown s'appuie, affichées sous le hero. */
export const STACK = ['Angular', 'markdown-it', 'Shiki', 'Mermaid', 'KaTeX', 'Tailwind CSS'];
