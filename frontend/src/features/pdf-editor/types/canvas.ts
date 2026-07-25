import type { FabricObject } from 'fabric';

export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
  selection: boolean;
  preserveObjectStacking: boolean;
  enableRetinaScaling: boolean;
}

export interface PageSize {
  width: number;
  height: number;
  label: string;
}

export interface Page {
  id: string;
  index: number;
  width: number;
  height: number;
  pdfBytes?: Uint8Array;
  fabricJson?: string;
  backgroundDataUrl?: string;
  rotation: number;
  isVisible: boolean;
  isDirty: boolean;
}

export interface RenderOptions {
  scale: number;
  pageIndex: number;
  canvas: HTMLCanvasElement;
}

export interface RenderResult {
  width: number;
  height: number;
  dataUrl: string;
}

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
  type: 'pdf' | 'elements' | 'annotations' | 'overlay';
}

export interface FabricObjectMetadata {
  id: string;
  layerId: string;
  type: string;
  createdAt: number;
  createdBy: string;
}

export type ExtendedFabricObject = FabricObject & {
  metadata?: FabricObjectMetadata;
};

export interface CanvasEvents {
  'object:selected': { target: FabricObject };
  'selection:cleared': Record<string, never>;
  'object:modified': { target: FabricObject };
  'object:moving': { target: FabricObject };
  'object:scaling': { target: FabricObject };
  'object:rotating': { target: FabricObject };
  'mouse:down': { e: MouseEvent | TouchEvent };
  'mouse:move': { e: MouseEvent | TouchEvent };
  'mouse:up': { e: MouseEvent | TouchEvent };
  'mouse:wheel': { e: WheelEvent };
}
