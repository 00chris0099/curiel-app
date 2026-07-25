import { useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export function ImageUpload({ onImageSelect, accept = 'image/*', maxSize = 10 * 1024 * 1024 }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > maxSize) {
        alert(`El archivo excede el tamaño máximo de ${maxSize / 1024 / 1024}MB`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Solo se permiten archivos de imagen');
        return;
      }

      onImageSelect(file);
      e.target.value = '';
    },
    [onImageSelect, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (file.size > maxSize) {
        alert(`El archivo excede el tamaño máximo de ${maxSize / 1024 / 1024}MB`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Solo se permiten archivos de imagen');
        return;
      }

      onImageSelect(file);
    },
    [onImageSelect, maxSize]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
      >
        <Upload size={24} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Arrastra una imagen o haz clic para seleccionar
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          PNG, JPG, GIF, SVG (máx. {maxSize / 1024 / 1024}MB)
        </p>
      </div>
    </div>
  );
}
