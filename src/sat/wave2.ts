import { deterministicShuffle } from "./deterministicShuffle";

function areSetsEqual<T>(a: Set<T>, b: Set<T>) {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

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
  tiles: Map<string, [Set<string>, Set<string>, Set<string>, Set<string>]>,
  width: number,
  height: number,
  cells: Array<Set<string>>
) {
  function assertBorderConditionsForCell(
    tiles: Map<string, [Set<string>, Set<string>, Set<string>, Set<string>]>,
    width: number,
    height: number,
    cells: Array<Set<string>>,
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
        cells[ny * width + nx],
        (direction.d + 2) % 4
      );

      if (!cells[y * width + x].isSubsetOf(support)) {
        throw "MISSING SUPPORT";
      }

      // Check that the current cell (x, y) supports all neighbors
      const neighborSupport = calculateSupport(
        tiles,
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
      assertBorderConditionsForCell(tiles, width, height, cells, x, y);
    }
  }
}

function findCells(
  width: number,
  height: number,
  cells: Array<Set<string>>
): Array<{ x: number; y: number; count: number }> {
  const result = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y * width + x].size > 1) {
        result.push({ x, y, count: cells[y * width + x].size });
      }
    }
  }

  result.sort((a, b) => a.count - b.count);

  return result;
}

function calculateSupport(
  tiles: Map<string, [Set<string>, Set<string>, Set<string>, Set<string>]>,
  cell: Set<string>,
  direction: number
): Set<string> {
  const support = new Set<string>();

  for (const tileId of cell) {
    for (const supportedTile of tiles.get(tileId)![direction]) {
      support.add(supportedTile);
    }
  }

  return support;
}

function propagateRemoval(
  tiles: Map<string, [Set<string>, Set<string>, Set<string>, Set<string>]>,
  width: number,
  height: number,
  cells: Array<Set<string>>,
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

    const cellBackup = new Set(cells[y * width + x]);

    for (let direction of DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }

      const support = calculateSupport(
        tiles,
        cells[ny * width + nx],
        (direction.d + 2) % 4
      );

      // remove unsupported tiles.
      cells[y * width + x] = cells[y * width + x].intersection(support);
    }

    if (cells[y * width + x].size === 0) {
      return false; // unsatisfiable
    }

    // If the cell was modified, then push all of it's neighbors, since they need to be checked now.
    if (!areSetsEqual(cells[y * width + x], cellBackup)) {
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
  tiles: Map<string, [Set<string>, Set<string>, Set<string>, Set<string>]>,
  width: number,
  height: number,
  seed: number,
  cells: Array<Set<string>>
): Generator<Array<Set<string>>, Array<string> | null> {
  // base case, entire cell array is collapsed.
  if (cells.every((c) => c.size === 1)) {
    return cells.map((c) => c.keys().next().value!);
  }

  // Check that the cell array is valid
  // assertBorderConditionsForAllCells(tiles, width, height, cells);

  const sortedCells = findCells(width, height, cells);

  for (const { x, y } of sortedCells) {
    switch (cells[y * width + x].size) {
      case 0:
        throw "invalid precondition";

      case 1:
        continue;

      default:
        // collapse this cell.
        let possibleTiles = deterministicShuffle(
          Array.from(cells[y * width + x]),
          seed,
          x,
          y
        );

        for (const tile of possibleTiles) {
          // deep clone cells:
          const backup = cells.map((c) => new Set(c));

          cells[y * width + x].clear();
          cells[y * width + x].add(tile);

          // propagate the effects of the removal
          if (!propagateRemoval(tiles, width, height, cells, x, y)) {
            // placing this tile was unsatisfiable, restore the previous state
            cells = backup;
            continue;
          }

          yield cells;

          // recurse
          const ret = yield* WaveFunctionGenerateInternal(
            tiles,
            width,
            height,
            seed + 1,
            cells
          );

          if (ret !== null) {
            return ret;
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

  const cells = new Array(width * height)
    .fill(null)
    .map(() => new Set(tiles.keys()));

  // make sure that the initial state is valid, propagate removal for all cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!propagateRemoval(tiles, width, height, cells, x, y)) {
        console.log("tiles are unsat");
        return null;
      }
    }
  }

  yield cells;

  return yield* WaveFunctionGenerateInternal(tiles, width, height, seed, cells);
}
