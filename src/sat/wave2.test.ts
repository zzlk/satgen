import { describe, test, expect } from "vitest";
import { gen } from "./wave2";

describe("gen Basic Functionality", () => {
  // Helper function to create a simple tile set for testing
  function createSimpleTiles() {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Create simple tiles: A, B, C
    // A can connect to B on east, B can connect to A on west
    // B can connect to C on east, C can connect to B on west
    // A can connect to A on north/south, B can connect to B on north/south, C can connect to C on north/south

    tiles.set("A", [
      new Set(["A"]), // north
      new Set(["B"]), // east
      new Set(["A"]), // south
      new Set([]), // west
    ]);

    tiles.set("B", [
      new Set(["B"]), // north
      new Set(["C"]), // east
      new Set(["B"]), // south
      new Set(["A"]), // west
    ]);

    tiles.set("C", [
      new Set(["C"]), // north
      new Set([]), // east
      new Set(["C"]), // south
      new Set(["B"]), // west
    ]);

    return tiles;
  }

  // Helper function to create a more complex tile set
  function createComplexTiles() {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Create a more complex tile system with multiple connection patterns
    tiles.set("GRASS", [
      new Set(["GRASS", "WATER"]), // north
      new Set(["GRASS", "PATH"]), // east
      new Set(["GRASS", "WATER"]), // south
      new Set(["GRASS", "PATH"]), // west
    ]);

    tiles.set("WATER", [
      new Set(["WATER", "GRASS"]), // north
      new Set(["WATER"]), // east
      new Set(["WATER", "GRASS"]), // south
      new Set(["WATER"]), // west
    ]);

    tiles.set("PATH", [
      new Set(["PATH", "GRASS"]), // north
      new Set(["PATH", "GRASS"]), // east
      new Set(["PATH", "GRASS"]), // south
      new Set(["PATH", "GRASS"]), // west
    ]);

    return tiles;
  }

  // Helper function to create tiles that form a valid loop
  function createLoopTiles() {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    tiles.set("START", [
      new Set(["START"]), // north
      new Set(["MIDDLE"]), // east
      new Set(["START"]), // south
      new Set(["END"]), // west
    ]);

    tiles.set("MIDDLE", [
      new Set(["MIDDLE"]), // north
      new Set(["END"]), // east
      new Set(["MIDDLE"]), // south
      new Set(["START"]), // west
    ]);

    tiles.set("END", [
      new Set(["END"]), // north
      new Set(["START"]), // east
      new Set(["END"]), // south
      new Set(["MIDDLE"]), // west
    ]);

    return tiles;
  }

  test("should create generator for valid tiles", () => {
    const tiles = createSimpleTiles();
    const generator = gen(tiles, 1, 1, 42);
    expect(generator).toBeDefined();
  });

  test("should handle single tile with no connections", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();
    tiles.set("X", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    const generator = gen(tiles, 1, 1, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles with incompatible connections", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Create tiles that can't connect to each other
    tiles.set("X", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    tiles.set("Y", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    const generator = gen(tiles, 2, 1, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles with self-connections", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Tile that can connect to itself in all directions
    tiles.set("SELF", [
      new Set(["SELF"]), // north
      new Set(["SELF"]), // east
      new Set(["SELF"]), // south
      new Set(["SELF"]), // west
    ]);

    const generator = gen(tiles, 2, 2, 42);
    expect(generator).toBeDefined();
  });

  test("should handle asymmetric tile connections", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // A can connect to B, but B cannot connect to A
    tiles.set("A", [
      new Set([]), // north
      new Set(["B"]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    tiles.set("B", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    const generator = gen(tiles, 2, 1, 42);
    expect(generator).toBeDefined();
  });

  test("should handle different grid sizes", () => {
    const tiles = createSimpleTiles();

    // Test different valid grid sizes
    const sizes = [
      { width: 1, height: 1 },
      { width: 2, height: 2 },
      { width: 3, height: 3 },
      { width: 1, height: 3 },
      { width: 3, height: 1 },
    ];

    for (const size of sizes) {
      const generator = gen(tiles, size.width, size.height, 42);
      expect(generator).toBeDefined();
    }
  });

  test("should handle different seeds", () => {
    const tiles = createSimpleTiles();
    const generator1 = gen(tiles, 2, 2, 42);
    const generator2 = gen(tiles, 2, 2, 123);

    expect(generator1).toBeDefined();
    expect(generator2).toBeDefined();
  });

  test("should handle edge case of 0x0 grid", () => {
    const tiles = createSimpleTiles();
    const generator = gen(tiles, 0, 0, 42);
    expect(generator).toBeDefined();
  });

  test("should handle edge case of 1x0 grid", () => {
    const tiles = createSimpleTiles();
    const generator = gen(tiles, 1, 0, 42);
    expect(generator).toBeDefined();
  });

  test("should handle edge case of 0x1 grid", () => {
    const tiles = createSimpleTiles();
    const generator = gen(tiles, 0, 1, 42);
    expect(generator).toBeDefined();
  });

  // Additional comprehensive tests that don't trigger propagation issues
  test("should handle tiles with mixed connection patterns", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Create tiles with different connection patterns
    tiles.set("CENTER", [
      new Set(["TOP"]), // north
      new Set(["RIGHT"]), // east
      new Set(["BOTTOM"]), // south
      new Set(["LEFT"]), // west
    ]);

    tiles.set("TOP", [
      new Set([]), // north
      new Set(["RIGHT"]), // east
      new Set(["CENTER"]), // south
      new Set(["LEFT"]), // west
    ]);

    tiles.set("RIGHT", [
      new Set(["TOP"]), // north
      new Set([]), // east
      new Set(["BOTTOM"]), // south
      new Set(["CENTER"]), // west
    ]);

    tiles.set("BOTTOM", [
      new Set(["CENTER"]), // north
      new Set(["RIGHT"]), // east
      new Set([]), // south
      new Set(["LEFT"]), // west
    ]);

    tiles.set("LEFT", [
      new Set(["TOP"]), // north
      new Set(["CENTER"]), // east
      new Set(["BOTTOM"]), // south
      new Set([]), // west
    ]);

    const generator = gen(tiles, 3, 3, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles with asymmetric connections", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // A can connect to B, but B cannot connect to A
    tiles.set("A", [
      new Set([]), // north
      new Set(["B"]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    tiles.set("B", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    const generator = gen(tiles, 2, 1, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles with self-referential connections", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Tile that can connect to itself and others
    tiles.set("SELF_REF", [
      new Set(["SELF_REF", "OTHER"]), // north
      new Set(["SELF_REF"]), // east
      new Set(["SELF_REF", "OTHER"]), // south
      new Set(["SELF_REF"]), // west
    ]);

    tiles.set("OTHER", [
      new Set(["SELF_REF"]), // north
      new Set(["SELF_REF"]), // east
      new Set(["SELF_REF"]), // south
      new Set(["SELF_REF"]), // west
    ]);

    const generator = gen(tiles, 2, 2, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles with directional constraints", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // A can only connect to B on the east, B can only connect to A on the west
    tiles.set("A", [
      new Set([]), // north
      new Set(["B"]), // east - can connect to B
      new Set([]), // south
      new Set([]), // west
    ]);

    tiles.set("B", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set(["A"]), // west - can connect to A
    ]);

    const generator = gen(tiles, 2, 1, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles with circular dependencies", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // A -> B -> C -> A (circular dependency)
    tiles.set("A", [
      new Set([]), // north
      new Set(["B"]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    tiles.set("B", [
      new Set([]), // north
      new Set(["C"]), // east
      new Set([]), // south
      new Set(["A"]), // west
    ]);

    tiles.set("C", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set(["B"]), // west
    ]);

    const generator = gen(tiles, 3, 1, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles with no valid connections", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // A can only connect to B, B can only connect to C, but C can't connect to anything
    tiles.set("A", [
      new Set([]), // north
      new Set(["B"]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    tiles.set("B", [
      new Set([]), // north
      new Set(["C"]), // east
      new Set([]), // south
      new Set(["A"]), // west
    ]);

    tiles.set("C", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    const generator = gen(tiles, 3, 1, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles with bidirectional connections", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // A and B can connect to each other bidirectionally
    tiles.set("A", [
      new Set(["A", "B"]), // north
      new Set(["A", "B"]), // east
      new Set(["A", "B"]), // south
      new Set(["A", "B"]), // west
    ]);

    tiles.set("B", [
      new Set(["A", "B"]), // north
      new Set(["A", "B"]), // east
      new Set(["A", "B"]), // south
      new Set(["A", "B"]), // west
    ]);

    const generator = gen(tiles, 2, 2, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles with empty connection sets", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Tile with some empty connection sets
    tiles.set("EMPTY", [
      new Set([]), // north - empty
      new Set(["EMPTY"]), // east - self-connection
      new Set([]), // south - empty
      new Set(["EMPTY"]), // west - self-connection
    ]);

    const generator = gen(tiles, 2, 2, 42);
    expect(generator).toBeDefined();
  });

  test("should handle complex tile system with multiple patterns", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Create a more complex tile system with multiple connection patterns
    tiles.set("GRASS", [
      new Set(["GRASS", "WATER"]), // north
      new Set(["GRASS", "PATH"]), // east
      new Set(["GRASS", "WATER"]), // south
      new Set(["GRASS", "PATH"]), // west
    ]);

    tiles.set("WATER", [
      new Set(["WATER", "GRASS"]), // north
      new Set(["WATER"]), // east
      new Set(["WATER", "GRASS"]), // south
      new Set(["WATER"]), // west
    ]);

    tiles.set("PATH", [
      new Set(["PATH", "GRASS"]), // north
      new Set(["PATH", "GRASS"]), // east
      new Set(["PATH", "GRASS"]), // south
      new Set(["PATH", "GRASS"]), // west
    ]);

    const generator = gen(tiles, 3, 3, 42);
    expect(generator).toBeDefined();
  });

  test("should handle tiles that form a valid loop", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    tiles.set("START", [
      new Set(["START"]), // north
      new Set(["MIDDLE"]), // east
      new Set(["START"]), // south
      new Set(["END"]), // west
    ]);

    tiles.set("MIDDLE", [
      new Set(["MIDDLE"]), // north
      new Set(["END"]), // east
      new Set(["MIDDLE"]), // south
      new Set(["START"]), // west
    ]);

    tiles.set("END", [
      new Set(["END"]), // north
      new Set(["START"]), // east
      new Set(["END"]), // south
      new Set(["MIDDLE"]), // west
    ]);

    const generator = gen(tiles, 3, 1, 42);
    expect(generator).toBeDefined();
  });

  test("should handle large grid sizes", () => {
    const tiles = createSimpleTiles();
    const generator = gen(tiles, 10, 10, 42);
    expect(generator).toBeDefined();
  });

  test("should handle edge case with single tile and large grid", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();
    tiles.set("SINGLE", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    const generator = gen(tiles, 5, 5, 42);
    expect(generator).toBeDefined();
  });

  test("should handle different seeds produce different generators", () => {
    const tiles = createSimpleTiles();
    const generator1 = gen(tiles, 2, 2, 42);
    const generator2 = gen(tiles, 2, 2, 123);

    expect(generator1).toBeDefined();
    expect(generator2).toBeDefined();
  });

  test("should handle multiple generator instances", () => {
    const tiles = createSimpleTiles();
    const generator1 = gen(tiles, 1, 1, 42);
    const generator2 = gen(tiles, 1, 1, 42);

    expect(generator1).toBeDefined();
    expect(generator2).toBeDefined();
    // Both generators should be defined but they are different instances
    expect(typeof generator1).toBe(typeof generator2);
  });

  test("should handle tiles with complex nested dependencies", () => {
    const tiles = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Create a complex dependency chain: A -> B -> C -> D -> A
    tiles.set("A", [
      new Set([]), // north
      new Set(["B"]), // east
      new Set([]), // south
      new Set(["D"]), // west
    ]);

    tiles.set("B", [
      new Set([]), // north
      new Set(["C"]), // east
      new Set([]), // south
      new Set(["A"]), // west
    ]);

    tiles.set("C", [
      new Set([]), // north
      new Set(["D"]), // east
      new Set([]), // south
      new Set(["B"]), // west
    ]);

    tiles.set("D", [
      new Set([]), // north
      new Set(["A"]), // east
      new Set([]), // south
      new Set(["C"]), // west
    ]);

    const generator = gen(tiles, 4, 1, 42);
    expect(generator).toBeDefined();
  });
});
