import { useRef, useCallback } from 'react';
import { Canvas, FabricImage } from 'fabric';
import { useEditorStore } from '../store';
import { applyFilters, DEFAULT_FILTER_CONFIG, type ImageFilterConfig } from '../utils/imageFilters';

interface ImageToolOptions {
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
}

export function useImageTool(fabricRef: React.MutableRefObject<Canvas | null>) {
  const { markDirty, pushHistory } = useEditorStore();
  const optionsRef = useRef<ImageToolOptions>({
    maxWidth: 400,
    maxHeight: 400,
    maintainAspectRatio: true,
  });

  const setOptions = useCallback((options: ImageToolOptions) => {
    optionsRef.current = { ...optionsRef.current, ...options };
  }, []);

  const addImageFromUrl = useCallback(
    async (url: string, position?: { x: number; y: number }) => {
      if (!fabricRef.current) return null;

      try {
        const img = await FabricImage.fromURL(url);

        const maxWidth = optionsRef.current.maxWidth || 400;
        const maxHeight = optionsRef.current.maxHeight || 400;
        const scale = Math.min(1, maxWidth / (img.width || 1), maxHeight / (img.height || 1));

        img.set({
          left: position?.x || 100,
          top: position?.y || 100,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          hasControls: true,
          borderColor: '#4a90d9',
          cornerColor: '#4a90d9',
          cornerStyle: 'circle',
          cornerSize: 8,
          transparentCorners: false,
        });

        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        fabricRef.current.renderAll();

        markDirty();
        const json = JSON.stringify(fabricRef.current.toJSON());
        pushHistory(json);

        return img;
      } catch (error) {
        console.error('Error loading image:', error);
        return null;
      }
    },
    [fabricRef, markDirty, pushHistory]
  );

  const addImageFromFile = useCallback(
    (file: File, position?: { x: number; y: number }) => {
      return new Promise<FabricImage | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            const img = await addImageFromUrl(dataUrl, position);
            resolve(img);
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    },
    [addImageFromUrl]
  );

  const applyImageFilter = useCallback(
    (objectId: string, filterConfig: ImageFilterConfig) => {
      if (!fabricRef.current) return;

      const objects = fabricRef.current.getObjects();
      const obj = objects.find((o) => (o as unknown as { id?: string }).id === objectId);
      if (!obj || !(obj instanceof FabricImage)) return;

      applyFilters(obj as unknown as { filters: unknown[]; applyFilters: () => void }, filterConfig);
      fabricRef.current.renderAll();
      markDirty();
    },
    [fabricRef, markDirty]
  );

  const resetImageFilters = useCallback(
    (objectId: string) => {
      if (!fabricRef.current) return;

      const objects = fabricRef.current.getObjects();
      const obj = objects.find((o) => (o as unknown as { id?: string }).id === objectId);
      if (!obj || !(obj instanceof FabricImage)) return;

      applyFilters(obj as unknown as { filters: unknown[]; applyFilters: () => void }, DEFAULT_FILTER_CONFIG);
      fabricRef.current.renderAll();
      markDirty();
    },
    [fabricRef, markDirty]
  );

  const cropImage = useCallback(
    (objectId: string, cropRect: { x: number; y: number; width: number; height: number }) => {
      if (!fabricRef.current) return;

      const objects = fabricRef.current.getObjects();
      const obj = objects.find((o) => (o as unknown as { id?: string }).id === objectId);
      if (!obj || !(obj instanceof FabricImage)) return;

      obj.set({
        cropX: cropRect.x,
        cropY: cropRect.y,
        width: cropRect.width,
        height: cropRect.height,
      });

      fabricRef.current.renderAll();
      markDirty();
    },
    [fabricRef, markDirty]
  );

  return {
    addImageFromUrl,
    addImageFromFile,
    applyImageFilter,
    resetImageFilters,
    cropImage,
    setOptions,
  };
}
