# Performance Optimizations for `calculateSupport` Function

## Overview

The `calculateSupport` function was identified as a major performance bottleneck in the wave function collapse algorithm. This document outlines the optimizations implemented to improve its performance.

## Original Performance Issues

1. **Frequent Calls**: The function is called multiple times during propagation for each cell and direction
2. **Inefficient Iteration**: Used nested loops to iterate through tiles and supported tiles
3. **Repeated Work**: Same support calculations were performed multiple times for identical inputs
4. **Memory Allocation**: Created new Bitset objects on every call

## Implemented Optimizations

### 1. Caching System

- **Support Cache**: Added a global cache to store previously calculated support values
- **Hash-Based Lookup**: Implemented hash-based cache lookup for faster matching
- **LRU Eviction**: Added cache size management with LRU-style eviction (1000 entries max)
- **Cache Statistics**: Added monitoring capabilities to track cache hit rates

### 2. Algorithmic Improvements

- **Union-Based Calculation**: Replaced nested loops with efficient union operations
- **In-Place Operations**: Added `unionInPlace` method to Bitset class for better performance
- **Early Exit**: Optimized cache lookup with hash comparison before full equality check

### 3. Memory Optimizations

- **Reduced Allocations**: Minimized new object creation during support calculation
- **Efficient Union**: Used in-place union operations when possible
- **Cache Management**: Implemented automatic cache cleanup to prevent memory bloat

## Performance Monitoring

### Usage

```typescript
import { getCacheStats, clearSupportCache } from "./src/sat/support-cache";

// Clear cache at the start of generation
clearSupportCache();

// Run your wave function generation
// ...

// Get cache performance stats
const stats = getCacheStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`Cache hits: ${stats.hits}, misses: ${stats.misses}`);
```

### Expected Improvements

- **Cache Hit Rate**: Should achieve 60-80% cache hit rate in typical usage
- **Performance Gain**: Estimated 40-60% overall performance improvement
- **Memory Usage**: Minimal increase due to cache size limits

## Technical Details

### Module Structure

The cache functionality has been extracted into a separate module (`src/sat/support-cache.ts`) for better code organization:

```typescript
// support-cache.ts
export function calculateSupport(...): Bitset
export function clearSupportCache(): void
export function getCacheStats(): CacheStats
```

### Cache Implementation

```typescript
interface SupportCache {
  cell: Bitset;
  direction: number;
  support: Bitset;
  hash: string;
}
```

### Optimized Algorithm

1. Check cache using hash-based lookup
2. If cache miss, calculate support using union operations
3. Store result in cache with LRU eviction
4. Return cached or calculated support

### Bitset Optimizations

- Added `unionInPlace()` method for in-place union operations
- Maintained backward compatibility with existing union() method
- Optimized for the specific use case of support calculation

## Usage Recommendations

1. **Monitor Performance**: Use the PerformanceMonitor to track improvements
2. **Cache Tuning**: Adjust cache size based on your specific use case
3. **Memory Management**: The cache automatically manages memory, but monitor usage in long-running processes
4. **Profile**: Use browser dev tools or Node.js profiler to verify improvements

## Future Optimizations

Potential areas for further improvement:

1. **Parallel Processing**: Support calculations could be parallelized for large grids
2. **Advanced Caching**: Implement more sophisticated cache strategies (e.g., 2-level cache)
3. **Bit-Level Optimizations**: Further optimize Bitset operations for specific patterns
4. **Lazy Evaluation**: Defer support calculations until absolutely necessary
