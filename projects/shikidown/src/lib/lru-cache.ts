/**
 * Cache LRU borné. S'appuie sur l'ordre d'insertion de `Map` : une lecture
 * réinsère l'entrée en fin de liste, l'éviction retire la première.
 */
export class LruCache<V> {
  private readonly entries = new Map<string, V>();

  constructor(private readonly capacity: number) {}

  get(key: string): V | undefined {
    const value = this.entries.get(key);
    if (value === undefined) return undefined;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.capacity <= 0) return;
    this.entries.delete(key);
    if (this.entries.size >= this.capacity) {
      this.entries.delete(this.entries.keys().next().value!);
    }
    this.entries.set(key, value);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
