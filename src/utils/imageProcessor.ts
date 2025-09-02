import { Tile } from "./Tile";
import { TileCollection } from "./TileCollection";

// TODO: calculate the frequency of tiles in the original image so that when we generate those tiles we can do it in the same proportion as they appear in the original

function isPureBlackTile(
  imageData: Uint8ClampedArray,
  width: number,
  height: number
): boolean {
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];

    // Check if pixel is not pure black (RGB all 0) or has some transparency
    if (r > 0 || g > 0 || b > 0 || a < 255) {
      return false;
    }
  }

  return true;
}

export function bitBlt(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  destination: Uint8ClampedArray,
  destinationWidth: number,
  destinationHeight: number,

  sourceX: number,
  sourceY: number,

  destinationX: number,
  destinationY: number,

  width: number,
  height: number
) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let srcX = sourceX + x;
      let srcY = sourceY + y;

      if (srcX < 0 || srcX >= sourceWidth || srcY < 0 || srcY >= sourceHeight) {
        throw new Error("Invalid source coordinates", {
          cause: { srcX, srcY },
        });
      }

      let dstX = destinationX + x;
      let dstY = destinationY + y;

      if (
        dstX < 0 ||
        dstX >= destinationWidth ||
        dstY < 0 ||
        dstY >= destinationHeight
      ) {
        throw new Error("Invalid destination coordinates", {
          cause: { dstX, dstY },
        });
      }

      const sourceIndex = srcY * sourceWidth * 4 + srcX * 4;
      const destinationIndex = dstY * destinationWidth * 4 + dstX * 4;

      if (
        sourceIndex >= source.length ||
        destinationIndex >= destination.length
      ) {
        throw new Error("Invalid index", {
          cause: { sourceIndex, destinationIndex },
        });
      }

      destination[destinationIndex] = source[sourceIndex];
      destination[destinationIndex + 1] = source[sourceIndex + 1];
      destination[destinationIndex + 2] = source[sourceIndex + 2];
      destination[destinationIndex + 3] = source[sourceIndex + 3];
    }
  }
}

export async function processImageIntoTiles(
  imageData: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  tileWidth: number,
  tileHeight: number
): Promise<TileCollection> {
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("Invalid image dimensions");
  }

  if (imageWidth % tileWidth !== 0 || imageHeight % tileHeight !== 0) {
    throw new Error("Image dimensions must be divisible by tile dimensions");
  }

  const tilesX = imageWidth / tileWidth;
  const tilesY = imageHeight / tileHeight;

  const tiles: {
    tileId: string;
    imageData: Uint8ClampedArray;
    x: number;
    y: number;
  }[] = [];

  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      const tileImageData = new Uint8ClampedArray(tileWidth * tileHeight * 4);

      const sourceX = x * tileWidth;
      const sourceY = y * tileHeight;

      bitBlt(
        imageData,
        imageWidth,
        imageHeight,
        tileImageData,
        tileWidth,
        tileHeight,
        sourceX,
        sourceY,
        0,
        0,
        tileWidth,
        tileHeight
      );

      if (isPureBlackTile(tileImageData, tileWidth, tileHeight)) {
        let tileId = "";

        tiles.push({
          tileId,
          imageData: tileImageData,
          x,
          y,
        });
      } else {
        let tileId = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", tileImageData))
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        tiles.push({
          tileId,
          imageData: tileImageData,
          x,
          y,
        });
      }
    }
  }

  // calculate border info
  const DIRECTIONS = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 },
  ];

  const borderInfo = new Map<
    string,
    [Set<string>, Set<string>, Set<string>, Set<string>]
  >();

  for (let x = 0; x < tilesX; x++) {
    for (let y = 0; y < tilesY; y++) {
      const tile = tiles[y * tilesX + x];

      if (tile.tileId == "") {
        continue; // ignore null tiles.
      }

      if (borderInfo.has(tile.tileId) === false) {
        borderInfo.set(tile.tileId, [
          new Set<string>(),
          new Set<string>(),
          new Set<string>(),
          new Set<string>(),
        ]);
      }

      for (let dir = 0; dir < DIRECTIONS.length; dir++) {
        const { dx, dy } = DIRECTIONS[dir];
        const neighborX = x + dx;
        const neighborY = y + dy;
        const neighbor = tiles[neighborY * tilesX + neighborX];

        if (
          neighborX < 0 ||
          neighborX >= tilesX ||
          neighborY < 0 ||
          neighborY >= tilesY ||
          neighbor.tileId == ""
        ) {
          continue;
        }

        borderInfo.get(tile.tileId)![dir].add(neighbor.tileId);
      }
    }
  }

  // emit the canonical tiles.
  const alreadyEmitted = new Set<string>();
  let outputTiles: Tile[] = [];

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];

    if (tile.tileId == "") {
      continue; // ignore null tiles.
    }

    if (alreadyEmitted.has(tile.tileId) === true) {
      continue;
    }

    alreadyEmitted.add(tile.tileId);

    outputTiles.push(
      new Tile(
        tile.tileId,
        tile.imageData,
        tileWidth,
        tileHeight,
        borderInfo.get(tile.tileId)!,
        tile.x,
        tile.y
      )
    );
  }

  return new TileCollection(
    outputTiles,
    outputTiles.length,
    tileWidth,
    tileHeight
  );
}
