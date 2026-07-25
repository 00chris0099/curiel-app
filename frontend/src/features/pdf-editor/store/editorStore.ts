import { create } from 'zustand';
import type { PdfEditorState, PdfEditorActions, EditorTool } from '../types';
import { DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, HISTORY_MAX_SIZE, AUTOSAVE_INTERVAL_MS } from '../constants';

const initialSelection = {
  objectId: null,
  objectIds: [],
  tool: 'select' as EditorTool,
};

const initialState: PdfEditorState = {
  documentId: null,
  inspectionId: null,
  mode: 'edit',
  pages: [],
  currentPageIndex: 0,
  viewport: {
    zoom: DEFAULT_ZOOM,
    panX: 0,
    panY: 0,
  },
  selection: initialSelection,
  autosave: {
    enabled: true,
    intervalMs: AUTOSAVE_INTERVAL_MS,
    lastSavedAt: null,
    isSaving: false,
    isDirty: false,
  },
  history: {
    undoStack: [],
    redoStack: [],
    maxSize: HISTORY_MAX_SIZE,
  },
  isLoading: false,
  error: null,
};

export const useEditorStore = create<PdfEditorState & PdfEditorActions>((set, get) => ({
  ...initialState,

  setDocument: (documentId, inspectionId) => {
    set({ documentId, inspectionId, isLoading: true, error: null });
  },

  setMode: (mode) => set({ mode }),

  setPages: (pages) => set({ pages, isLoading: false }),

  setCurrentPage: (index) => {
    const { pages } = get();
    if (index >= 0 && index < pages.length) {
      set({ currentPageIndex: index });
    }
  },

  nextPage: () => {
    const { currentPageIndex, pages } = get();
    if (currentPageIndex < pages.length - 1) {
      set({ currentPageIndex: currentPageIndex + 1 });
    }
  },

  prevPage: () => {
    const { currentPageIndex } = get();
    if (currentPageIndex > 0) {
      set({ currentPageIndex: currentPageIndex - 1 });
    }
  },

  setZoom: (zoom) => {
    const clamped = Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
    set((state) => ({
      viewport: { ...state.viewport, zoom: clamped },
    }));
  },

  zoomIn: () => {
    const { viewport } = get();
    const newZoom = Math.min(viewport.zoom + ZOOM_STEP, MAX_ZOOM);
    set((state) => ({
      viewport: { ...state.viewport, zoom: newZoom },
    }));
  },

  zoomOut: () => {
    const { viewport } = get();
    const newZoom = Math.max(viewport.zoom - ZOOM_STEP, MIN_ZOOM);
    set((state) => ({
      viewport: { ...state.viewport, zoom: newZoom },
    }));
  },

  resetZoom: () => {
    set((state) => ({
      viewport: { ...state.viewport, zoom: DEFAULT_ZOOM, panX: 0, panY: 0 },
    }));
  },

  setPan: (x, y) => {
    set((state) => ({
      viewport: { ...state.viewport, panX: x, panY: y },
    }));
  },

  setTool: (tool) => {
    set((state) => ({
      selection: { ...state.selection, tool },
    }));
  },

  selectObject: (objectId) => {
    set((state) => ({
      selection: {
        ...state.selection,
        objectId,
        objectIds: objectId ? [objectId] : [],
      },
    }));
  },

  selectObjects: (objectIds) => {
    set((state) => ({
      selection: {
        ...state.selection,
        objectId: objectIds[0] || null,
        objectIds,
      },
    }));
  },

  clearSelection: () => {
    set((state) => ({
      selection: { ...state.selection, objectId: null, objectIds: [] },
    }));
  },

  setAutosave: (config) => {
    set((state) => ({
      autosave: { ...state.autosave, ...config },
    }));
  },

  markDirty: () => {
    set((state) => ({
      autosave: { ...state.autosave, isDirty: true },
    }));
  },

  markClean: () => {
    set((state) => ({
      autosave: { ...state.autosave, isDirty: false, lastSavedAt: Date.now() },
    }));
  },

  pushHistory: (snapshot) => {
    set((state) => {
      const newUndoStack = [...state.history.undoStack, snapshot];
      if (newUndoStack.length > state.history.maxSize) {
        newUndoStack.shift();
      }
      return {
        history: {
          ...state.history,
          undoStack: newUndoStack,
          redoStack: [],
        },
      };
    });
  },

  undo: () => {
    const { history } = get();
    if (history.undoStack.length === 0) return null;

    const newUndoStack = [...history.undoStack];
    const snapshot = newUndoStack.pop()!;

    set((state) => ({
      history: {
        ...state.history,
        undoStack: newUndoStack,
        redoStack: [...state.history.redoStack, snapshot],
      },
    }));

    return snapshot;
  },

  redo: () => {
    const { history } = get();
    if (history.redoStack.length === 0) return null;

    const newRedoStack = [...history.redoStack];
    const snapshot = newRedoStack.pop()!;

    set((state) => ({
      history: {
        ...state.history,
        undoStack: [...state.history.undoStack, snapshot],
        redoStack: newRedoStack,
      },
    }));

    return snapshot;
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  reset: () => set(initialState),
}));
