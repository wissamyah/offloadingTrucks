import React from "react";
import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoadingsPage } from "./pages/LoadingsPage";
import { OffloadingsPage } from "./pages/OffloadingsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/loadings" element={<LoadingsPage />} />
      <Route path="/offloadings" element={<OffloadingsPage />} />
    </Routes>
  );
}

export default App;
