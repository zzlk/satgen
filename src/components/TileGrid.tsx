import React, { useRef, useEffect, useMemo, useCallback } from "react";

interface TileGridProps {
  state: Array<Set<string>> | null;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  enhancedTiles: any[];
  iteration: number;
}

// Canvas-based tile grid component for better performance
const TileGrid: React.FC<TileGridProps> = ({
  state,
  width,
  height,
  tileWidth,
  tileHeight,
  enhancedTiles,
  iteration,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileImageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Create a stable tile lookup map
  const tileLookup = useMemo(() => {
    const lookup = new Map<string, any>();
    for (const tile of enhancedTiles) {
      lookup.set(tile.id, tile);
    }
    return lookup;
  }, [enhancedTiles]);

  const maxPossibilities = enhancedTiles.length;

  // Calculate the maximum available width (accounting for some padding)
  const maxAvailableWidth = Math.min(window.innerWidth - 40, 1200); // Leave some margin
  const maxAvailableHeight = Math.min(window.innerHeight - 200, 800); // Leave space for UI elements

  // Calculate the scale factor to fit the grid within available space
  const scaleX = maxAvailableWidth / (width * tileWidth);
  const scaleY = maxAvailableHeight / (height * tileHeight);
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

  // Calculate the scaled dimensions
  const scaledTileWidth = tileWidth * scale;
  const scaledTileHeight = tileHeight * scale;
  const totalWidth = width * scaledTileWidth;
  const totalHeight = height * scaledTileHeight;

  // Preload tile images for better performance
  const preloadTileImages = useCallback(async () => {
    const promises: Promise<void>[] = [];

    for (const tile of enhancedTiles) {
      if (!tileImageCache.current.has(tile.id)) {
        const img = new Image();
        const promise = new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () =>
            reject(new Error(`Failed to load tile: ${tile.id}`));
        });
        img.src = tile.dataUrl;
        tileImageCache.current.set(tile.id, img);
        promises.push(promise);
      }
    }

    await Promise.all(promises);
  }, [enhancedTiles]);

  // Render a single cell to canvas
  const renderCell = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      cellPossibilities: Set<string>
    ) => {
      const drawX = x * scaledTileWidth;
      const drawY = y * scaledTileHeight;

      if (cellPossibilities.size === 0) {
        // Empty cell - render red X on black background
        ctx.fillStyle = "#000000";
        ctx.fillRect(drawX, drawY, scaledTileWidth, scaledTileHeight);

        // Draw red X
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = Math.max(
          2,
          Math.min(scaledTileWidth, scaledTileHeight) / 16
        );
        ctx.beginPath();
        ctx.moveTo(
          drawX + scaledTileWidth * 0.2,
          drawY + scaledTileHeight * 0.2
        );
        ctx.lineTo(
          drawX + scaledTileWidth * 0.8,
          drawY + scaledTileHeight * 0.8
        );
        ctx.moveTo(
          drawX + scaledTileWidth * 0.8,
          drawY + scaledTileHeight * 0.2
        );
        ctx.lineTo(
          drawX + scaledTileWidth * 0.2,
          drawY + scaledTileHeight * 0.8
        );
        ctx.stroke();
      } else if (cellPossibilities.size === 1) {
        // Collapsed cell - draw the single tile
        const tileId = Array.from(cellPossibilities)[0];
        const tileImg = tileImageCache.current.get(tileId);
        if (tileImg) {
          ctx.drawImage(
            tileImg,
            drawX,
            drawY,
            scaledTileWidth,
            scaledTileHeight
          );
        }
      } else {
        // Uncertain cell - render based on number of possibilities
        // Create gradient based on number of possibilities
        const possibilityRatio = cellPossibilities.size / maxPossibilities;

        // Color from purple (many possibilities) to blue (few possibilities)
        const hue = 240 + possibilityRatio * 60; // 240 (blue) to 300 (purple)
        const saturation = 70;
        const lightness = 60 - possibilityRatio * 20; // 60 to 40

        const gradient = ctx.createLinearGradient(
          drawX,
          drawY,
          drawX + scaledTileWidth,
          drawY + scaledTileHeight
        );
        gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
        gradient.addColorStop(
          1,
          `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`
        );

        ctx.fillStyle = gradient;
        ctx.fillRect(drawX, drawY, scaledTileWidth, scaledTileHeight);

        // Add possibility count
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${
          Math.min(scaledTileWidth, scaledTileHeight) / 4
        }px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          cellPossibilities.size.toString(),
          drawX + scaledTileWidth / 2,
          drawY + scaledTileHeight / 2
        );

        // Add border
        ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, scaledTileWidth, scaledTileHeight);
      }
    },
    [scaledTileWidth, scaledTileHeight, maxPossibilities]
  );

  // Render the entire grid to canvas
  const renderGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state || state.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, totalWidth, totalHeight);

    // Handle dimension mismatch by creating a compatible state
    const expectedLength = width * height;
    let compatibleState = state;

    if (state.length !== expectedLength) {
      console.warn(
        `State array length (${state.length}) doesn't match expected dimensions (${expectedLength}). Creating compatible state.`
      );

      // Create a new state array with the expected dimensions
      compatibleState = new Array(expectedLength);

      // Calculate the old grid dimensions from the state length
      const oldLength = state.length;
      const oldWidth = Math.sqrt(oldLength);
      const oldHeight = oldLength / oldWidth;

      // Fill the new state array
      for (let i = 0; i < expectedLength; i++) {
        const newX = i % width;
        const newY = Math.floor(i / width);

        // Map new coordinates to old coordinates (with bounds checking)
        const oldX = Math.floor((newX / width) * oldWidth);
        const oldY = Math.floor((newY / height) * oldHeight);
        const oldIndex = oldY * oldWidth + oldX;

        if (oldIndex >= 0 && oldIndex < oldLength) {
          compatibleState[i] = state[oldIndex];
        } else {
          // If out of bounds, create an empty set
          compatibleState[i] = new Set();
        }
      }
    }

    // Render each cell
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cellIndex = y * width + x;
        const cellPossibilities = compatibleState[cellIndex];

        // Safety check: if the state array doesn't match the expected dimensions,
        // don't render this cell to avoid errors
        if (cellPossibilities && cellPossibilities.size !== undefined) {
          renderCell(ctx, x, y, cellPossibilities);
        }
      }
    }
  }, [state, width, height, totalWidth, totalHeight, renderCell]);

  // Initialize canvas and preload images
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Preload images and then render
    preloadTileImages()
      .then(() => {
        renderGrid();
      })
      .catch(console.error);
  }, [totalWidth, totalHeight, preloadTileImages, renderGrid]);

  // Re-render when state changes
  useEffect(() => {
    if (state && state.length > 0) {
      renderGrid();
    }
  }, [state, renderGrid]);

  if (!state || state.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
      }}
    >
      {/* Canvas container */}
      <div
        style={{
          width: totalWidth,
          height: totalHeight,
          position: "relative",
          border: "1px solid #ccc",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: totalWidth,
            height: totalHeight,
            display: "block",
            imageRendering: "pixelated", // For better pixel art display
          }}
        />
      </div>

      {/* Iteration overlay */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0, 0, 0, 0.7)",
          color: "#FFFFFF",
          padding: "5px 10px",
          borderRadius: "4px",
          fontSize: "16px",
          fontFamily: "Arial",
          zIndex: 10,
        }}
      >
        Iteration: {iteration}
      </div>
    </div>
  );
};

export default TileGrid;
