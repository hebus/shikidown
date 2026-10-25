/** Délai entre deux fragments, et taille maximale d'un fragment. */
const INTERVAL_MS = 30;
const MAX_CHUNK = 12;

/**
 * Rejoue `text` par fragments de taille aléatoire, coupés n'importe où — au
 * milieu d'un mot, d'un délimiteur ou d'une URL — comme le ferait un LLM.
 * `onChunk` reçoit le texte accumulé. Renvoie une fonction qui interrompt le flux.
 */
export function simulateStream(text: string, onChunk: (accumulated: string) => void, onDone: () => void): () => void {
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const step = () => {
    index = Math.min(text.length, index + 1 + Math.floor(Math.random() * MAX_CHUNK));
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
