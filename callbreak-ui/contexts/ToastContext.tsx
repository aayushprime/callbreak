"use client";
import clsx from "clsx";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

type ToastColor = "red" | "green" | "blue";

type Toast = {
  id: number;
  message: string;
  duration: number;
  color: ToastColor;
  progress: number;
};

type ToastContextType = {
  addToast: (
    message: string,
    options?: { duration?: number; color?: ToastColor }
  ) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (
      message: string,
      options: { duration?: number; color?: ToastColor } = {}
    ) => {
      const { duration = 5000, color = "red" } = options;
      const newToast: Toast = {
        id: Date.now(),
        message,
        duration,
        color,
        progress: 100,
      };
      setToasts((prevToasts) => [...prevToasts, newToast]);
    },
    []
  );

  const removeToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setToasts((prevToasts) =>
        prevToasts.map((toast) => ({
          ...toast,
          progress: toast.progress - 100 / (toast.duration / 100),
        }))
      );
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.progress <= 0) {
        removeToast(toast.id);
      }
    });
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        style={{ zIndex: 9999, transform: "translateZ(0)" }}
        className="fixed top-0 left-1/2 -translate-x-1/2 p-4 w-full max-w-md"
      >
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastComponent({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const bgColor = {
    red: "bg-red-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
  }[toast.color];

  return (
    <div
      className={clsx(
        "relative text-white font-semibold py-3 px-10 rounded-full shadow-lg transition-all duration-300 mb-2 overflow-hidden",
        "text-center",
        bgColor
      )}
    >
      {toast.message}
      <button
        onClick={onDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xl"
      >
        &times;
      </button>
      {/* Progress bar container */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-black/20 rounded-full">
        {/* Progress bar */}
        <div
          className="h-full bg-white"
          style={{ width: `${toast.progress}%` }}
        ></div>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
