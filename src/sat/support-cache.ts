import Bitset from "./bitset";

// Support cache to avoid recalculating the same support values
interface SupportCacheEntry {
  cell: Bitset;
  direction: number;
  support: Bitset;
  hash: string;
}

export class SupportCache {
  private cache: SupportCacheEntry[] = [];
  private hits = 0;
  private misses = 0;
  private totalCalculations = 0;
  private cacheSizePeak = 0;

  // Generate a simple hash for a bitset to speed up cache lookups
  private bitsetHash(bitset: Bitset): string {
    return bitset.toString();
  }

  clear(): void {
    this.cache = [];
    this.hits = 0;
    this.misses = 0;
    this.totalCalculations = 0;
    this.cacheSizePeak = 0;
  }

  getStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    totalCalculations: number;
    cacheSize: number;
    cacheSizePeak: number;
    averageCacheSize: number;
  } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      totalCalculations: this.totalCalculations,
      cacheSize: this.cache.length,
      cacheSizePeak: this.cacheSizePeak,
      averageCacheSize: this.totalCalculations > 0 ? this.cacheSizePeak : 0,
    };
  }

  calculateSupport(
    tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
    bitsetSize: number,
    cell: Bitset,
    direction: number
  ): Bitset {
    // Check cache first using hash for faster lookup
    const cellHash = this.bitsetHash(cell);
    for (const cached of this.cache) {
      if (
        cached.hash === cellHash &&
        cached.direction === direction &&
        cached.cell.equals(cell)
      ) {
        this.hits++;
        return cached.support.clone();
      }
    }
    this.misses++;
    this.totalCalculations++;

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
    if (this.cache.length >= 10000) {
      this.cache.splice(0, 100);
    }
    this.cache.push({
      cell: cell.clone(),
      direction,
      support: support!.clone(),
      hash: cellHash,
    });

    // Track peak cache size
    if (this.cache.length > this.cacheSizePeak) {
      this.cacheSizePeak = this.cache.length;
    }

    return support!;
  }
}

// Legacy functions for backward compatibility (deprecated)
export function clearSupportCache(): void {
  console.warn(
    "clearSupportCache() is deprecated. Use SupportCache instance instead."
  );
}

export function getCacheStats(): {
  hits: number;
  misses: number;
  hitRate: number;
  totalCalculations: number;
  cacheSize: number;
  cacheSizePeak: number;
  averageCacheSize: number;
} {
  console.warn(
    "getCacheStats() is deprecated. Use SupportCache instance instead."
  );
  return {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalCalculations: 0,
    cacheSize: 0,
    cacheSizePeak: 0,
    averageCacheSize: 0,
  };
}

export function calculateSupport(
  tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
  bitsetSize: number,
  cell: Bitset,
  direction: number
): Bitset {
  console.warn(
    "calculateSupport() is deprecated. Use SupportCache instance instead."
  );
  // Fallback implementation without caching
  const support = new Bitset(bitsetSize);
  for (const tileId of cell.keys()) {
    const directionSet = tiles.get(tileId)![direction];
    for (const supportedTile of directionSet.keys()) {
      support.set(supportedTile, true);
    }
  }
  return support;
}
