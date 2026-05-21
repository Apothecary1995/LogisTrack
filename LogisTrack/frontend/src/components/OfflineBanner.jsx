import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      background: '#ef4444',
      color: 'white',
      textAlign: 'center',
      padding: '8px 16px',
      fontSize: '14px',
      position: 'sticky',
      top: 0,
      zIndex: 9999
    }}>
      You are offline. Changes will sync automatically when you're back online.
    </div>
  );
}