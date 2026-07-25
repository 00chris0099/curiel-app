import { useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage } from 'fabric';
import { PenTool, Upload, Trash2, Check } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { SignatureUpload } from './SignatureUpload';

interface Signature {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

interface SignatureManagerProps {
  canvas: FabricCanvas | null;
  onClose?: () => void;
}

type ViewMode = 'list' | 'draw' | 'upload';

export function SignatureManager({ canvas, onClose }: SignatureManagerProps) {
  const [view, setView] = useState<ViewMode>('list');
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const insertSignature = useCallback(
    async (dataUrl: string) => {
      if (!canvas) return;

      try {
        const img = await FabricImage.fromURL(dataUrl);
        img.set({
          left: 150,
          top: 150,
          scaleX: 0.5,
          scaleY: 0.5,
          selectable: true,
          hasControls: true,
          borderColor: '#4a90d9',
          cornerColor: '#4a90d9',
          cornerStyle: 'circle',
          cornerSize: 8,
          transparentCorners: false,
          data: { type: 'signature', createdAt: Date.now() },
        } as Record<string, unknown>);

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        onClose?.();
      } catch {
        // silently handle error
      }
    },
    [canvas, onClose]
  );

  const handleSaveSignature = useCallback(
    (dataUrl: string, name?: string) => {
      const newSig: Signature = {
        id: `sig-${Date.now()}`,
        name: name || `Firma ${signatures.length + 1}`,
        dataUrl,
        createdAt: Date.now(),
      };
      setSignatures((prev) => [...prev, newSig]);
      setView('list');
      insertSignature(dataUrl);
    },
    [signatures.length, insertSignature]
  );

  const handleDeleteSignature = useCallback((id: string) => {
    setSignatures((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const handleInsertStored = useCallback(
    (sig: Signature) => {
      insertSignature(sig.dataUrl);
    },
    [insertSignature]
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <PenTool size={16} className="text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Firmas
        </h3>
      </div>

      {view === 'list' && (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => setView('draw')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <PenTool size={12} />
              Dibujar
            </button>
            <button
              onClick={() => setView('upload')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload size={12} />
              Subir imagen
            </button>
          </div>

          {signatures.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Firmas guardadas
              </h4>
              {signatures.map((sig) => (
                <div
                  key={sig.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                    selectedId === sig.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                  onClick={() => setSelectedId(sig.id)}
                >
                  <img
                    src={sig.dataUrl}
                    alt={sig.name}
                    className="h-8 w-auto object-contain"
                  />
                  <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                    {sig.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsertStored(sig);
                    }}
                    className="p-1 text-primary-600 hover:text-primary-700"
                    title="Insertar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSignature(sig.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {signatures.length === 0 && (
            <div className="text-center py-6 text-xs text-gray-400">
              No hay firmas guardadas aún.
              <br />
              Dibuja o sube una firma para comenzar.
            </div>
          )}
        </>
      )}

      {view === 'draw' && (
        <SignaturePad
          onSignature={(dataUrl) => handleSaveSignature(dataUrl)}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'upload' && (
        <SignatureUpload
          onSignature={(dataUrl) => handleSaveSignature(dataUrl)}
          onCancel={() => setView('list')}
        />
      )}
    </div>
  );
}
