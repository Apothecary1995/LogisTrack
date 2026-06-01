import { useEffect, useState, useCallback } from "react";
import { getPending, deletePending, countPending } from "../lib/offlineDB";

export function useOfflineSync(authRequest) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateCount = useCallback(async () => {
    const count = await countPending();
    setPendingCount(count);
  }, []);

  const syncPending = useCallback(async (onSynced) => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);

    try {
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
          if (err.isAuthError) {
            console.warn("[Sync] Auth error, aborting sync.");
            throw err;
          }
          if (err.message && (
            err.message.includes("already exists") ||
            err.message.includes("unique") ||
            err.message.includes("400") ||
            err.message.includes("409")
          )) {
            console.log("[Sync] Duplicate trip, removing from pending:", item.id);
            await deletePending("pending_trips", item.id);
          }
        }
      }

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
          if (err.isAuthError) {
            console.warn("[Sync] Auth error, aborting sync.");
            throw err;
          }
          if (err.message && (
            err.message.includes("already exists") ||
            err.message.includes("unique") ||
            err.message.includes("400") ||
            err.message.includes("409")
          )) {
            console.log("[Sync] Duplicate detected, removing from pending:", item.id);
            await deletePending("pending_vehicles", item.id);
          }
        }
      }

      const serviceRepairs = await getPending("pending_service_repairs");
      for (const item of serviceRepairs) {
        try {
          await authRequest("/service-repairs/", {
            method: "POST",
            body: JSON.stringify(item.data),
          });
          await deletePending("pending_service_repairs", item.id);
          console.log("[Sync] Service repair synced:", item.id);
        } catch (err) {
          console.error("[Sync] Service repair failed:", err);
          if (err.isAuthError) {
            console.warn("[Sync] Auth error, aborting sync.");
            throw err;
          }
          if (err.message && (
            err.message.includes("already exists") ||
            err.message.includes("unique") ||
            err.message.includes("400") ||
            err.message.includes("409")
          )) {
            console.log("[Sync] Duplicate service, removing:", item.id);
            await deletePending("pending_service_repairs", item.id);
          }
        }
      }

      const fuelEntries = await getPending("pending_fuel_entries");
      for (const item of fuelEntries) {
        try {
          await authRequest("/fuel-entries/", {
            method: "POST",
            body: JSON.stringify(item.data),
          });
          await deletePending("pending_fuel_entries", item.id);
          console.log("[Sync] Fuel entry synced:", item.id);
        } catch (err) {
          console.error("[Sync] Fuel entry failed:", err);
          if (err.isAuthError) {
            console.warn("[Sync] Auth error, aborting sync.");
            throw err;
          }
          if (err.message && (
            err.message.includes("already exists") ||
            err.message.includes("unique") ||
            err.message.includes("400") ||
            err.message.includes("409")
          )) {
            console.log("[Sync] Duplicate fuel entry, removing:", item.id);
            await deletePending("pending_fuel_entries", item.id);
          }
        }
      }

      await updateCount();
      if (onSynced) onSynced();
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
