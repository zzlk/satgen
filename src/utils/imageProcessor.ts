import { Tile } from "./Tile";

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
  tiles: Tile[];
  totalTiles: number;
  imageWidth: number;
  imageHeight: number;
  tilesX: number;
  tilesY: number;
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
        const ctx = canvas.getContext("2d");

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
        let processedTiles = 0;

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

            // Convert to data URL and create Tile object
            const tileDataUrl = canvas.toDataURL("image/png");
            const tile = Tile.create(
              tileDataUrl,
              x,
              y,
              actualTileWidth,
              actualTileHeight,
              tilesX,
              tilesY
            );
            tiles.push(tile);

            processedTiles++;

            // Report progress if callback provided
            if (onProgress) {
              onProgress(processedTiles / totalTiles);
            }
          }
        }

        resolve({
          tiles,
          totalTiles,
          imageWidth,
          imageHeight,
          tilesX,
          tilesY,
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

/**
 * Validates tile dimensions
 * @param width - Tile width in pixels
 * @param height - Tile height in pixels
 * @returns True if dimensions are valid
 */
export function validateTileDimensions(width: number, height: number): boolean {
  return (
    width > 0 &&
    height > 0 &&
    Number.isInteger(width) &&
    Number.isInteger(height)
  );
}

/**
 * Calculates the number of tiles that will be generated for given image and tile dimensions
 * @param imageWidth - Original image width
 * @param imageHeight - Original image height
 * @param tileWidth - Tile width
 * @param tileHeight - Tile height
 * @returns Object with tile counts and dimensions
 */
export function calculateTileCount(
  imageWidth: number,
  imageHeight: number,
  tileWidth: number,
  tileHeight: number
): { tilesX: number; tilesY: number; totalTiles: number } {
  const tilesX = Math.ceil(imageWidth / tileWidth);
  const tilesY = Math.ceil(imageHeight / tileHeight);
  const totalTiles = tilesX * tilesY;

  return { tilesX, tilesY, totalTiles };
}
