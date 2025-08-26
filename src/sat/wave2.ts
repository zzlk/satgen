import { deterministicShuffle } from "./deterministicShuffle";
import Bitset from "./bitset";
import { SupportCache } from "./support-cache";

const DIRECTIONS: Array<{
  name: string;
  oppositeName: string;
  d: number;
  dx: number;
  dy: number;
}> = [
  { name: "north", oppositeName: "south", d: 0, dx: 0, dy: 1 },
  { name: "east", oppositeName: "west", d: 1, dx: 1, dy: 0 },
  { name: "south", oppositeName: "north", d: 2, dx: 0, dy: -1 },
  { name: "west", oppositeName: "east", d: 3, dx: -1, dy: 0 },
];

function assertBorderConditionsForAllCells(
  tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
  bitsetSize: number,
  width: number,
  height: number,
  cells: Array<Bitset>,
  cache: SupportCache
) {
  function assertBorderConditionsForCell(
    tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
    bitsetSize: number,
    width: number,
    height: number,
    cells: Array<Bitset>,
    x: number,
    y: number,
    cache: SupportCache
  ) {
    for (const direction of DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }

      // Check that the neighbors support the current cell
      const support = cache.calculateSupport(
        tiles,
        bitsetSize,
        cells[ny * width + nx],
        (direction.d + 2) % 4
      );

      if (!cells[y * width + x].isSubsetOf(support)) {
        throw "MISSING SUPPORT";
      }

      // Check that the current cell (x, y) supports all neighbors
      const neighborSupport = cache.calculateSupport(
        tiles,
        bitsetSize,
        cells[y * width + x],
        direction.d
      );

      if (!cells[ny * width + nx].isSubsetOf(neighborSupport)) {
        throw "MISSING SUPPORT";
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      assertBorderConditionsForCell(
        tiles,
        bitsetSize,
        width,
        height,
        cells,
        x,
        y,
        cache
      );
    }
  }
}

function findCells(
  width: number,
  height: number,
  cells: Array<Bitset>
): Array<{ x: number; y: number; count: number }> {
  const result = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y * width + x].count() > 1) {
        result.push({ x, y, count: cells[y * width + x].count() });
      }
    }
  }

  result.sort((a, b) => a.count - b.count);

  return result;
}

function propagateRemoval(
  tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
  bitsetSize: number,
  width: number,
  height: number,
  cells: Array<Bitset>,
  x: number,
  y: number,
  cache: SupportCache
): boolean {
  const queue = new Array<{ x: number; y: number }>();

  // Push the four neighbors of {x, y}
  for (const direction of DIRECTIONS) {
    const dx = x + direction.dx;
    const dy = y + direction.dy;

    if (dx < 0 || dx >= width || dy < 0 || dy >= height) {
      continue;
    }

    queue.push({ x: dx, y: dy });
  }

  while (queue.length > 0) {
    let { x, y } = queue.shift()!;

    const cellBackup = cells[y * width + x].clone();

    for (let direction of DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }

      const support = cache.calculateSupport(
        tiles,
        bitsetSize,
        cells[ny * width + nx],
        (direction.d + 2) % 4
      );

      // remove unsupported tiles.
      cells[y * width + x] = cells[y * width + x].intersection(support);
    }

    if (cells[y * width + x].count() === 0) {
      return false; // unsatisfiable
    }

    // If the cell was modified, then push all of it's neighbors, since they need to be checked now.
    if (!cells[y * width + x].equals(cellBackup)) {
      for (const direction of DIRECTIONS) {
        const nx = x + direction.dx;
        const ny = y + direction.dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }

        queue.push({ x: nx, y: ny });
      }
    }
  }

  return true;
}

function* WaveFunctionGenerateInternal(
  recursionDepth: number,
  tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
  tilemap: Map<string, number>,
  inverseTileMap: Map<number, string>,
  bitsetSize: number,
  width: number,
  height: number,
  seed: number,
  cells: Array<Bitset>,
  cache: SupportCache
): Generator<Array<Set<string>>, Array<string> | null> {
  // base case, entire cell array is collapsed.
  if (cells.every((c) => c.count() === 1)) {
    // return cells.map((c) => c.keys().next().value!);
    return cells.map((c) => inverseTileMap.get(c.getFirstSetBit()!)!);
  }

  for (const { x, y } of findCells(width, height, cells)) {
    switch (cells[y * width + x].count()) {
      case 0:
        throw "invalid precondition";

      case 1:
        continue;

      default:
        // collapse this cell.
        let possibleTiles = deterministicShuffle(
          Array.from(cells[y * width + x].keys()),
          seed,
          x,
          y
        );

        for (const tile of possibleTiles) {
          // deep clone cells:
          const backup = cells.map((c) => c.clone());

          cells[y * width + x].clear();
          cells[y * width + x].set(tile, true);

          // propagate the effects of the removal
          if (
            !propagateRemoval(
              tiles,
              bitsetSize,
              width,
              height,
              cells,
              x,
              y,
              cache
            )
          ) {
            // placing this tile was unsatisfiable, restore the previous state
            cells = backup;
            continue;
          }

          if (recursionDepth % 99999 === 0) {
            yield cells.map(
              (c) =>
                new Set(Array.from(c.keys()).map((i) => inverseTileMap.get(i)!))
            );
          }

          // recurse
          const ret = yield* WaveFunctionGenerateInternal(
            recursionDepth + 1,
            tiles,
            tilemap,
            inverseTileMap,
            bitsetSize,
            width,
            height,
            seed + 1,
            cells,
            cache
          );

          if (ret !== null) {
            return ret;
          } else {
            cells = backup;
          }
        }
    }
  }

  // Tried everything, no solution was found.
  return null;
}

function remapTiles(
  tiles: Map<string, [Set<string>, Set<string>, Set<string>, Set<string>]>
): {
  tileMap: Map<string, number>;
  inverseTileMap: Map<number, string>;
  newTiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>;
  bitsetSize: number;
} {
  const tileMap = new Map<string, number>();
  let index = 0;
  for (const tile of tiles.keys()) {
    tileMap.set(tile, index);
    index++;
  }

  const inverseTileMap = new Map<number, string>();
  for (const [tile, index] of tileMap) {
    inverseTileMap.set(index, tile);
  }

  const newTiles = new Map<number, [Bitset, Bitset, Bitset, Bitset]>();

  const bitsetSize = Math.max(...tileMap.values()) + 1;

  for (const [tile, [n, e, s, w]] of tiles) {
    const tileId = tileMap.get(tile)!;

    const northBitset = new Bitset(bitsetSize);
    const eastBitset = new Bitset(bitsetSize);
    const southBitset = new Bitset(bitsetSize);
    const westBitset = new Bitset(bitsetSize);

    for (const t of n.keys()) {
      northBitset.set(tileMap.get(t)!, true);
    }
    for (const t of e.keys()) {
      eastBitset.set(tileMap.get(t)!, true);
    }
    for (const t of s.keys()) {
      southBitset.set(tileMap.get(t)!, true);
    }
    for (const t of w.keys()) {
      westBitset.set(tileMap.get(t)!, true);
    }

    newTiles.set(tileId, [northBitset, eastBitset, southBitset, westBitset]);
  }

  return { tileMap, inverseTileMap, newTiles, bitsetSize };
}

export function* gen(
  tiles: Map<string, [Set<string>, Set<string>, Set<string>, Set<string>]>,
  width: number,
  height: number,
  seed: number
): Generator<Array<Set<string>>, Array<string> | null> {
  // Create support cache instance
  const cache = new SupportCache();

  // Validate that tile connections are commutative
  for (const [tileA, connectionsA] of tiles) {
    for (const direction of DIRECTIONS) {
      const oppositeDirection = (direction.d + 2) % 4;

      for (const tileB of connectionsA[direction.d]) {
        if (!tiles.has(tileB)) {
          throw `Tile '${tileA}' references non-existent tile '${tileB}' in direction ${direction.name}`;
        }

        const connectionsB = tiles.get(tileB)!;
        if (!connectionsB[oppositeDirection].has(tileA)) {
          throw `Non-commutative connection: Tile '${tileA}' can connect to '${tileB}' on ${direction.name}, but '${tileB}' cannot connect to '${tileA}' on ${direction.oppositeName}`;
        }
      }
    }
  }

  // Remap tiles from string ids to sequential integers so they can be efficiently packed into bitsets
  const { tileMap, inverseTileMap, newTiles, bitsetSize } = remapTiles(tiles);

  // initialize initial cells to all possible tiles
  const allTileCell = new Bitset(bitsetSize);
  for (const tileId of newTiles.keys()) {
    allTileCell.set(tileId, true);
  }

  const cells = new Array(width * height).fill(null).map(() => {
    return allTileCell.clone();
  });

  // make sure that the initial state is valid, propagate removal for all cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        !propagateRemoval(
          newTiles,
          bitsetSize,
          width,
          height,
          cells,
          x,
          y,
          cache
        )
      ) {
        console.log("tiles are unsat");
        return null;
      }
    }
  }

  // Yield initial state so the UI can see basically an empty grid
  yield cells.map(
    (c) => new Set(Array.from(c.keys()).map((i) => inverseTileMap.get(i)!))
  );

  const result = yield* WaveFunctionGenerateInternal(
    0,
    newTiles,
    tileMap,
    inverseTileMap,
    bitsetSize,
    width,
    height,
    seed,
    cells,
    cache
  );

  // Log detailed cache statistics at the end of generation
  const stats = cache.getStats();
  console.log("=== Support Cache Performance Statistics ===");
  console.log(`Cache Hits: ${stats.hits.toLocaleString()}`);
  console.log(`Cache Misses: ${stats.misses.toLocaleString()}`);
  console.log(
    `Total Requests: ${(stats.hits + stats.misses).toLocaleString()}`
  );
  console.log(`Cache Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`Cache Miss Rate: ${((1 - stats.hitRate) * 100).toFixed(2)}%`);
  console.log(
    `Total Calculations: ${stats.totalCalculations.toLocaleString()}`
  );
  console.log(`Current Cache Size: ${stats.cacheSize.toLocaleString()}`);
  console.log(`Peak Cache Size: ${stats.cacheSizePeak.toLocaleString()}`);
  console.log(`Cache Implementation: Hash Map (O(1) lookup)`);

  if (stats.hits + stats.misses > 0) {
    const efficiency =
      stats.hitRate > 0.5
        ? "Excellent"
        : stats.hitRate > 0.3
        ? "Good"
        : stats.hitRate > 0.1
        ? "Fair"
        : "Poor";
    console.log(`Cache Efficiency: ${efficiency}`);

    // Calculate performance impact
    const savedCalculations = stats.hits;
    const totalWork = stats.totalCalculations + savedCalculations;
    const workSaved = totalWork > 0 ? (savedCalculations / totalWork) * 100 : 0;
    console.log(
      `Work Saved: ${workSaved.toFixed(
        2
      )}% (${savedCalculations.toLocaleString()} calculations avoided)`
    );
  }

  console.log("=============================================");

  return result;
}
