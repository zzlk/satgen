import { describe, test, expect } from "vitest";
import { processImageIntoTiles } from "./imageProcessor";

describe("basic functionality", () => {
  test("should process 2x2 colored squares image into tiles", async () => {
    const imageWidth = 2;
    const imageHeight = 2;
    const imageData = new Uint8ClampedArray(imageWidth * imageHeight * 4);

    {
      const pixelView = new Uint32Array(imageData.buffer);
      pixelView[0 + 0 * 2] = 0xff0000ff; // Red bottom left
      pixelView[1 + 0 * 2] = 0x00ff00ff; // Green bottom right
      pixelView[0 + 1 * 2] = 0x0000ffff; // Blue top left
      pixelView[1 + 1 * 2] = 0x00ff00ff; // Green top right
    }

    const tileWidth = 1;
    const tileHeight = 1;

    const result = await processImageIntoTiles(
      imageData,
      imageWidth,
      imageHeight,
      tileWidth,
      tileHeight
    );

    console.log(
      "Result:",
      result.tiles.map((tile) => {
        return {
          ...tile,
        };
      })
    );

    // Verify the result structure
    expect(result.tiles.length).toBe(3);

    // bottom left
    expect(new Uint32Array(result.tiles[0].imageData.buffer)).toEqual(
      new Uint32Array([0xff0000ff])
    );
    expect(result.tiles[0].borders[0]).toEqual(new Set([result.tiles[2].id]));
    expect(result.tiles[0].borders[1]).toEqual(new Set([result.tiles[1].id]));
    expect(result.tiles[0].borders[2]).toEqual(new Set([]));
    expect(result.tiles[0].borders[3]).toEqual(new Set([]));

    // bottom right
    expect(new Uint32Array(result.tiles[1].imageData.buffer)).toEqual(
      new Uint32Array([0x00ff00ff])
    );
    expect(result.tiles[1].borders[0]).toEqual(new Set([result.tiles[1].id])); // top right deduped to bottom right.
    expect(result.tiles[1].borders[1]).toEqual(new Set([]));
    expect(result.tiles[1].borders[2]).toEqual(new Set([result.tiles[1].id]));
    expect(result.tiles[1].borders[3]).toEqual(
      new Set([result.tiles[0].id, result.tiles[2].id])
    );

    // top left
    expect(new Uint32Array(result.tiles[2].imageData.buffer)).toEqual(
      new Uint32Array([0x0000ffff])
    );
    expect(result.tiles[2].borders[0]).toEqual(new Set([]));
    expect(result.tiles[2].borders[1]).toEqual(new Set([result.tiles[1].id]));
    expect(result.tiles[2].borders[2]).toEqual(new Set([result.tiles[0].id]));
    expect(result.tiles[2].borders[3]).toEqual(new Set([]));
  });
});
