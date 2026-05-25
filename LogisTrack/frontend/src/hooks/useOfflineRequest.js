import { useCallback } from "react";
import { savePending } from "../lib/offlineDB";

export function useOfflineRequest(authRequest) {
  const offlinePost = useCallback(async (path, data, storeName) => {
    if (!navigator.onLine) {
      await savePending(storeName, data);
      console.log(`[Offline] Saved to ${storeName}:`, data);
      return { offline: true, message: "Kaydedildi. İnternet gelince gönderilecek." };
    }

    try {
      const result = await authRequest(path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return result;
    } catch (err) {
      console.warn("[OfflineRequest] Request failed, saving locally:", err.message);
      await savePending(storeName, data);
      return { offline: true, message: "Bağlantı hatası. Yerel olarak kaydedildi." };
    }
  }, [authRequest]);

  return { offlinePost };
}