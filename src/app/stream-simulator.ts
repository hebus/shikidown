import { signal } from '@angular/core';

/** Délai entre deux fragments, et taille maximale d'un fragment. */
const INTERVAL_MS = 30;
const MAX_CHUNK = 12;

/** Fin du fragment suivant : une taille aléatoire, coupée n'importe où. */
function nextEnd(index: number, length: number, maxChunk = MAX_CHUNK): number {
  return Math.min(length, index + 1 + Math.floor(Math.random() * maxChunk));
}

export interface PlaybackSpeed {
  /** Délai entre deux fragments. */
  readonly intervalMs: number;
  /** Taille maximale d'un fragment. */
  readonly maxChunk: number;
}

/**
 * Rejoue `text` par fragments de taille aléatoire, coupés n'importe où — au
 * milieu d'un mot, d'un délimiteur ou d'une URL — comme le ferait un LLM.
 * `onChunk` reçoit le texte accumulé. Renvoie une fonction qui interrompt le flux.
 */
export function simulateStream(text: string, onChunk: (accumulated: string) => void, onDone: () => void): () => void {
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const step = () => {
    index = nextEnd(index, text.length);
    onChunk(text.slice(0, index));
    if (index < text.length) {
      timer = setTimeout(step, INTERVAL_MS);
    } else {
      onDone();
    }
  };
  step();

  return () => clearTimeout(timer);
}

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'done';

/**
 * Variante pilotable de {@link simulateStream} : lecture, pause, reprise. Un flux
 * qui défile plus de cinq secondes doit pouvoir être mis en pause (WCAG 2.2.2).
 */
export class StreamPlayback {
  /** Texte accumulé, ou le texte complet hors lecture. */
  readonly text = signal('');
  readonly state = signal<PlaybackState>('idle');

  private index = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * `source` n'est lu qu'à la lecture ou par {@link showAll} : il est souvent un
   * input de composant, indisponible tant que le composant se construit.
   */
  constructor(
    private readonly source: () => string,
    private readonly speed: PlaybackSpeed = { intervalMs: INTERVAL_MS, maxChunk: MAX_CHUNK },
  ) {}

  /** Démarre la lecture, la reprend après une pause, ou la relance une fois terminée. */
  play(): void {
    if (this.state() !== 'paused') this.index = 0;
    this.state.set('playing');
    this.step();
  }

  pause(): void {
    clearTimeout(this.timer);
    if (this.state() === 'playing') this.state.set('paused');
  }

  /** Affiche le texte complet sans lecture (mouvement réduit, changement de langue). */
  showAll(): void {
    clearTimeout(this.timer);
    this.text.set(this.source());
    this.state.set('idle');
  }

  destroy(): void {
    clearTimeout(this.timer);
  }

  private step(): void {
    const full = this.source();
    this.index = nextEnd(this.index, full.length, this.speed.maxChunk);
    this.text.set(full.slice(0, this.index));
    if (this.index < full.length) {
      this.timer = setTimeout(() => this.step(), this.speed.intervalMs);
    } else {
      this.state.set('done');
    }
  }
}
