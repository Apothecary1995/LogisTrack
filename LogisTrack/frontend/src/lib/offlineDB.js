const DB_NAME = "logistrack-offline";
const DB_VERSION = 2;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("pending_trips")) {
        db.createObjectStore("pending_trips", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("pending_vehicles")) {
        db.createObjectStore("pending_vehicles", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("pending_service_repairs")) {
        db.createObjectStore("pending_service_repairs", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("pending_fuel_entries")) {
        db.createObjectStore("pending_fuel_entries", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePending(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.add({ data, timestamp: Date.now(), synced: false });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPending(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePending(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function countPending() {
  const trips = await getPending("pending_trips");
  const vehicles = await getPending("pending_vehicles");
  const services = await getPending("pending_service_repairs");
  const fuels = await getPending("pending_fuel_entries");
  return trips.length + vehicles.length + services.length + fuels.length;
}