import { useState, useCallback, useRef, type ReactNode } from 'react';
import { Canvas } from 'fabric';
import { ToolSelector } from './Toolbar/ToolSelector';
import { MainToolbar } from './Toolbar/MainToolbar';
import { PropertyPanel } from './Toolbar/PropertyPanel';
import { PageThumbnails } from './Panels/PageThumbnails';
import { LayerPanel } from './Panels/LayerPanel';
import { SearchPanel } from './Panels/SearchPanel';
import { KeyboardShortcutsHelp } from './Panels/KeyboardShortcutsHelp';
import { EditorCanvas } from './Canvas/EditorCanvas';
import { ImageUpload } from './Tools/ImageUpload';
import { SignatureManager } from './Signature/SignatureManager';
import { ExportDialog } from './Export/ExportDialog';
import { ConfirmDialog } from './UI/ConfirmDialog';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  Layers,
  SlidersHorizontal,
  Image as ImageIcon,
  Search,
  HelpCircle,
  PenTool,
  PanelLeftClose,
  PanelRightClose,
} from 'lucide-react';

interface EditorShellProps {
  onSave?: () => void;
  onExport?: () => void;
  rightPanelContent?: ReactNode;
  rightPanelKey?: string;
  onRightPanelChange?: (key: string) => void;
  onCanvasRef?: (getCanvas: () => Canvas | null) => void;
}

type RightPanel = 'properties' | 'layers' | 'image' | 'search' | 'signature' | 'custom';

export function EditorShell({ onSave, onExport, rightPanelContent, rightPanelKey, onRightPanelChange, onCanvasRef }: EditorShellProps) {
  const [internalPanel, setInternalPanel] = useState<RightPanel>('properties');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const canvasRef = useRef<Canvas | null>(null);

  const rightPanel: RightPanel = (rightPanelKey as RightPanel) || internalPanel;

  const setRightPanelKey = useCallback((key: RightPanel) => {
    if (onRightPanelChange) {
      onRightPanelChange(key);
    } else {
      setInternalPanel(key);
    }
  }, [onRightPanelChange]);

  const handleCanvasReady = useCallback((getCanvas: () => Canvas | null) => {
    canvasRef.current = getCanvas();
    onCanvasRef?.(getCanvas);
  }, [onCanvasRef]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!canvasRef.current) return;
    const { FabricImage } = await import('fabric');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const img = await FabricImage.fromURL(dataUrl);
        img.set({
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5,
          selectable: true,
          hasControls: true,
          borderColor: '#4a90d9',
          cornerColor: '#4a90d9',
          cornerStyle: 'circle',
          cornerSize: 8,
          transparentCorners: false,
        });
        canvasRef.current?.add(img);
        canvasRef.current?.setActiveObject(img);
        canvasRef.current?.renderAll();
      }
    };
    reader.readAsDataURL(file);
  }, []);

  useKeyboardShortcuts({
    onSave,
    onExport,
    onDelete: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObjects();
      active.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    },
    onDuplicate: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active) return;
      active.clone().then((cloned) => {
        cloned.set({
          left: (active.left || 0) + 20,
          top: (active.top || 0) + 20,
        });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
      });
    },
  });

  const rightPanelTabs = [
    { key: 'properties' as const, icon: <SlidersHorizontal size={14} />, label: 'Props' },
    { key: 'layers' as const, icon: <Layers size={14} />, label: 'Capas' },
    { key: 'image' as const, icon: <ImageIcon size={14} />, label: 'Imagen' },
    { key: 'search' as const, icon: <Search size={14} />, label: 'Buscar' },
    { key: 'signature' as const, icon: <PenTool size={14} />, label: 'Firma' },
  ];

  const renderRightPanelContent = () => (
    <>
      {rightPanel === 'properties' && <PropertyPanel />}
      {rightPanel === 'layers' && <LayerPanel canvas={canvasRef.current} />}
      {rightPanel === 'image' && (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Insertar imagen
          </h3>
          <ImageUpload onImageSelect={handleImageUpload} />
        </div>
      )}
      {rightPanel === 'search' && (
        <SearchPanel canvas={canvasRef.current} />
      )}
      {rightPanel === 'signature' && (
        <SignatureManager canvas={canvasRef.current} />
      )}
      {rightPanel === 'custom' && rightPanelContent}
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <MainToolbar onSave={onSave} onExport={() => setShowExportDialog(true)} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left panel - Thumbnails */}
        <div
          className={`shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-200 overflow-hidden ${
            leftOpen ? 'w-40' : 'w-0 border-r-0'
          }`}
        >
          <PageThumbnails />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Toolbar row */}
          <div className="px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0"
              title={leftOpen ? 'Ocultar páginas' : 'Mostrar páginas'}
            >
              <PanelLeftClose size={16} className={leftOpen ? '' : 'rotate-180'} />
            </button>
            <ToolSelector />
            <div className="flex-1" />
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0"
              title="Atajos de teclado"
            >
              <HelpCircle size={16} />
            </button>
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0"
              title={rightOpen ? 'Ocultar panel' : 'Mostrar panel'}
            >
              <PanelRightClose size={16} className={rightOpen ? '' : 'rotate-180'} />
            </button>
          </div>
          <EditorCanvas onCanvasReady={handleCanvasReady} />
        </div>

        {/* Right panel - Properties */}
        <div
          className={`shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-200 ${
            rightOpen ? 'w-64' : 'w-0 border-l-0'
          }`}
        >
          {rightOpen && (
            <>
              <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto shrink-0">
                {rightPanelTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setRightPanelKey(tab.key)}
                    className={`flex items-center justify-center gap-1 px-3 py-2 text-xs whitespace-nowrap shrink-0 ${
                      rightPanel === tab.key
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                {renderRightPanelContent()}
              </div>
            </>
          )}
        </div>
      </div>

      <KeyboardShortcutsHelp isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
      <ExportDialog isOpen={showExportDialog} onClose={() => setShowExportDialog(false)} canvas={canvasRef.current} />
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
