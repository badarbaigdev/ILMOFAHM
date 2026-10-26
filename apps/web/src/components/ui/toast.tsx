"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastListener = () => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();
let seq = 0;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot(): ToastItem[] {
  return [];
}

export function pushToast(message: string, tone: ToastTone = "success") {
  const id = `toast-${++seq}`;
  toasts = [...toasts, { id, message, tone }];
  emit();
  window.setTimeout(() => dismissToast(id), 4500);
  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function ToastHost() {
  const items = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const regionId = useId();

  if (items.length === 0) return null;

  return (
    <div
      id={regionId}
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const onDismiss = useCallback(() => dismissToast(item.id), [item.id]);

  const toneClass =
    item.tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : item.tone === "info"
        ? "border-sky-200 bg-sky-50 text-sky-950"
        : "border-emerald-200 bg-emerald-50 text-emerald-950";

  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-lg transition ${toneClass} ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
      <p className="min-w-0 flex-1">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 text-current/70 hover:bg-black/5 hover:text-current"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
