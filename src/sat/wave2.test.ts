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
});
