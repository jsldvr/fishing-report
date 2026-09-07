import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.tsx";
import { MissionProvider } from "./state/MissionProvider.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <MissionProvider>
        <App />
      </MissionProvider>
    </HashRouter>
  </React.StrictMode>
);
