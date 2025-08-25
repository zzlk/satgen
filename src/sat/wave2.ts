import { deterministicShuffle } from "./deterministicShuffle";
import Bitset from "./bitset";

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
  cells: Array<Bitset>
) {
  function assertBorderConditionsForCell(
    tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
    bitsetSize: number,
    width: number,
    height: number,
    cells: Array<Bitset>,
    x: number,
    y: number
  ) {
    for (const direction of DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }

      // Check that the neighbors support the current cell
      const support = calculateSupport(
        tiles,
        bitsetSize,
        cells[ny * width + nx],
        (direction.d + 2) % 4
      );

      if (!cells[y * width + x].isSubsetOf(support)) {
        throw "MISSING SUPPORT";
      }

      // Check that the current cell (x, y) supports all neighbors
      const neighborSupport = calculateSupport(
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
        y
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

function calculateSupport(
  tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
  bitsetSize: number,
  cell: Bitset,
  direction: number
): Bitset {
  // Find the maximum tile ID to size the bitset correctly
  const support = new Bitset(bitsetSize);

  for (const tileId of cell.keys()) {
    const directionSet = tiles.get(tileId)![direction];
    for (const supportedTile of directionSet.keys()) {
      support.set(supportedTile, true);
    }
  }

  return support;
}

function propagateRemoval(
  tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
  bitsetSize: number,
  width: number,
  height: number,
  cells: Array<Bitset>,
  x: number,
  y: number
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

      const support = calculateSupport(
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
  tiles: Map<number, [Bitset, Bitset, Bitset, Bitset]>,
  tilemap: Map<string, number>,
  inverseTileMap: Map<number, string>,
  bitsetSize: number,
  width: number,
  height: number,
  seed: number,
  cells: Array<Bitset>
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
            !propagateRemoval(tiles, bitsetSize, width, height, cells, x, y)
          ) {
            // placing this tile was unsatisfiable, restore the previous state
            cells = backup;
            continue;
          }

          yield cells.map(
            (c) =>
              new Set(Array.from(c.keys()).map((i) => inverseTileMap.get(i)!))
          );

          // recurse
          const ret = yield* WaveFunctionGenerateInternal(
            tiles,
            tilemap,
            inverseTileMap,
            bitsetSize,
            width,
            height,
            seed + 1,
            cells
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

export function* gen(
  tiles: Map<string, [Set<string>, Set<string>, Set<string>, Set<string>]>,
  width: number,
  height: number,
  seed: number
): Generator<Array<Set<string>>, Array<string> | null> {
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

  // Create maps to map from string tile ids to integers from 0 to n
  const tileMap = new Map<string, number>();
  let index = 0;
  for (const tile of tiles.keys()) {
    tileMap.set(tile, index);
    index++;
  }

  // create the inverse mapping to the above
  const inverseTileMap = new Map<number, string>();
  for (const [tile, index] of tileMap) {
    inverseTileMap.set(index, tile);
  }

  // create new tiles that has the mapped contents
  const newTiles = new Map<number, [Bitset, Bitset, Bitset, Bitset]>();

  // Find the maximum tile ID to size bitsets correctly
  const bitsetSize = Math.max(...tileMap.values()) + 1;

  for (const [tile, [n, e, s, w]] of tiles) {
    const tileId = tileMap.get(tile)!;

    // Create bitsets for each direction
    const northBitset = new Bitset(bitsetSize);
    const eastBitset = new Bitset(bitsetSize);
    const southBitset = new Bitset(bitsetSize);
    const westBitset = new Bitset(bitsetSize);

    // Set the bits for each direction
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

  const cells = new Array(width * height).fill(null).map(() => {
    const cell = new Bitset(bitsetSize);
    for (const tileId of newTiles.keys()) {
      cell.set(tileId, true);
    }
    return cell;
  });

  // make sure that the initial state is valid, propagate removal for all cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!propagateRemoval(newTiles, bitsetSize, width, height, cells, x, y)) {
        console.log("tiles are unsat");
        return null;
      }
    }
  }

  yield cells.map(
    (c) => new Set(Array.from(c.keys()).map((i) => inverseTileMap.get(i)!))
  );

  return yield* WaveFunctionGenerateInternal(
    newTiles,
    tileMap,
    inverseTileMap,
    bitsetSize,
    width,
    height,
    seed,
    cells
  );
}
