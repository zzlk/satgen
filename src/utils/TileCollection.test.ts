import { describe, test, expect } from "vitest";
import { TileCollection } from "./TileCollection";
import { Tile } from "./Tile";

describe("TileCollection - Merge Duplicate Tiles", () => {
  test("should add self-borders when identical tiles are adjacent in source", () => {
    // Create a 2x2 grid where the top row has identical tiles
    const tiles: Tile[] = [
      // Top row: two identical tiles
      new Tile(
        "data:image/png;base64,identical1",
        0,
        0,
        32,
        32,
        2,
        2,
        undefined
      ),
      new Tile(
        "data:image/png;base64,identical1",
        1,
        0,
        32,
        32,
        2,
        2,
        undefined
      ),
      // Bottom row: different tiles
      new Tile(
        "data:image/png;base64,different1",
        0,
        1,
        32,
        32,
        2,
        2,
        undefined
      ),
      new Tile(
        "data:image/png;base64,different2",
        1,
        1,
        32,
        32,
        2,
        2,
        undefined
      ),
    ];

    // Set up the original borders (before merging)
    // Tile (0,0) borders tile (1,0) to the east
    (tiles[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_0"]),
      south: new Set(["tile_0_1"]),
      west: new Set(),
    };

    // Tile (1,0) borders tile (0,0) to the west
    (tiles[1] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(["tile_1_1"]),
      west: new Set(["tile_0_0"]),
    };

    // Tile (0,1) borders tile (0,0) to the north
    (tiles[2] as any).borders = {
      north: new Set(["tile_0_0"]),
      east: new Set(["tile_1_1"]),
      south: new Set(),
      west: new Set(),
    };

    // Tile (1,1) borders tile (1,0) to the north
    (tiles[3] as any).borders = {
      north: new Set(["tile_1_0"]),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_0_1"]),
    };

    // Create tile collection
    const collection = TileCollection.fromTiles(
      tiles,
      tiles.length,
      64,
      64,
      2,
      2
    );

    // Merge duplicate tiles
    const mergedCollection = collection.mergeDuplicateTiles();

    // Should have 3 tiles after merging (2 identical tiles merged into 1)
    expect(mergedCollection.tiles.length).toBe(3);

    // Find the merged tile (should be the one closest to origin, which is tile_0_0)
    const mergedTile = mergedCollection.tiles.find(
      (tile) => tile.id === "tile_0_0"
    );
    expect(mergedTile).toBeDefined();

    // The merged tile should be able to border itself on the east/west boundary
    // because the original tiles (0,0) and (1,0) were adjacent
    expect(mergedTile!.borders.east.has("tile_0_0")).toBe(true);
    expect(mergedTile!.borders.west.has("tile_0_0")).toBe(true);

    // It should also border the bottom tiles
    expect(mergedTile!.borders.south.has("tile_0_1")).toBe(true);
    expect(mergedTile!.borders.south.has("tile_1_1")).toBe(true);
  });

  test("should handle vertical adjacency of identical tiles", () => {
    // Create a 2x2 grid where the left column has identical tiles
    const tiles: Tile[] = [
      // Left column: two identical tiles
      new Tile(
        "data:image/png;base64,identical1",
        0,
        0,
        32,
        32,
        2,
        2,
        undefined
      ),
      new Tile(
        "data:image/png;base64,identical1",
        0,
        1,
        32,
        32,
        2,
        2,
        undefined
      ),
      // Right column: different tiles
      new Tile(
        "data:image/png;base64,different1",
        1,
        0,
        32,
        32,
        2,
        2,
        undefined
      ),
      new Tile(
        "data:image/png;base64,different2",
        1,
        1,
        32,
        32,
        2,
        2,
        undefined
      ),
    ];

    // Set up the original borders
    // Tile (0,0) borders tile (0,1) to the south
    (tiles[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_0"]),
      south: new Set(["tile_0_1"]),
      west: new Set(),
    };

    // Tile (0,1) borders tile (0,0) to the north
    (tiles[1] as any).borders = {
      north: new Set(["tile_0_0"]),
      east: new Set(["tile_1_1"]),
      south: new Set(),
      west: new Set(),
    };

    // Tile (1,0) borders tile (0,0) to the west
    (tiles[2] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(["tile_1_1"]),
      west: new Set(["tile_0_0"]),
    };

    // Tile (1,1) borders tile (0,1) to the west
    (tiles[3] as any).borders = {
      north: new Set(["tile_1_0"]),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_0_1"]),
    };

    // Create tile collection
    const collection = TileCollection.fromTiles(
      tiles,
      tiles.length,
      64,
      64,
      2,
      2
    );

    // Merge duplicate tiles
    const mergedCollection = collection.mergeDuplicateTiles();

    // Should have 3 tiles after merging
    expect(mergedCollection.tiles.length).toBe(3);

    // Find the merged tile (should be tile_0_0)
    const mergedTile = mergedCollection.tiles.find(
      (tile) => tile.id === "tile_0_0"
    );
    expect(mergedTile).toBeDefined();

    // The merged tile should be able to border itself on the north/south boundary
    // because the original tiles (0,0) and (0,1) were adjacent
    expect(mergedTile!.borders.north.has("tile_0_0")).toBe(true);
    expect(mergedTile!.borders.south.has("tile_0_0")).toBe(true);

    // It should also border the right tiles
    expect(mergedTile!.borders.east.has("tile_1_0")).toBe(true);
    expect(mergedTile!.borders.east.has("tile_1_1")).toBe(true);
  });

  test("should not add self-borders when identical tiles are not adjacent", () => {
    // Create a 2x2 grid where identical tiles are not adjacent
    const tiles: Tile[] = [
      // Top-left and bottom-right are identical but not adjacent
      new Tile(
        "data:image/png;base64,identical1",
        0,
        0,
        32,
        32,
        2,
        2,
        undefined
      ),
      new Tile(
        "data:image/png;base64,different1",
        1,
        0,
        32,
        32,
        2,
        2,
        undefined
      ),
      new Tile(
        "data:image/png;base64,different2",
        0,
        1,
        32,
        32,
        2,
        2,
        undefined
      ),
      new Tile(
        "data:image/png;base64,identical1",
        1,
        1,
        32,
        32,
        2,
        2,
        undefined
      ),
    ];

    // Set up borders (no adjacency between identical tiles)
    (tiles[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_0"]),
      south: new Set(["tile_0_1"]),
      west: new Set(),
    };

    (tiles[1] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(["tile_1_1"]),
      west: new Set(["tile_0_0"]),
    };

    (tiles[2] as any).borders = {
      north: new Set(["tile_0_0"]),
      east: new Set(["tile_1_1"]),
      south: new Set(),
      west: new Set(),
    };

    (tiles[3] as any).borders = {
      north: new Set(["tile_1_0"]),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_0_1"]),
    };

    // Create tile collection
    const collection = TileCollection.fromTiles(
      tiles,
      tiles.length,
      64,
      64,
      2,
      2
    );

    // Merge duplicate tiles
    const mergedCollection = collection.mergeDuplicateTiles();

    // Should have 3 tiles after merging
    expect(mergedCollection.tiles.length).toBe(3);

    // Find the merged tile (should be tile_0_0)
    const mergedTile = mergedCollection.tiles.find(
      (tile) => tile.id === "tile_0_0"
    );
    expect(mergedTile).toBeDefined();

    // The merged tile should NOT have self-borders because the original tiles
    // were not adjacent in the source
    expect(mergedTile!.borders.north.has("tile_0_0")).toBe(false);
    expect(mergedTile!.borders.south.has("tile_0_0")).toBe(false);
    expect(mergedTile!.borders.east.has("tile_0_0")).toBe(false);
    expect(mergedTile!.borders.west.has("tile_0_0")).toBe(false);
  });
});
