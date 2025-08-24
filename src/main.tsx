// Add Set intersection polyfill for wave2.ts
if (!Set.prototype.intersection) {
  Set.prototype.intersection = function (other: Set<any>): Set<any> {
    const result = new Set();
    for (const item of this) {
      if (other.has(item)) {
        result.add(item);
      }
    }
    return result;
  };
}

import { createRoot } from "react-dom/client";
import "./app.css";
import { BrowserRouter, Route, Routes } from "react-router";
import { StrictMode } from "react";
import Index from "./routes/index";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route index element={<Index />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
