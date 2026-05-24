import { useEffect, useState, useCallback } from "react";
import { getPending, deletePending, countPending } from "../lib/offlineDB";

export function useOfflineSync(authRequest) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateCount = useCallback(async () => {
    const count = await countPending();
    setPendingCount(count);
  }, []);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);

    try {
      // Sync trips
      const trips = await getPending("pending_trips");
      for (const item of trips) {
        try {
          await authRequest("/trips/", {
            method: "POST",
            body: JSON.stringify(item.data),
          });
          await deletePending("pending_trips", item.id);
          console.log("[Sync] Trip synced:", item.id);
        } catch (err) {
          console.error("[Sync] Trip failed:", err);
        }
      }

      // Sync vehicles
      const vehicles = await getPending("pending_vehicles");
      for (const item of vehicles) {
        try {
          await authRequest("/vehicles/", {
            method: "POST",
            body: JSON.stringify(item.data),
          });
          await deletePending("pending_vehicles", item.id);
          console.log("[Sync] Vehicle synced:", item.id);
        } catch (err) {
          console.error("[Sync] Vehicle failed:", err);
        }
      }

      await updateCount();
    } finally {
      setIsSyncing(false);
    }
  }, [authRequest, isSyncing, updateCount]);

  useEffect(() => {
    updateCount();

    window.addEventListener("online", syncPending);
    return () => window.removeEventListener("online", syncPending);
  }, [syncPending, updateCount]);

  return { pendingCount, isSyncing, syncPending };
}