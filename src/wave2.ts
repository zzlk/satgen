import { describe, test, expect } from "vitest";

const DIRECTIONS = [
  { d: 0, dx: 0, dy: 1 }, // north
  { d: 1, dx: 1, dy: 0 }, // east
  { d: 2, dx: 0, dy: -1 }, // south
  { d: 3, dx: -1, dy: 0 }, // west
];

const INVERSE_DIRECTIONS = [
  { d: 0, dx: 0, dy: -1 }, // south to north border
  { d: 1, dx: -1, dy: 0 }, // west to east border
  { d: 2, dx: 0, dy: 1 }, // north to south border
  { d: 3, dx: 1, dy: 0 }, // east to west border
];

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
    queue.push({ x: x + direction.dx, y: y + direction.dy });
  }

  while (queue.length > 0) {
    let { x, y } = queue.shift()!;

    let cell = cells[y * width + x];
    const cellPossibilities = cell.size;

    if (cellPossibilities === 0) {
      throw "invalid";
    }

    for (let direction of INVERSE_DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const neighbor = cells[ny * width + nx];
        const support = new Set<string>();
        for (const tile of neighbor) {
          for (const e of tiles.get(tile)![direction.d]!) {
            support.add(e);
          }
        }

        // remove unsupported tiles.
        cells[y * width + x] = cell.intersection(support);
      }
    }

    // If the cell was modified, then push all of it's neighbors, since they need to be checked now.
    if (cell.size !== cellPossibilities) {
      if (cell.size === 0) {
        return false; // unsatisfiable
      }

      for (const direction of DIRECTIONS) {
        const nx = x + direction.dx;
        const ny = y + direction.dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          queue.push({ x: nx, y: ny });
        }
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
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let cell = cells[y * width + x];

      if (cell.size > 1) {
        // collapse this cell.
        let possibleTiles = Array.from(cell);

        for (const tile of possibleTiles) {
          // deep clone cells:
          const backup = cells.map((c) => new Set(c));

          cell.clear();
          cell.add(tile);

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
            seed,
            cells
          );

          if (ret !== null) {
            return ret;
          }
        }
      }
    }
  }

  // Tried everything, no solution was found.
  return null;
}

function* WaveFunctionGenerate(
  tiles: Map<string, [Set<string>, Set<string>, Set<string>, Set<string>]>,
  width: number,
  height: number,
  seed: number
): Generator<Array<Set<string>>, Array<string> | null> {
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

  return yield* WaveFunctionGenerateInternal(tiles, width, height, seed, cells);
}

describe("Basic Functionality", () => {
  test("should generate a valid arrangement for simple tiles", () => {});
});
