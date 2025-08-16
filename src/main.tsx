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
