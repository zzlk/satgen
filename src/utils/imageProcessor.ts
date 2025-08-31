import { Tile } from "./Tile";
import { TileCollection } from "./TileCollection";

export interface TileDimensions {
  width: number;
  height: number;
}

export interface ProcessImageOptions {
  imageUrl: string;
  tileWidth: number;
  tileHeight: number;
  onProgress?: (progress: number) => void;
}

export interface ProcessImageResult {
  tiles: TileCollection;
}

/**
 * Checks if a tile is pure black (masking tile)
 * @param imageData - Image data from canvas
 * @param width - Width of the tile
 * @param height - Height of the tile
 * @returns True if the tile is pure black
 */
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

/**
 * Processes an image and cuts it into tiles of specified dimensions
 * @param options - Configuration options for image processing
 * @returns Promise that resolves with the processed tiles and metadata
 */
export function processImageIntoTiles(
  options: ProcessImageOptions
): Promise<ProcessImageResult> {
  const { imageUrl, tileWidth, tileHeight, onProgress } = options;

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

        const tilesX = Math.ceil(imageWidth / tileWidth);
        const tilesY = Math.ceil(imageHeight / tileHeight);
        const totalTiles = tilesX * tilesY;

        const tiles: Tile[] = [];
        const existingTileIds = new Set<string>();
        let processedTiles = 0;
        let excludedTiles = 0;

        // First pass: identify which tiles will exist (not pure black)
        for (let y = 0; y < tilesY; y++) {
          for (let x = 0; x < tilesX; x++) {
            canvas.width = tileWidth;
            canvas.height = tileHeight;

            // Clear canvas
            ctx.clearRect(0, 0, tileWidth, tileHeight);

            // Calculate source coordinates
            const sourceX = x * tileWidth;
            const sourceY = y * tileHeight;

            // Calculate actual tile dimensions (handle edge cases)
            const actualTileWidth = Math.min(tileWidth, imageWidth - sourceX);
            const actualTileHeight = Math.min(
              tileHeight,
              imageHeight - sourceY
            );

            // Draw the tile
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

            // Check if this is a pure black tile (masking tile)
            const imageData = ctx.getImageData(
              0,
              0,
              actualTileWidth,
              actualTileHeight
            );

            if (
              !isPureBlackTile(imageData, actualTileWidth, actualTileHeight)
            ) {
              // This tile will exist, add its ID to the set
              existingTileIds.add(`tile_${x}_${y}`);
            }
          }
        }

        // Second pass: create tiles for non-black tiles
        for (let y = 0; y < tilesY; y++) {
          for (let x = 0; x < tilesX; x++) {
            canvas.width = tileWidth;
            canvas.height = tileHeight;

            // Clear canvas
            ctx.clearRect(0, 0, tileWidth, tileHeight);

            // Calculate source coordinates
            const sourceX = x * tileWidth;
            const sourceY = y * tileHeight;

            // Calculate actual tile dimensions (handle edge cases)
            const actualTileWidth = Math.min(tileWidth, imageWidth - sourceX);
            const actualTileHeight = Math.min(
              tileHeight,
              imageHeight - sourceY
            );

            // Draw the tile
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

            // Check if this is a pure black tile (masking tile)
            const imageData = ctx.getImageData(
              0,
              0,
              actualTileWidth,
              actualTileHeight
            );

            if (isPureBlackTile(imageData, actualTileWidth, actualTileHeight)) {
              // Skip pure black tiles - they are masking tiles
              excludedTiles++;
              processedTiles++;

              // Report progress if callback provided
              if (onProgress) {
                onProgress(processedTiles / totalTiles);
              }
              continue;
            }

            // Convert to data URL and create Tile object
            const tileDataUrl = canvas.toDataURL("image/png");
            const tile = Tile.create(
              tileDataUrl,
              x,
              y,
              actualTileWidth,
              actualTileHeight,
              tilesX,
              tilesY,
              existingTileIds
            );
            tiles.push(tile);

            processedTiles++;

            // Report progress if callback provided
            if (onProgress) {
              onProgress(processedTiles / totalTiles);
            }
          }
        }

        console.log(
          `Processed ${totalTiles} tiles, excluded ${excludedTiles} pure black tiles, kept ${tiles.length} tiles`
        );

        resolve({
          tiles: TileCollection.fromTiles(
            tiles,
            tiles.length, // Use actual number of tiles, not total
            imageWidth,
            imageHeight,
            tilesX,
            tilesY
          ),
        });
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
