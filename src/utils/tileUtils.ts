import { Tile } from "./Tile";

/**
 * Convert tiles to the format expected by the wave2.ts gen function
 * @param tiles Array of tiles to convert
 * @returns Map of tile connections for wave function collapse
 */
export const convertTilesToWave2Format = (tiles: Tile[]) => {
  const tileMap = new Map<
    string,
    [Set<string>, Set<string>, Set<string>, Set<string>]
  >();

  // Initialize all tiles with empty connection sets
  for (const tile of tiles) {
    tileMap.set(tile.id, [
      new Set<string>(), // north connections
      new Set<string>(), // east connections
      new Set<string>(), // south connections
      new Set<string>(), // west connections
    ]);
  }

  // Populate connections based on tile borders
  for (const tile of tiles) {
    const connections = tileMap.get(tile.id)!;

    // North connections (tile's north border can connect to other tiles' south border)
    for (const northTileId of tile.borders.north) {
      connections[2].add(northTileId);
    }

    // East connections (tile's east border can connect to other tiles' west border)
    for (const eastTileId of tile.borders.east) {
      connections[1].add(eastTileId);
    }

    // South connections (tile's south border can connect to other tiles' north border)
    for (const southTileId of tile.borders.south) {
      connections[0].add(southTileId);
    }

    // West connections (tile's west border can connect to other tiles' east border)
    for (const westTileId of tile.borders.west) {
      connections[3].add(westTileId);
    }
  }

  return tileMap;
};

/**
 * Create initial synthesis state with all tiles as possibilities
 * @param targetWidth Width of the target synthesis
 * @param targetHeight Height of the target synthesis
 * @param tiles Array of available tiles
 * @returns Initial state array with all tiles as possibilities for each cell
 */
export const createInitialSynthesisState = (
  targetWidth: number,
  targetHeight: number,
  tiles: Tile[]
): Array<Set<string>> => {
  const initialState: Array<Set<string>> = [];
  for (let i = 0; i < targetWidth * targetHeight; i++) {
    initialState.push(new Set(tiles.map((tile) => tile.id)));
  }
  return initialState;
};

/**
 * Update synthesis state based on a tile update
 * @param prevState Previous synthesis state
 * @param tileUpdate Tile update information
 * @param targetWidth Width of the target synthesis
 * @param tiles Array of available tiles
 * @returns Updated synthesis state
 */
export const updateSynthesisState = (
  prevState: Array<Set<string>> | null,
  tileUpdate: { x: number; y: number; tile: string | null },
  targetWidth: number,
  tiles: Tile[]
): Array<Set<string>> | null => {
  if (!prevState) return prevState;

  const newState = [...prevState];
  const index = tileUpdate.y * targetWidth + tileUpdate.x;

  if (tileUpdate.tile === null) {
    // Reset to all possibilities
    newState[index] = new Set(tiles.map((tile) => tile.id));
  } else {
    // Set to specific tile
    newState[index] = new Set([tileUpdate.tile]);
  }

  return newState;
};
