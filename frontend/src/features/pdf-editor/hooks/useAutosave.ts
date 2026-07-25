import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../store';

export function useAutosave(saveFn: () => Promise<void>) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { autosave, markClean, setAutosave } = useEditorStore();

  const save = useCallback(async () => {
    if (!autosave.isDirty || autosave.isSaving) return;

    setAutosave({ isSaving: true });
    try {
      await saveFn();
      markClean();
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setAutosave({ isSaving: false });
    }
  }, [autosave.isDirty, autosave.isSaving, saveFn, markClean, setAutosave]);

  useEffect(() => {
    if (!autosave.enabled) return;

    intervalRef.current = setInterval(save, autosave.intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autosave.enabled, autosave.intervalMs, save]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autosave.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autosave.isDirty]);

  const saveNow = useCallback(async () => {
    setAutosave({ isSaving: true });
    try {
      await saveFn();
      markClean();
    } finally {
      setAutosave({ isSaving: false });
    }
  }, [saveFn, markClean, setAutosave]);

  return { saveNow };
}
