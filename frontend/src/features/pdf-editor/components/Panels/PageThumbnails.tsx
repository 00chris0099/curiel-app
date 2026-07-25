import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '../../store';
import { Plus, Copy, Trash2, RotateCw, GripVertical } from 'lucide-react';
import type { Page } from '../../types';

interface SortablePageProps {
  page: Page;
  index: number;
  isCurrent: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRotate: () => void;
  onDelete: () => void;
}

function SortablePage({ page, index, isCurrent, onSelect, onDuplicate, onRotate, onDelete }: SortablePageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg border-2 transition-all ${
        isCurrent
          ? 'border-primary-500 shadow-md'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${isDragging ? 'shadow-xl' : ''}`}
    >
      <div
        className="cursor-pointer"
        onClick={onSelect}
      >
        <div className="aspect-[3/4] bg-gray-50 dark:bg-gray-900 rounded p-1 flex items-center justify-center overflow-hidden">
          {page.backgroundDataUrl ? (
            <img
              src={page.backgroundDataUrl}
              alt={`Página ${index + 1}`}
              className="w-full h-full object-contain rounded border border-gray-200 dark:border-gray-700"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
              {index + 1}
            </div>
          )}
        </div>
      </div>

      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-0.5 rounded bg-white/80 dark:bg-gray-800/80 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={10} className="text-gray-400" />
      </div>

      <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-1 rounded">
          Pág. {index + 1}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-0.5 rounded bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            title="Duplicar"
          >
            <Copy size={10} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRotate(); }}
            className="p-0.5 rounded bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            title="Rotar"
          >
            <RotateCw size={10} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 rounded bg-white/80 dark:bg-gray-800/80 hover:bg-red-100 dark:hover:bg-red-900 text-gray-600 dark:text-red-400"
            title="Eliminar"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {isCurrent && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 bg-primary-500 rounded-full" />
        </div>
      )}
    </div>
  );
}

export function PageThumbnails() {
  const { pages, currentPageIndex, setCurrentPage, setPages } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newPages = arrayMove(pages, oldIndex, newIndex);
      setPages(newPages);

      if (currentPageIndex === oldIndex) {
        setCurrentPage(newIndex);
      } else if (oldIndex < currentPageIndex && newIndex >= currentPageIndex) {
        setCurrentPage(currentPageIndex - 1);
      } else if (oldIndex > currentPageIndex && newIndex <= currentPageIndex) {
        setCurrentPage(currentPageIndex + 1);
      }
    },
    [pages, currentPageIndex, setPages, setCurrentPage]
  );

  const handleDuplicate = useCallback(
    (index: number) => {
      const page = pages[index];
      if (!page) return;
      const newPage: Page = {
        ...page,
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fabricJson: page.fabricJson ? String(page.fabricJson) : undefined,
      };
      const newPages = [...pages];
      newPages.splice(index + 1, 0, newPage);
      setPages(newPages);
    },
    [pages, setPages]
  );

  const handleRotate = useCallback(
    (index: number) => {
      const page = pages[index];
      if (!page) return;
      const newPages = [...pages];
      newPages[index] = { ...page, rotation: ((page.rotation || 0) + 90) % 360 };
      setPages(newPages);
    },
    [pages, setPages]
  );

  const handleDelete = useCallback(
    (index: number) => {
      if (pages.length <= 1) return;
      const newPages = pages.filter((_, i) => i !== index);
      setPages(newPages);
      if (currentPageIndex >= newPages.length) {
        setCurrentPage(newPages.length - 1);
      } else if (index < currentPageIndex) {
        setCurrentPage(currentPageIndex - 1);
      }
    },
    [pages, currentPageIndex, setPages, setCurrentPage]
  );

  const handleAddBlank = useCallback(() => {
    const newPage: Page = {
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      index: pages.length,
      width: 595,
      height: 842,
      rotation: 0,
      isVisible: true,
      isDirty: false,
    };
    setPages([...pages, newPage]);
  }, [pages, setPages]);

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Páginas ({pages.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
            {pages.map((page, index) => (
              <SortablePage
                key={page.id}
                page={page}
                index={index}
                isCurrent={index === currentPageIndex}
                onSelect={() => setCurrentPage(index)}
                onDuplicate={() => handleDuplicate(index)}
                onRotate={() => handleRotate(index)}
                onDelete={() => handleDelete(index)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleAddBlank}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Agregar página
        </button>
      </div>
    </div>
  );
}
