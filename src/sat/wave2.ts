const DIRECTIONS: Array<{
  name: string;
  oppositeName: string;
  d: number;
  dx: number;
  dy: number;
  idx: number;
  idy: number;
}> = [
  { name: "north", oppositeName: "south", d: 0, dx: 0, dy: 1, idx: 0, idy: -1 },
  { name: "east", oppositeName: "west", d: 1, dx: 1, dy: 0, idx: -1, idy: 0 },
  { name: "south", oppositeName: "north", d: 2, dx: 0, dy: -1, idx: 0, idy: 1 },
  { name: "west", oppositeName: "east", d: 3, dx: -1, dy: 0, idx: 1, idy: 0 },
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
    const dx = x + direction.dx;
    const dy = y + direction.dy;

    if (dx < 0 || dx >= width || dy < 0 || dy >= height) {
      continue;
    }

    queue.push({ x: dx, y: dy });
  }

  while (queue.length > 0) {
    let { x, y } = queue.shift()!;

    const cellPossibilities = cells[y * width + x].size;

    if (cellPossibilities === 0) {
      throw "invalid";
    }

    for (let direction of DIRECTIONS) {
      const nx = x - direction.dx;
      const ny = y - direction.dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }

      const neighbor = cells[ny * width + nx];
      const support = new Set<string>();
      for (const tile of neighbor) {
        for (const e of tiles.get(tile)![direction.d]!) {
          support.add(e);
        }
      }

      // remove unsupported tiles.
      cells[y * width + x] = cells[y * width + x].intersection(support);
    }

    // If the cell was modified, then push all of it's neighbors, since they need to be checked now.
    if (cells[y * width + x].size !== cellPossibilities) {
      if (cells[y * width + x].size === 0) {
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
  // base case, entire cell array is collapsed.
  if (cells.every((c) => c.size === 1)) {
    return cells.map((c) => c.keys().next().value!);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let cell = cells[y * width + x];

      switch (cell.size) {
        case 0:
          throw "invalid precondition";

        case 1:
          continue;

        default:
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
