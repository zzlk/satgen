import { TileCollection } from "./TileCollection";

export class Tile {
  public readonly id: string;
  public readonly imageData: ImageData;
  public readonly x: number;
  public readonly y: number;
  public readonly width: number;
  public readonly height: number;
  public readonly borders: [Set<string>, Set<string>, Set<string>, Set<string>];

  constructor(
    tileId: string,
    dataUrl: ImageData,
    x: number,
    y: number,
    width: number,
    height: number,
    borders: [Set<string>, Set<string>, Set<string>, Set<string>]
  ) {
    this.id = tileId;
    this.imageData = dataUrl;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.borders = borders;
  }
}

function isPureBlackTile(
  imageData: ImageData,
  width: number,
  height: number
): boolean {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Check if pixel is not pure black (RGB all 0) or has some transparency
    if (r > 0 || g > 0 || b > 0 || a < 255) {
      return false;
    }
  }

  return true;
}

function generateId() {
  const chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 24; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export function processImageIntoTiles(
  imageUrl: string,
  tileWidth: number,
  tileHeight: number
): Promise<TileCollection> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        const imageWidth = img.width;
        const imageHeight = img.height;

        if (imageWidth <= 0 || imageHeight <= 0) {
          throw new Error("Invalid image dimensions");
        }

        if (imageWidth % tileWidth !== 0 || imageHeight % tileHeight !== 0) {
          throw new Error(
            "Image dimensions must be divisible by tile dimensions"
          );
        }

        const tilesX = imageWidth / tileWidth;
        const tilesY = imageHeight / tileHeight;

        const tiles: {
          tileId: string;
          imageData: ImageData;
          hash: number;
          x: number;
          y: number;
        }[] = [];

        const tileHashMap = new Map<
          number,
          {
            tileId: string;
            borderInfo: [Set<string>, Set<string>, Set<string>, Set<string>];
          }[]
        >();

        const DIRECTIONS = [
          { dx: 0, dy: 1 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: -1, dy: 0 },
        ];

        {
          const tileIdMap = new Array(tilesX * tilesY)
            .fill(null)
            .map(() => generateId());

          for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
              canvas.width = tileWidth;
              canvas.height = tileHeight;

              ctx.clearRect(0, 0, tileWidth, tileHeight);

              const sourceX = x * tileWidth;
              const sourceY = y * tileHeight;

              const actualTileWidth = Math.min(tileWidth, imageWidth - sourceX);
              const actualTileHeight = Math.min(
                tileHeight,
                imageHeight - sourceY
              );

              ctx.drawImage(
                img,
                sourceX,
                sourceY,
                actualTileWidth,
                actualTileHeight,
                0,
                0,
                actualTileWidth,
                actualTileHeight
              );

              const imageData = ctx.getImageData(
                0,
                0,
                actualTileWidth,
                actualTileHeight
              );

              let hash = imageData.data.reduce((hash, pixel) => {
                return (hash * 7 + pixel) & 0xffffffff;
              }, 0);

              // create border info
              const borderInfo: [
                Set<string>,
                Set<string>,
                Set<string>,
                Set<string>
              ] = [
                new Set<string>(),
                new Set<string>(),
                new Set<string>(),
                new Set<string>(),
              ];

              for (let i = 0; i < DIRECTIONS.length; i++) {
                const { dx, dy } = DIRECTIONS[i];
                const neighborX = x + dx;
                const neighborY = y + dy;

                if (
                  neighborX < 0 ||
                  neighborX >= tilesX ||
                  neighborY < 0 ||
                  neighborY >= tilesY
                ) {
                  continue;
                }

                borderInfo[i].add(tileIdMap[neighborY * tilesX + neighborX]);
              }

              tiles.push({
                tileId: tileIdMap[y * tilesX + x],
                imageData,
                hash,
                x,
                y,
              });

              // add to hash map
              if (tileHashMap.has(hash) === false) {
                tileHashMap.set(hash, []);
              }
              tileHashMap
                .get(hash)!
                .push({ tileId: tileIdMap[y * tilesX + x], borderInfo });
            }
          }
        }

        const outputTiles: Tile[] = [];

        // merge duplicates
        for (const tile of tiles) {
          const hash = tile.hash;
          const duplicates = tileHashMap.get(hash)!;

          if (duplicates.length === 1) {
            outputTiles.push(
              new Tile(
                tile.tileId,
                tile.imageData,
                tile.x,
                tile.y,
                tileWidth,
                tileHeight,
                duplicates[0].borderInfo
              )
            );

            continue;
          }

          if (duplicates.length > 1) {
            // merge border infos
            const borderInfo: [
              Set<string>,
              Set<string>,
              Set<string>,
              Set<string>
            ] = [
              new Set<string>(),
              new Set<string>(),
              new Set<string>(),
              new Set<string>(),
            ];

            for (const duplicate of duplicates) {
              for (let i = 0; i < borderInfo.length; i++) {
                for (const id of duplicate.borderInfo[i]) {
                  borderInfo[i].add(id);
                }
              }
            }

            outputTiles.push(
              new Tile(
                tile.tileId,
                tile.imageData,
                tile.x,
                tile.y,
                tileWidth,
                tileHeight,
                borderInfo
              )
            );

            continue;
          }

          throw new Error("zero duplicates in hash map..?");
        }

        resolve(
          TileCollection.fromTiles(
            tiles,
            tiles.length, // Use actual number of tiles, not total
            imageWidth,
            imageHeight,
            tilesX,
            tilesY
          )
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = imageUrl;
  });
}
