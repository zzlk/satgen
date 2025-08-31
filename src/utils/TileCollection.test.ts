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

describe("TileCollection - Merge Two Collections", () => {
  test("should merge two collections with no overlapping tiles", () => {
    // Create first collection with 2 tiles
    const tiles1: Tile[] = [
      new Tile("data:image/png;base64,tile1", 0, 0, 32, 32, 2, 2, undefined),
      new Tile("data:image/png;base64,tile2", 1, 0, 32, 32, 2, 2, undefined),
    ];

    // Set up borders for first collection
    (tiles1[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_0"]),
      south: new Set(),
      west: new Set(),
    };
    (tiles1[1] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_0_0"]),
    };

    const collection1 = TileCollection.fromTiles(tiles1, 2, 64, 32, 2, 1);

    // Create second collection with 2 different tiles
    const tiles2: Tile[] = [
      new Tile("data:image/png;base64,tile3", 0, 0, 32, 32, 2, 2, undefined),
      new Tile("data:image/png;base64,tile4", 1, 0, 32, 32, 2, 2, undefined),
    ];

    // Set up borders for second collection
    (tiles2[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_0"]),
      south: new Set(),
      west: new Set(),
    };
    (tiles2[1] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_0_0"]),
    };

    const collection2 = TileCollection.fromTiles(tiles2, 2, 64, 32, 2, 1);

    // Merge collections
    const mergedCollection = collection1.mergeWith(collection2);

    // Should have 4 tiles total
    expect(mergedCollection.tiles.length).toBe(4);
    expect(mergedCollection.getCount()).toBe(4);

    // Check that all tiles are present
    const tileIds = mergedCollection.tiles.map((tile) => tile.id).sort();
    expect(tileIds).toEqual(["tile_0_0", "tile_0_0", "tile_1_0", "tile_1_0"]);
  });

  test("should merge two collections with overlapping tiles", () => {
    // Create first collection with 2 tiles
    const tiles1: Tile[] = [
      new Tile("data:image/png;base64,shared", 0, 0, 32, 32, 2, 2, undefined),
      new Tile("data:image/png;base64,unique1", 1, 0, 32, 32, 2, 2, undefined),
    ];

    // Set up borders for first collection
    (tiles1[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_0"]),
      south: new Set(),
      west: new Set(),
    };
    (tiles1[1] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_0_0"]),
    };

    const collection1 = TileCollection.fromTiles(tiles1, 2, 64, 32, 2, 1);

    // Create second collection with 2 tiles (one shared, one unique)
    const tiles2: Tile[] = [
      new Tile("data:image/png;base64,shared", 2, 0, 32, 32, 2, 2, undefined), // Same hash, different position
      new Tile("data:image/png;base64,unique2", 3, 0, 32, 32, 2, 2, undefined),
    ];

    // Set up borders for second collection
    (tiles2[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_3_0"]),
      south: new Set(),
      west: new Set(),
    };
    (tiles2[1] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_2_0"]),
    };

    const collection2 = TileCollection.fromTiles(tiles2, 2, 64, 32, 2, 1);

    // Merge collections
    const mergedCollection = collection1.mergeWith(collection2);

    // Should have 3 tiles total (shared tile merged, 2 unique tiles)
    expect(mergedCollection.tiles.length).toBe(3);

    // Find the merged shared tile (should be the one closest to origin, which is tile_0_0)
    const sharedTile = mergedCollection.tiles.find(
      (tile) => tile.getDataUrlHash() === tiles1[0].getDataUrlHash()
    );
    expect(sharedTile).toBeDefined();
    expect(sharedTile!.id).toBe("tile_0_0"); // Should keep the one closest to origin

    // The merged shared tile should have borders from both original tiles
    expect(sharedTile!.borders.east.has("tile_1_0")).toBe(true);
    expect(sharedTile!.borders.east.has("tile_3_0")).toBe(true);
  });

  test("should ensure commutative rules after merging", () => {
    // Create first collection with asymmetric borders
    const tiles1: Tile[] = [
      new Tile("data:image/png;base64,tile1", 0, 0, 32, 32, 2, 2, undefined),
      new Tile("data:image/png;base64,tile2", 1, 0, 32, 32, 2, 2, undefined),
    ];

    // Set up asymmetric borders (tile1 borders tile2, but tile2 doesn't border tile1)
    (tiles1[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_0"]),
      south: new Set(),
      west: new Set(),
    };
    (tiles1[1] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(), // Missing border back to tile1
    };

    const collection1 = TileCollection.fromTiles(tiles1, 2, 64, 32, 2, 1);

    // Create second collection
    const tiles2: Tile[] = [
      new Tile("data:image/png;base64,tile3", 0, 0, 32, 32, 2, 2, undefined),
    ];

    (tiles2[0] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(),
    };

    const collection2 = TileCollection.fromTiles(tiles2, 1, 32, 32, 1, 1);

    // Merge collections
    const mergedCollection = collection1.mergeWith(collection2);

    // Find the tiles in the merged collection
    const tile1 = mergedCollection.tiles.find((tile) => tile.id === "tile_0_0");
    const tile2 = mergedCollection.tiles.find((tile) => tile.id === "tile_1_0");

    expect(tile1).toBeDefined();
    expect(tile2).toBeDefined();

    // Check that commutative rules are enforced
    expect(tile1!.borders.east.has("tile_1_0")).toBe(true);
    expect(tile2!.borders.west.has("tile_0_0")).toBe(true); // Should be added automatically
  });

  test("should preserve self-bordering during merge", () => {
    // Create first collection with self-bordering tile
    const tiles1: Tile[] = [
      new Tile(
        "data:image/png;base64,selfborder",
        0,
        0,
        32,
        32,
        2,
        2,
        undefined
      ),
    ];

    // Set up self-borders
    (tiles1[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_0_0"]), // Self-border
      south: new Set(),
      west: new Set(),
    };

    const collection1 = TileCollection.fromTiles(tiles1, 1, 32, 32, 1, 1);

    // Create second collection with the same tile at different position
    const tiles2: Tile[] = [
      new Tile(
        "data:image/png;base64,selfborder",
        1,
        0,
        32,
        32,
        2,
        2,
        undefined
      ),
    ];

    // Set up different self-borders
    (tiles2[0] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_1_0"]), // Self-border in different direction
    };

    const collection2 = TileCollection.fromTiles(tiles2, 1, 32, 32, 1, 1);

    // Merge collections
    const mergedCollection = collection1.mergeWith(collection2);

    // Should have 1 tile after merging
    expect(mergedCollection.tiles.length).toBe(1);

    const mergedTile = mergedCollection.tiles[0];
    expect(mergedTile.id).toBe("tile_0_0"); // Should keep the one closest to origin

    // Should preserve both self-borders
    expect(mergedTile.borders.east.has("tile_0_0")).toBe(true);
    expect(mergedTile.borders.west.has("tile_0_0")).toBe(true);
  });

  test("should handle complex border merging with multiple directions", () => {
    // Create first collection with complex borders
    const tiles1: Tile[] = [
      new Tile("data:image/png;base64,center", 1, 1, 32, 32, 3, 3, undefined),
      new Tile("data:image/png;base64,north", 1, 0, 32, 32, 3, 3, undefined),
      new Tile("data:image/png;base64,east", 2, 1, 32, 32, 3, 3, undefined),
    ];

    // Set up borders for first collection
    (tiles1[0] as any).borders = {
      north: new Set(["tile_1_0"]),
      east: new Set(["tile_2_1"]),
      south: new Set(),
      west: new Set(),
    };
    (tiles1[1] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(["tile_1_1"]),
      west: new Set(),
    };
    (tiles1[2] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_1_1"]),
    };

    const collection1 = TileCollection.fromTiles(tiles1, 3, 96, 96, 3, 3);

    // Create second collection with overlapping and new tiles
    const tiles2: Tile[] = [
      new Tile("data:image/png;base64,center", 0, 0, 32, 32, 3, 3, undefined), // Same as center but different position
      new Tile("data:image/png;base64,south", 1, 2, 32, 32, 3, 3, undefined),
      new Tile("data:image/png;base64,west", 0, 1, 32, 32, 3, 3, undefined),
    ];

    // Set up borders for second collection
    (tiles2[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_0"]),
      south: new Set(["tile_0_1"]),
      west: new Set(),
    };
    (tiles2[1] as any).borders = {
      north: new Set(["tile_1_1"]),
      east: new Set(),
      south: new Set(),
      west: new Set(),
    };
    (tiles2[2] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_1"]),
      south: new Set(),
      west: new Set(),
    };

    const collection2 = TileCollection.fromTiles(tiles2, 3, 96, 96, 3, 3);

    // Merge collections
    const mergedCollection = collection1.mergeWith(collection2);

    // Should have 5 tiles total (1 merged center tile + 4 unique tiles)
    expect(mergedCollection.tiles.length).toBe(5);

    // Find the merged center tile (should be tile_0_0 as it's closest to origin)
    const centerTile = mergedCollection.tiles.find(
      (tile) => tile.getDataUrlHash() === tiles1[0].getDataUrlHash()
    );
    expect(centerTile).toBeDefined();
    expect(centerTile!.id).toBe("tile_0_0");

    // The merged center tile should have borders from both original center tiles
    // North border from first collection
    expect(centerTile!.borders.north.has("tile_1_0")).toBe(true);
    // East border from first collection
    expect(centerTile!.borders.east.has("tile_2_1")).toBe(true);
    // South border from second collection
    expect(centerTile!.borders.south.has("tile_0_1")).toBe(true);
    // East border from second collection (should be merged with existing east borders)
    expect(centerTile!.borders.east.has("tile_1_0")).toBe(true);
  });

  test("should handle empty collections", () => {
    const emptyCollection1 = TileCollection.fromTiles([], 0, 0, 0, 0, 0);
    const emptyCollection2 = TileCollection.fromTiles([], 0, 0, 0, 0, 0);

    const mergedCollection = emptyCollection1.mergeWith(emptyCollection2);

    expect(mergedCollection.tiles.length).toBe(0);
    expect(mergedCollection.getCount()).toBe(0);
  });

  test("should handle merging with empty collection", () => {
    const tiles: Tile[] = [
      new Tile("data:image/png;base64,tile1", 0, 0, 32, 32, 2, 2, undefined),
    ];

    (tiles[0] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(),
    };

    const collection1 = TileCollection.fromTiles(tiles, 1, 32, 32, 1, 1);
    const emptyCollection = TileCollection.fromTiles([], 0, 0, 0, 0, 0);

    const mergedCollection = collection1.mergeWith(emptyCollection);

    expect(mergedCollection.tiles.length).toBe(1);
    expect(mergedCollection.tiles[0].id).toBe("tile_0_0");
  });

  test("should update dimensions correctly when merging", () => {
    const tiles1: Tile[] = [
      new Tile("data:image/png;base64,tile1", 0, 0, 32, 32, 2, 2, undefined),
    ];

    const collection1 = TileCollection.fromTiles(tiles1, 1, 64, 32, 2, 1);

    const tiles2: Tile[] = [
      new Tile("data:image/png;base64,tile2", 0, 0, 32, 32, 3, 3, undefined),
    ];

    const collection2 = TileCollection.fromTiles(tiles2, 1, 96, 96, 3, 3);

    const mergedCollection = collection1.mergeWith(collection2);

    // Should use the larger dimensions
    expect(mergedCollection.imageWidth).toBe(96);
    expect(mergedCollection.imageHeight).toBe(96);
    expect(mergedCollection.tilesX).toBe(3);
    expect(mergedCollection.tilesY).toBe(3);
  });
});

describe("TileCollection - Enhanced Merge Duplicate Tests", () => {
  test("should correctly merge tiles with complex adjacency patterns", () => {
    // Create a 3x3 grid where the center and corners are identical
    const tiles: Tile[] = [
      // Top row
      new Tile("data:image/png;base64,corner", 0, 0, 32, 32, 3, 3, undefined),
      new Tile("data:image/png;base64,edge", 1, 0, 32, 32, 3, 3, undefined),
      new Tile("data:image/png;base64,corner", 2, 0, 32, 32, 3, 3, undefined),
      // Middle row
      new Tile("data:image/png;base64,edge", 0, 1, 32, 32, 3, 3, undefined),
      new Tile("data:image/png;base64,center", 1, 1, 32, 32, 3, 3, undefined),
      new Tile("data:image/png;base64,edge", 2, 1, 32, 32, 3, 3, undefined),
      // Bottom row
      new Tile("data:image/png;base64,corner", 0, 2, 32, 32, 3, 3, undefined),
      new Tile("data:image/png;base64,edge", 1, 2, 32, 32, 3, 3, undefined),
      new Tile("data:image/png;base64,corner", 2, 2, 32, 32, 3, 3, undefined),
    ];

    // Set up borders for all tiles
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const x = tile.x;
      const y = tile.y;

      (tile as any).borders = {
        north: new Set(),
        east: new Set(),
        south: new Set(),
        west: new Set(),
      };

      // Add borders based on position
      if (y > 0) (tile as any).borders.north.add(`tile_${x}_${y - 1}`);
      if (x < 2) (tile as any).borders.east.add(`tile_${x + 1}_${y}`);
      if (y < 2) (tile as any).borders.south.add(`tile_${x}_${y + 1}`);
      if (x > 0) (tile as any).borders.west.add(`tile_${x - 1}_${y}`);
    }

    const collection = TileCollection.fromTiles(tiles, 9, 96, 96, 3, 3);
    const mergedCollection = collection.mergeDuplicateTiles();

    // Should have 3 tiles after merging (corner, edge, center)
    expect(mergedCollection.tiles.length).toBe(3);

    // Find the merged corner tile (should be tile_0_0 as it's closest to origin)
    const cornerTile = mergedCollection.tiles.find(
      (tile) => tile.getDataUrlHash() === tiles[0].getDataUrlHash()
    );
    expect(cornerTile).toBeDefined();
    expect(cornerTile!.id).toBe("tile_0_0");

    // The merged corner tile should NOT have self-borders since the original corner tiles were not adjacent
    // (0,0) and (2,0) are not adjacent (dx=2), and (0,0) and (0,2) are not adjacent (dy=2)
    expect(cornerTile!.borders.east.has("tile_0_0")).toBe(false);
    expect(cornerTile!.borders.south.has("tile_0_0")).toBe(false);
  });

  test("should handle tiles with no adjacent duplicates", () => {
    const tiles: Tile[] = [
      new Tile("data:image/png;base64,unique1", 0, 0, 32, 32, 2, 2, undefined),
      new Tile("data:image/png;base64,unique2", 1, 0, 32, 32, 2, 2, undefined),
      new Tile("data:image/png;base64,unique3", 0, 1, 32, 32, 2, 2, undefined),
      new Tile("data:image/png;base64,unique4", 1, 1, 32, 32, 2, 2, undefined),
    ];

    // Set up borders
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const x = tile.x;
      const y = tile.y;

      (tile as any).borders = {
        north: new Set(),
        east: new Set(),
        south: new Set(),
        west: new Set(),
      };

      if (y > 0) (tile as any).borders.north.add(`tile_${x}_${y - 1}`);
      if (x < 1) (tile as any).borders.east.add(`tile_${x + 1}_${y}`);
      if (y < 1) (tile as any).borders.south.add(`tile_${x}_${y + 1}`);
      if (x > 0) (tile as any).borders.west.add(`tile_${x - 1}_${y}`);
    }

    const collection = TileCollection.fromTiles(tiles, 4, 64, 64, 2, 2);
    const mergedCollection = collection.mergeDuplicateTiles();

    // Should have 4 tiles (no duplicates to merge)
    expect(mergedCollection.tiles.length).toBe(4);

    // All tiles should remain unchanged
    for (const tile of mergedCollection.tiles) {
      const originalTile = tiles.find((t) => t.id === tile.id);
      expect(originalTile).toBeDefined();
      expect(tile.getDataUrlHash()).toBe(originalTile!.getDataUrlHash());
    }
  });

  test("should preserve border relationships after merging", () => {
    const tiles: Tile[] = [
      new Tile(
        "data:image/png;base64,duplicate",
        0,
        0,
        32,
        32,
        3,
        2,
        undefined
      ),
      new Tile(
        "data:image/png;base64,duplicate",
        1,
        0,
        32,
        32,
        3,
        2,
        undefined
      ),
      new Tile("data:image/png;base64,neighbor", 2, 0, 32, 32, 3, 2, undefined),
      new Tile("data:image/png;base64,other", 0, 1, 32, 32, 3, 2, undefined),
    ];

    // Set up borders
    (tiles[0] as any).borders = {
      north: new Set(),
      east: new Set(["tile_1_0"]),
      south: new Set(["tile_0_1"]),
      west: new Set(),
    };
    (tiles[1] as any).borders = {
      north: new Set(),
      east: new Set(["tile_2_0"]),
      south: new Set(),
      west: new Set(["tile_0_0"]),
    };
    (tiles[2] as any).borders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(["tile_1_0"]),
    };
    (tiles[3] as any).borders = {
      north: new Set(["tile_0_0"]),
      east: new Set(),
      south: new Set(),
      west: new Set(),
    };

    const collection = TileCollection.fromTiles(tiles, 4, 96, 64, 3, 2);
    const mergedCollection = collection.mergeDuplicateTiles();

    // Should have 3 tiles after merging
    expect(mergedCollection.tiles.length).toBe(3);

    // Find the merged duplicate tile
    const mergedTile = mergedCollection.tiles.find(
      (tile) => tile.getDataUrlHash() === tiles[0].getDataUrlHash()
    );
    expect(mergedTile).toBeDefined();
    expect(mergedTile!.id).toBe("tile_0_0");

    // Should have borders to both neighbor and other tiles
    expect(mergedTile!.borders.east.has("tile_2_0")).toBe(true); // From tile_1_0's east border
    expect(mergedTile!.borders.south.has("tile_0_1")).toBe(true); // From tile_0_0's south border

    // Should have self-border for east/west (adjacent duplicates)
    expect(mergedTile!.borders.east.has("tile_0_0")).toBe(true);
    expect(mergedTile!.borders.west.has("tile_0_0")).toBe(true);
  });
});
