import { useEffect, useState } from "react";
import { countPending } from "../lib/offlineDB";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const count = await countPending();
      setPending(count);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    countPending().then(setPending);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && pending === 0) return null;

  return (
    <div style={{
      background: isOnline ? "#f59e0b" : "#ef4444",
      color: "white",
      textAlign: "center",
      padding: "8px 16px",
      fontSize: "14px",
      position: "sticky",
      top: 0,
      zIndex: 9999,
    }}>
      {isOnline
        ? `${pending} syncing the data`
        : ` Offline mode .${pending > 0 ? ` ${pending} recording data.` : " data will be registered when online."}`
      }
    </div>
  );
}