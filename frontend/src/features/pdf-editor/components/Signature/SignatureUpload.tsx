import { useRef, useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface SignatureUploadProps {
  onSignature: (dataUrl: string) => void;
  onCancel?: () => void;
}

export function SignatureUpload({ onSignature, onCancel }: SignatureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen (PNG, JPG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar 5MB');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleApply = useCallback(() => {
    if (preview) {
      onSignature(preview);
      setPreview(null);
    }
  }, [preview, onSignature]);

  const handleClear = useCallback(() => {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
        >
          <Upload size={24} />
          <span className="text-sm">Subir imagen de firma</span>
          <span className="text-xs">PNG, JPG (max 5MB)</span>
        </button>
      ) : (
        <div className="relative">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800">
            <img
              src={preview}
              alt="Preview de firma"
              className="max-h-32 mx-auto object-contain"
            />
          </div>
          <button
            onClick={handleClear}
            className="absolute top-1 right-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleApply}
          disabled={!preview}
          className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50"
        >
          Aplicar firma
        </button>
      </div>
    </div>
  );
}
