import type { EditorTool } from './editor';

export interface ToolConfig {
  id: EditorTool;
  name: string;
  icon: string;
  shortcut?: string;
  cursor: string;
  group: 'navigation' | 'creation' | 'annotation' | 'measurement';
}

export interface TextToolConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  underline: boolean;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  fill: string;
  lineHeight: number;
  charSpacing: number;
}

export interface ShapeToolConfig {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerSize: number;
  hasControls: boolean;
}

export interface DrawToolConfig {
  color: string;
  width: number;
  type: 'pen' | 'marker' | 'eraser';
  opacity: number;
}

export interface MeasureToolConfig {
  unit: 'm' | 'cm' | 'ft' | 'in';
  scale: number;
  color: string;
  fontSize: number;
}

export interface ImageToolConfig {
  maxWidth: number;
  maxHeight: number;
  maintainAspectRatio: boolean;
}
