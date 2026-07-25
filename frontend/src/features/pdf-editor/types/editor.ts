import type { Page } from './canvas';

export type EditorTool =
  | 'select'
  | 'hand'
  | 'text'
  | 'image'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'draw'
  | 'highlight'
  | 'measure'
  | 'signature'
  | 'comment';

export type EditorMode = 'edit' | 'view' | 'comment';

export interface EditorViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface EditorSelection {
  objectId: string | null;
  objectIds: string[];
  tool: EditorTool;
}

export interface EditorAutosave {
  enabled: boolean;
  intervalMs: number;
  lastSavedAt: number | null;
  isSaving: boolean;
  isDirty: boolean;
}

export interface EditorHistory {
  undoStack: string[];
  redoStack: string[];
  maxSize: number;
}

export interface PdfEditorState {
  documentId: string | null;
  inspectionId: string | null;
  mode: EditorMode;
  pages: Page[];
  currentPageIndex: number;
  viewport: EditorViewport;
  selection: EditorSelection;
  autosave: EditorAutosave;
  history: EditorHistory;
  isLoading: boolean;
  error: string | null;
}

export interface PdfEditorActions {
  setDocument: (documentId: string, inspectionId: string) => void;
  setMode: (mode: EditorMode) => void;
  setPages: (pages: Page[]) => void;
  setCurrentPage: (index: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPan: (x: number, y: number) => void;
  setTool: (tool: EditorTool) => void;
  selectObject: (objectId: string | null) => void;
  selectObjects: (objectIds: string[]) => void;
  clearSelection: () => void;
  setAutosave: (config: Partial<EditorAutosave>) => void;
  markDirty: () => void;
  markClean: () => void;
  pushHistory: (snapshot: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}
