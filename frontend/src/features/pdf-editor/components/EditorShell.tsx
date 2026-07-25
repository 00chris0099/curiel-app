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
import { useIsMobile, useIsTablet } from '../hooks/useMediaQuery';
import {
  Layers,
  SlidersHorizontal,
  Image as ImageIcon,
  Search,
  HelpCircle,
  PenTool,
  PanelLeftClose,
  PanelRightClose,
  X,
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
  const [thumbnailsOpen, setThumbnailsOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'thumbnails' | 'right'>('none');
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const canvasRef = useRef<Canvas | null>(null);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

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

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <MainToolbar onSave={onSave} onExport={() => setShowExportDialog(true)} />

        <div className="flex-1 relative overflow-hidden">
          <EditorCanvas onCanvasReady={handleCanvasReady} />

          {mobileDrawer === 'thumbnails' && (
            <div className="absolute inset-y-0 left-0 z-30 w-48 bg-white dark:bg-gray-800 shadow-xl">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Páginas</span>
                <button onClick={() => setMobileDrawer('none')} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              <PageThumbnails />
            </div>
          )}

          {mobileDrawer === 'right' && (
            <div className="absolute inset-y-0 right-0 z-30 w-72 bg-white dark:bg-gray-800 shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Panel</span>
                <button onClick={() => setMobileDrawer('none')} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {rightPanelTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setRightPanelKey(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs ${
                      rightPanel === tab.key
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-500'
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
            </div>
          )}
        </div>

        <div className="flex items-center justify-around px-2 py-1.5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setMobileDrawer(mobileDrawer === 'thumbnails' ? 'none' : 'thumbnails')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${mobileDrawer === 'thumbnails' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-500'}`}
          >
            <PanelLeftClose size={16} />
            <span className="text-[10px]">Páginas</span>
          </button>
          <ToolSelector />
          <button
            onClick={() => setMobileDrawer(mobileDrawer === 'right' ? 'none' : 'right')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${mobileDrawer === 'right' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-500'}`}
          >
            <PanelRightClose size={16} />
            <span className="text-[10px]">Panel</span>
          </button>
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

  if (isTablet) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <MainToolbar onSave={onSave} onExport={() => setShowExportDialog(true)} />

        <div className="flex-1 flex overflow-hidden">
          {thumbnailsOpen && (
            <div className="w-40 shrink-0">
              <PageThumbnails />
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <button
                onClick={() => setThumbnailsOpen(!thumbnailsOpen)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <PanelLeftClose size={14} className={thumbnailsOpen ? '' : 'rotate-180'} />
              </button>
              <ToolSelector />
              <div className="flex-1" />
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <HelpCircle size={14} />
              </button>
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <PanelRightClose size={14} className={rightPanelOpen ? '' : 'rotate-180'} />
              </button>
            </div>
            <EditorCanvas onCanvasReady={handleCanvasReady} />
          </div>

          {rightPanelOpen && (
            <div className="w-60 shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {rightPanelTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setRightPanelKey(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] ${
                      rightPanel === tab.key
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.icon}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                {renderRightPanelContent()}
              </div>
            </div>
          )}
        </div>

        <KeyboardShortcutsHelp isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
        <ExportDialog isOpen={showExportDialog} onClose={() => setShowExportDialog(false)} canvas={canvasRef.current} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <MainToolbar onSave={onSave} onExport={() => setShowExportDialog(true)} />

      <div className="flex-1 flex overflow-hidden">
        <PageThumbnails />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <ToolSelector />
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              title="Atajos de teclado (?)"
            >
              <HelpCircle size={16} />
            </button>
          </div>
          <EditorCanvas onCanvasReady={handleCanvasReady} />
        </div>

        <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-wrap">
            {rightPanelTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRightPanelKey(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm ${
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
        </div>
      </div>

      <KeyboardShortcutsHelp isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
      <ExportDialog isOpen={showExportDialog} onClose={() => setShowExportDialog(false)} canvas={canvasRef.current} />
    </div>
  );
}
