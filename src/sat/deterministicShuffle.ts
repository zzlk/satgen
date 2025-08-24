export function deterministicShuffle<T>(
  array: T[],
  seed: number,
  x: number,
  y: number
): T[] {
  const shuffled = [...array];

  let hash = seed;
  hash = (hash << 5) - hash + x;
  hash = (hash << 5) - hash + y;
  hash = hash & hash; // Convert to 32-bit integer

  // Fisher-Yates shuffle with deterministic random numbers
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate deterministic random number
    hash = (hash * 9301 + 49297) % 233280;
    const j = hash % (i + 1);

    // Swap elements
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
