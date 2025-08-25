import Bitset from "./bitset";

// Support cache to avoid recalculating the same support values
interface SupportCache {
  cell: Bitset;
  direction: number;
  support: Bitset;
  hash: string;
}

// Global cache for support calculations
let supportCache: SupportCache[] = [];
let cacheHits = 0;
let cacheMisses = 0;

// Generate a simple hash for a bitset to speed up cache lookups
function bitsetHash(bitset: Bitset): string {
  return bitset.toString();
}

export function clearSupportCache(): void {
  supportCache = [];
  cacheHits = 0;
  cacheMisses = 0;
}

export function getCacheStats(): {
  hits: number;
  misses: number;
  hitRate: number;
} {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? cacheHits / total : 0,
  };
}

export function calculateSupport(
  tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
  bitsetSize: number,
  cell: Bitset,
  direction: number
): Bitset {
  // Check cache first using hash for faster lookup
  const cellHash = bitsetHash(cell);
  for (const cached of supportCache) {
    if (
      cached.hash === cellHash &&
      cached.direction === direction &&
      cached.cell.equals(cell)
    ) {
      cacheHits++;
      return cached.support.clone();
    }
  }
  cacheMisses++;

  // Calculate support using more efficient union operations
  let support: Bitset | null = null;

  // Use a more efficient approach: union all direction sets for tiles in the cell
  for (const tileId of cell.keys()) {
    const directionSet = tiles.get(tileId)![direction];
    if (support === null) {
      support = directionSet.clone();
    } else {
      // Use in-place union for better performance
      support.unionInPlace(directionSet);
    }
  }

  // Cache the result with LRU-style eviction
  if (supportCache.length >= 10000) {
    supportCache.splice(0, 100);
  }
  supportCache.push({
    cell: cell.clone(),
    direction,
    support: support!.clone(),
    hash: cellHash,
  });

  return support!;
}
