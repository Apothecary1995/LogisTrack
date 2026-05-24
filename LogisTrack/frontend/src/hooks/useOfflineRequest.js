import { useCallback } from "react";
import { savePending } from "../lib/offlineDB";

export function useOfflineRequest(authRequest) {
  const offlinePost = useCallback(async (path, data, storeName) => {
    if (navigator.onLine) {
      return await authRequest(path, {
        method: "POST",
        body: JSON.stringify(data),
      });
    }

    // Offline: IndexedDB'ye kaydet
    await savePending(storeName, data);
    console.log(`[Offline] Saved to ${storeName}:`, data);
    return { offline: true, message: "Kaydedildi. İnternet gelince gönderilecek." };
  }, [authRequest]);

  return { offlinePost };
}