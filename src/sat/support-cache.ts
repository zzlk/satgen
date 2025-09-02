import Bitset from "./bitset";
import type { MappedTile } from "./mappedtile";

// Support cache to avoid recalculating the same support values
interface SupportCacheEntry {
  cell: Bitset;
  support: Bitset;
}

export class SupportCache {
  private cache: Map<number, SupportCacheEntry> = new Map();
  private hits = 0;
  private misses = 0;
  private totalCalculations = 0;
  private cacheSizePeak = 0;
  private readonly maxCacheSize = 1000000;
  private readonly evictionBatchSize = 100;

  // Generate an efficient numeric hash for a bitset using the underlying Uint32Array data
  private bitsetHash(bitset: Bitset): number {
    // Access the private bits array using bracket notation to get the underlying data
    const bits = bitset.getUnderlying();
    let hash = 0;

    // Use a simple but effective hash function (djb2 variant)
    for (const b of bits) {
      hash = ((hash << 5) - hash + b) | 0; // | 0 ensures 32-bit integer
    }

    return hash;
  }

  // Generate a composite cache key from cell hash and direction
  private getCacheKey(cellHash: number, direction: number): number {
    // Combine cell hash and direction into a single numeric key
    // Use bit shifting to avoid collisions
    return (cellHash << 2) | (direction & 0x3);
  }

  clear(): void {
    this.cache.clear();
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
      cacheSize: this.cache.size,
      cacheSizePeak: this.cacheSizePeak,
      averageCacheSize: this.totalCalculations > 0 ? this.cacheSizePeak : 0,
    };
  }

  calculateSupport(
    tiles: MappedTile[],
    cell: Bitset,
    direction: number
  ): Bitset {
    // Create a unique key for this cache entry
    const cellHash = this.bitsetHash(cell);
    const cacheKey = this.getCacheKey(cellHash, direction);

    // Check cache using O(1) hash map lookup
    const cached = this.cache.get(cacheKey);
    if (cached && cached.cell.equals(cell)) {
      this.hits++;
      return cached.support;
    }

    this.misses++;
    this.totalCalculations++;

    // Calculate support using more efficient union operations
    let support: Bitset = new Bitset(tiles.length);

    // Use a more efficient approach: union all direction sets for tiles in the cell
    for (const tileId of cell.keys()) {
      const directionSet = tiles[tileId].borderInfo[direction];
      support.unionInPlace(directionSet);
    }

    // // Cache the result with LRU-style eviction
    // if (this.cache.size >= this.maxCacheSize) {
    //   // Remove oldest entries to make room
    //   const entriesToRemove = Array.from(this.cache.keys()).slice(
    //     0,
    //     this.evictionBatchSize
    //   );
    //   for (const key of entriesToRemove) {
    //     this.cache.delete(key);
    //   }
    // }

    this.cache.set(cacheKey, {
      cell: cell.clone(),
      support: support,
    });

    // Track peak cache size
    // if (this.cache.size > this.cacheSizePeak) {
    //   this.cacheSizePeak = this.cache.size;
    // }

    return support!;
  }
}
