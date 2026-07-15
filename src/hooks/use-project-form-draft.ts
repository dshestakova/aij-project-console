"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectFormDraftOptions<TForm> = {
  enabled: boolean;
  form: TForm;
  initialForm: TForm;
  storageKey: string;
  confirmMessage?: string;
};

export function useProjectFormDraft<TForm>({
  confirmMessage = "Есть несохраненные изменения. Уйти без сохранения?",
  enabled,
  form,
  initialForm,
  storageKey,
}: ProjectFormDraftOptions<TForm>) {
  const [pendingDraft, setPendingDraft] = useState<TForm | null>(null);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const serializedForm = useMemo(() => JSON.stringify(form), [form]);
  const serializedInitialForm = useMemo(
    () => JSON.stringify(initialForm),
    [initialForm],
  );
  const hasUnsavedChanges = serializedForm !== serializedInitialForm;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const rawDraft = sessionStorage.getItem(storageKey);

    if (!rawDraft || rawDraft === serializedInitialForm) {
      return;
    }

    let timeoutId: number | null = null;

    try {
      const parsedDraft = JSON.parse(rawDraft) as TForm;

      timeoutId = window.setTimeout(() => {
        setPendingDraft(parsedDraft);
      }, 0);
    } catch {
      sessionStorage.removeItem(storageKey);
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [enabled, serializedInitialForm, storageKey]);

  useEffect(() => {
    if (!enabled || pendingDraft) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!hasUnsavedChanges) {
        sessionStorage.removeItem(storageKey);
        setDraftStatus(null);
        return;
      }

      sessionStorage.setItem(storageKey, serializedForm);
      setDraftStatus("Черновик сохранен");
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [
    enabled,
    hasUnsavedChanges,
    pendingDraft,
    serializedForm,
    storageKey,
  ]);

  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, hasUnsavedChanges]);

  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (
        anchor.target ||
        anchor.hasAttribute("download") ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (!window.confirm(confirmMessage)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [confirmMessage, enabled, hasUnsavedChanges]);

  function clearDraft() {
    sessionStorage.removeItem(storageKey);
    setPendingDraft(null);
    setDraftStatus(null);
  }

  function restoreDraft(onRestore: (draft: TForm) => void) {
    if (!pendingDraft) {
      return;
    }

    onRestore(pendingDraft);
    setPendingDraft(null);
    setDraftStatus("Черновик восстановлен");
  }

  function discardDraft() {
    clearDraft();
  }

  return {
    clearDraft,
    discardDraft,
    draftStatus,
    hasPendingDraft: Boolean(pendingDraft),
    hasUnsavedChanges,
    restoreDraft,
  };
}
