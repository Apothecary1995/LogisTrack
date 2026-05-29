import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import "./styles.css";

registerSW({
  onNeedRefresh() {
    // let the user restart and savar
    const ok = window.confirm(
      "Yeni bir uygulama versiyonu hazır. Şimdi güncellensin mi?"
    );
    if (ok) window.location.reload();
  },
  onOfflineReady() {
    console.log("[PWA] Uygulama offline kullanıma hazır!");
  },
  onRegisteredSW(swUrl, r) {
    //check udates every 60 min
    r && setInterval(() => r.update(), 60 * 60 * 1000);
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);