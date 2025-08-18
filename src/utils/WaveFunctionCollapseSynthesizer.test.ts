import { describe, test, expect } from "vitest";
import { WaveFunctionCollapseSynthesizer } from "./WaveFunctionCollapseSynthesizer";
import { Tile } from "./Tile";

describe("WaveFunctionCollapseSynthesizer", () => {
  // Create test tiles
  const createTestTiles = (): Tile[] => {
    const tiles: Tile[] = [];

    // Create a 2x2 grid of tiles
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        // Create a simple canvas for each tile
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = `rgb(${x * 128}, ${y * 128}, 128)`;
          ctx.fillRect(0, 0, 64, 64);
        }

        const tile = new Tile(canvas.toDataURL(), x, y, 64, 64, 2, 2);
        tiles.push(tile);
      }
    }

    return tiles;
  };

  test("should create synthesizer with tiles", () => {
    const tiles = createTestTiles();
    const synthesizer = new WaveFunctionCollapseSynthesizer(tiles);
    expect(synthesizer).toBeInstanceOf(WaveFunctionCollapseSynthesizer);
  });

  test("should throw error when no tiles provided", () => {
    expect(() => new WaveFunctionCollapseSynthesizer([])).toThrow(
      "No tiles available for synthesis"
    );
  });

  test("should convert tiles to tile data correctly", () => {
    const tiles = createTestTiles();
    const synthesizer = new WaveFunctionCollapseSynthesizer(tiles);

    // Access the private method for testing
    const tileData = (synthesizer as any).convertTilesToTileData();

    expect(tileData).toHaveLength(4);
    expect(tileData[0].id).toBe("tile_0_0");
    expect(tileData[0].width).toBe(64);
    expect(tileData[0].height).toBe(64);
    expect(tileData[0].borders.north).toEqual([]);
    expect(tileData[0].borders.east).toEqual(["tile_1_0"]);
    expect(tileData[0].borders.south).toEqual(["tile_0_1"]);
    expect(tileData[0].borders.west).toEqual([]);
  });

  test("should calculate compatibility score correctly", () => {
    const tiles = createTestTiles();
    const synthesizer = new WaveFunctionCollapseSynthesizer(tiles);

    // Create a simple arrangement for testing
    const arrangement = [
      ["tile_0_0", "tile_1_0"],
      ["tile_0_1", "tile_1_1"],
    ];

    const score = (synthesizer as any).calculateCompatibilityScore(arrangement);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("should throw error for invalid dimensions", async () => {
    const tiles = createTestTiles();
    const synthesizer = new WaveFunctionCollapseSynthesizer(tiles);

    // Try to synthesize with dimensions that are not multiples of tile size
    await expect(synthesizer.synthesize(100, 100)).rejects.toThrow(
      "must be a multiple of tile width"
    );
  });
});
