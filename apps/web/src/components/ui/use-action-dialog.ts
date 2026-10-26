"use client";

import { useEffect, useRef, useState } from "react";

import { pushToast } from "@/components/ui/toast";

type ActionFeedback = {
  success?: string | null;
};

/**
 * Tracks dialog open/dirty state and closes + toasts when a server action succeeds.
 */
export function useActionDialog(state: ActionFeedback) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const lastSuccess = useRef<string | null>(null);

  useEffect(() => {
    if (!state.success || state.success === lastSuccess.current) return;
    lastSuccess.current = state.success;
    setOpen(false);
    setDirty(false);
    pushToast(state.success, "success");
  }, [state.success]);

  function openDialog() {
    setDirty(false);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setDirty(false);
  }

  return {
    open,
    dirty,
    setDirty,
    openDialog,
    closeDialog,
  };
}
