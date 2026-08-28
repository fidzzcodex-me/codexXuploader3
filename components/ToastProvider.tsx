"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState
} from "react";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { showToast: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), 4000);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-8">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const variantStyles: Record<ToastVariant, string> = {
    success: "bg-ink text-white",
    error: "bg-red-500 text-white",
    info: "bg-primary-500 text-white"
  };

  return (
    <div
      onClick={onDismiss}
      className={`pointer-events-auto flex max-w-sm cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-glow ${variantStyles[toast.variant]}`}
      style={{
        animation: "toastIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards"
      }}
    >
      <span className="truncate">{toast.message}</span>
    </div>
  );
}
