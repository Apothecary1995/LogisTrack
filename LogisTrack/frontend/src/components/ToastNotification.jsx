import { useEffect, useState } from "react";

export function ToastNotification({ toasts, onRemove }) {
  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => onRemove(toast.id)}
          style={{
            background: "#1a1a1a",
            color: "white",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            maxWidth: "320px",
            cursor: "pointer",
            borderLeft: `4px solid ${toast.color || "#3b82f6"}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            animation: "slideIn 0.2s ease",
          }}
        >
          <div style={{ fontWeight: "600", marginBottom: "2px" }}>{toast.title}</div>
          <div style={{ opacity: 0.8 }}>{toast.message}</div>
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const addToast = (title, message, color) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}