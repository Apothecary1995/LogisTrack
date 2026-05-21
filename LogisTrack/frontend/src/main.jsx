import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import PouchDB from "pouchdb";
import PouchDBFind from "pouchdb-find";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import "./styles.css";

// PouchDB global olarak başlat
PouchDB.plugin(PouchDBFind);
window.__PouchDB = PouchDB;

const localDB = new PouchDB("logistrack");
const remoteDB = new PouchDB("https://couchdb.ahmetcengiz.dev/trips", {
  auth: {
    username: "logistrack",
    password: "logistrack_pass",
  },
});

localDB.sync(remoteDB, {
  live: true,
  retry: true,
})
.on("change", () => console.log("[Sync] Changed"))
.on("paused", () => console.log("[Sync] Paused"))
.on("active", () => console.log("[Sync] Active"))
.on("error", (err) => console.error("[Sync] Error:", err));

window.__localDB = localDB;

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