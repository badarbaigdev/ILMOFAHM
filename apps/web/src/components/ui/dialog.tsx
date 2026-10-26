"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";

type DialogSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export type AppDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  /** When true, backdrop / Escape ask before closing. */
  dirty?: boolean;
  /** Prevent closing while a submit is in flight. */
  busy?: boolean;
  tone?: "default" | "danger";
};

export function AppDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dirty = false,
  busy = false,
  tone = "default",
}: AppDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  function requestClose() {
    if (busy) return;
    if (dirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Close this dialog anyway?",
      );
      if (!confirmed) return;
    }
    onClose();
  }

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
    // requestClose closes over latest dirty/busy via render; re-bind on those.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open lifecycle
  }, [open, dirty, busy]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#0b1f33]/45 backdrop-blur-[1px]"
        onClick={requestClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-paper-elevated shadow-2xl sm:rounded-2xl ${SIZE_CLASS[size]}`}
      >
        <header
          className={`flex items-start gap-3 border-b border-line px-5 py-4 ${tone === "danger" ? "bg-red-50/60" : "bg-paper"}`}
        >
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-ink"
            >
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted hover:bg-paper-elevated hover:text-ink disabled:opacity-50"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  error,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      busy={busy}
      tone={tone}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className={
              tone === "danger"
                ? "rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                : "rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            }
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {children}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </AppDialog>
  );
}

export type FormDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: DialogSize;
  dirty?: boolean;
  busy?: boolean;
  error?: string | null;
  success?: string | null;
  submitLabel: string;
  cancelLabel?: string;
  formAction: (payload: FormData) => void;
  children: ReactNode;
  onDirtyChange?: (dirty: boolean) => void;
  tone?: "default" | "danger";
};

export function FormDialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  dirty = false,
  busy = false,
  error,
  success,
  submitLabel,
  cancelLabel = "Cancel",
  formAction,
  children,
  onDirtyChange,
  tone = "default",
}: FormDialogProps) {
  const formId = useId();

  function onInput() {
    onDirtyChange?.(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // Native required validation still runs; mark not dirty only after success via parent.
    void event;
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      dirty={dirty}
      busy={busy}
      tone={tone}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form={formId}
            disabled={busy}
            className={
              tone === "danger"
                ? "rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                : "rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            }
          >
            {busy ? "Saving…" : submitLabel}
          </button>
        </>
      }
    >
      <form
        id={formId}
        action={formAction}
        className="space-y-3"
        noValidate={false}
        onInput={onInput}
        onSubmit={onSubmit}
      >
        {children}
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="text-sm text-teal">
            {success}
          </p>
        ) : null}
      </form>
    </AppDialog>
  );
}

export function DialogField({
  id,
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
  inputMode,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  inputMode?: "decimal" | "numeric" | "email" | "tel" | "text";
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        inputMode={inputMode}
        className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
      />
    </div>
  );
}

export function DialogSelect({
  id,
  name,
  label,
  options,
  required,
  disabled,
  allowEmpty,
  emptyLabel = "Select…",
  defaultValue = "",
}: {
  id: string;
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal disabled:opacity-60"
      >
        <option value="">{allowEmpty ? "None" : emptyLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DialogTextarea({
  id,
  name,
  label,
  required,
  rows = 3,
  defaultValue,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  rows?: number;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
      />
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
