import React, { useState, useEffect, useCallback, createContext, useContext } from "react";

const ToastContext = createContext();

/**
 * Toast notification component — auto-dismisses after 5 seconds.
 */
function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const iconMap = {
    error: "error",
    warning: "warning",
    success: "check_circle",
    info: "info",
  };

  const colorMap = {
    error: "bg-error-container text-on-error-container border-error/20",
    warning: "bg-tertiary-container/30 text-on-tertiary-container dark:text-tertiary border-tertiary/20",
    success: "bg-secondary-container/30 text-on-secondary-container border-secondary/20",
    info: "bg-primary-container/30 text-on-primary-container border-primary/20",
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm max-w-sm w-full animate-slide-up ${colorMap[toast.type] || colorMap.info}`}
    >
      <span className="material-symbols-outlined text-[20px] mt-0.5 shrink-0">
        {iconMap[toast.type] || "info"}
      </span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-label-md text-label-md font-semibold">{toast.title}</p>
        )}
        <p className="text-body-sm break-words">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-current opacity-60 hover:opacity-100 transition-opacity shrink-0"
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}

/**
 * Toast provider — wraps the app and provides showToast via context.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", title = null) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type, title }]); // Max 5 toasts
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container — fixed bottom-right */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-20 md:bottom-6 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
          aria-label="Notifications"
        >
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
