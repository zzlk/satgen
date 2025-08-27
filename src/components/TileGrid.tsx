import React, { useMemo } from "react";

interface TileGridProps {
  state: Array<Set<string>> | null;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  enhancedTiles: any[];
  iteration: number;
}

// Simple tile cell component without complex memoization
const TileCell: React.FC<{
  cellPossibilities: Set<string>;
  tileWidth: number;
  tileHeight: number;
  tileLookup: Map<string, any>;
  maxPossibilities: number;
  x: number;
  y: number;
}> = ({
  cellPossibilities,
  tileWidth,
  tileHeight,
  tileLookup,
  maxPossibilities,
  x,
  y,
}) => {
  const cellContent = useMemo(() => {
    if (cellPossibilities.size === 0) {
      // Empty cell - render red X on black background
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = tileWidth;
        canvas.height = tileHeight;

        // Fill with black background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, tileWidth, tileHeight);

        // Draw red X
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = Math.max(2, Math.min(tileWidth, tileHeight) / 16);
        ctx.beginPath();
        ctx.moveTo(tileWidth * 0.2, tileHeight * 0.2);
        ctx.lineTo(tileWidth * 0.8, tileHeight * 0.8);
        ctx.moveTo(tileWidth * 0.8, tileHeight * 0.2);
        ctx.lineTo(tileWidth * 0.2, tileHeight * 0.8);
        ctx.stroke();

        return canvas.toDataURL("image/png");
      }
    } else if (cellPossibilities.size === 1) {
      // Collapsed cell - return the single tile's data URL
      const tileId = Array.from(cellPossibilities)[0];
      const tile = tileLookup.get(tileId);
      if (tile) {
        return tile.dataUrl;
      }
    } else {
      // Uncertain cell - render based on number of possibilities
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = tileWidth;
        canvas.height = tileHeight;

        // Create gradient based on number of possibilities
        const possibilityRatio = cellPossibilities.size / maxPossibilities;

        // Color from purple (many possibilities) to blue (few possibilities)
        const hue = 240 + possibilityRatio * 60; // 240 (blue) to 300 (purple)
        const saturation = 70;
        const lightness = 60 - possibilityRatio * 20; // 60 to 40

        const gradient = ctx.createLinearGradient(0, 0, tileWidth, tileHeight);
        gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
        gradient.addColorStop(
          1,
          `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`
        );

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, tileWidth, tileHeight);

        // Add possibility count
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${Math.min(tileWidth, tileHeight) / 4}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          cellPossibilities.size.toString(),
          tileWidth / 2,
          tileHeight / 2
        );

        // Add border
        ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, tileWidth, tileHeight);

        return canvas.toDataURL("image/png");
      }
    }

    return null;
  }, [cellPossibilities, tileWidth, tileHeight, tileLookup, maxPossibilities]);

  if (!cellContent) {
    return null;
  }

  return (
    <img
      src={cellContent}
      alt={`Tile at (${x}, ${y})`}
      style={{
        width: tileWidth,
        height: tileHeight,
        display: "block",
        position: "absolute",
        left: x * tileWidth,
        top: y * tileHeight,
        imageRendering: "pixelated", // For better pixel art display
      }}
    />
  );
};

// Simple tile grid component
const TileGrid: React.FC<TileGridProps> = ({
  state,
  width,
  height,
  tileWidth,
  tileHeight,
  enhancedTiles,
  iteration,
}) => {
  if (!state || state.length === 0) {
    return null;
  }

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
      {/* Container for the tile grid */}
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
        {/* Render each cell as a separate img element */}
        {Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) => {
            const cellIndex = y * width + x;
            const cellPossibilities = state[cellIndex];

            return (
              <TileCell
                key={`${x}-${y}`}
                cellPossibilities={cellPossibilities}
                tileWidth={scaledTileWidth}
                tileHeight={scaledTileHeight}
                tileLookup={tileLookup}
                maxPossibilities={maxPossibilities}
                x={x}
                y={y}
              />
            );
          })
        )}
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
