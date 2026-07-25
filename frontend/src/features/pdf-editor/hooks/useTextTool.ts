import { useRef, useCallback } from 'react';
import { Canvas, Textbox } from 'fabric';
import { useEditorStore } from '../store';

interface TextToolOptions {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  fill?: string;
  textAlign?: string;
  underline?: boolean;
  lineHeight?: number;
  charSpacing?: number;
}

export function useTextTool(fabricRef: React.MutableRefObject<Canvas | null>) {
  const { markDirty, pushHistory } = useEditorStore();
  const optionsRef = useRef<TextToolOptions>({});

  const setOptions = useCallback((options: TextToolOptions) => {
    optionsRef.current = { ...optionsRef.current, ...options };
  }, []);

  const createText = useCallback(
    (x: number, y: number, initialText?: string) => {
      if (!fabricRef.current) return null;

      const text = new Textbox(initialText || 'Haz clic para editar', {
        left: x,
        top: y,
        fontSize: optionsRef.current.fontSize || 16,
        fontFamily: optionsRef.current.fontFamily || 'Inter',
        fontWeight: (optionsRef.current.fontWeight as string) || 'normal',
        fontStyle: (optionsRef.current.fontStyle as 'normal' | 'italic') || 'normal',
        fill: optionsRef.current.fill || '#000000',
        textAlign: (optionsRef.current.textAlign as 'left' | 'center' | 'right' | 'justify') || 'left',
        underline: optionsRef.current.underline || false,
        lineHeight: optionsRef.current.lineHeight || 1.4,
        charSpacing: optionsRef.current.charSpacing || 0,
        width: 250,
        padding: 5,
        editable: true,
        splitByGrapheme: false,
      });

      fabricRef.current.add(text);
      fabricRef.current.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      fabricRef.current.renderAll();

      markDirty();
      const json = JSON.stringify(fabricRef.current.toJSON());
      pushHistory(json);

      return text;
    },
    [fabricRef, markDirty, pushHistory]
  );

  const updateTextProperties = useCallback(
    (objectId: string, properties: TextToolOptions) => {
      if (!fabricRef.current) return;

      const objects = fabricRef.current.getObjects();
      const obj = objects.find((o) => (o as unknown as { id?: string }).id === objectId);
      if (!obj || !(obj instanceof Textbox)) return;

      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined) {
          obj.set(key as string, value);
        }
      });

      fabricRef.current.renderAll();
      markDirty();
    },
    [fabricRef, markDirty]
  );

  const formatSelection = useCallback(
    (properties: TextToolOptions) => {
      if (!fabricRef.current) return;

      const activeObj = fabricRef.current.getActiveObject();
      if (!activeObj || !(activeObj instanceof Textbox)) return;

      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined) {
          activeObj.set(key as string, value);
        }
      });

      fabricRef.current.renderAll();
      markDirty();
    },
    [fabricRef, markDirty]
  );

  return {
    createText,
    updateTextProperties,
    formatSelection,
    setOptions,
  };
}
