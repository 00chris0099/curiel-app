import { useState, useCallback } from 'react';
import { Canvas, FabricText } from 'fabric';
import { Search, CaseSensitive, ChevronDown } from 'lucide-react';

interface SearchResult {
  objectIndex: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

interface SearchPanelProps {
  canvas: Canvas | null;
  onNavigateToPage?: (pageIndex: number) => void;
}

export function SearchPanel({ canvas }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);

  const handleSearch = useCallback(() => {
    if (!canvas || !query.trim()) {
      setResults([]);
      return;
    }

    const objects = canvas.getObjects();
    const found: SearchResult[] = [];

    objects.forEach((obj, index) => {
      if (obj instanceof FabricText) {
        const text = (obj as FabricText).text || '';
        const regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          found.push({
            objectIndex: index,
            text: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)),
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
          });
        }
      }
    });

    setResults(found);
    setSelectedResultIndex(found.length > 0 ? 0 : null);

    if (found.length > 0) {
      canvas.setActiveObject(objects[found[0].objectIndex]);
      canvas.renderAll();
    }
  }, [canvas, query, caseSensitive]);

  const handleReplace = useCallback(
    (replaceAll: boolean) => {
      if (!canvas || !query.trim()) return;

      const objects = canvas.getObjects();

      objects.forEach((obj) => {
        if (obj instanceof FabricText) {
          const textObj = obj as FabricText;
          const text = textObj.text || '';
          if (!text.toLowerCase().includes(query.toLowerCase())) return;

          const regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
          const newText = replaceAll ? text.replace(regex, replacement) : text.replace(regex, replacement);
          if (newText !== text) {
            textObj.set('text', newText);
          }
        }
      });

      canvas.renderAll();
      setResults([]);
      setSelectedResultIndex(null);
      setQuery('');
      setReplacement('');
    },
    [canvas, query, replacement, caseSensitive]
  );

  const navigateResult = useCallback(
    (direction: 'next' | 'prev') => {
      if (results.length === 0) return;
      const canvas_ = canvas;
      if (!canvas_) return;

      let newIndex: number;
      if (direction === 'next') {
        newIndex = (selectedResultIndex ?? 0) + 1;
        if (newIndex >= results.length) newIndex = 0;
      } else {
        newIndex = (selectedResultIndex ?? 0) - 1;
        if (newIndex < 0) newIndex = results.length - 1;
      }

      setSelectedResultIndex(newIndex);
      const result = results[newIndex];
      const objects = canvas_.getObjects();
      if (objects[result.objectIndex]) {
        canvas_.setActiveObject(objects[result.objectIndex]);
        canvas_.renderAll();
      }
    },
    [canvas, results, selectedResultIndex]
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Search size={16} className="text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Buscar y Reemplazar
        </h3>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar texto..."
          className="w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <button
          onClick={() => setCaseSensitive(!caseSensitive)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded ${
            caseSensitive
              ? 'text-primary-600 bg-primary-50'
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title="Distinguir mayúsculas/minúsculas"
        >
          <CaseSensitive size={14} />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Buscar
        </button>
        {results.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateResult('prev')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ChevronDown size={14} className="rotate-90" />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[3rem] text-center">
              {(selectedResultIndex ?? 0) + 1}/{results.length}
            </span>
            <button
              onClick={() => navigateResult('next')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ChevronDown size={14} className="-rotate-90" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <input
          type="text"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="Reemplazar con..."
          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleReplace(false)}
            disabled={results.length === 0}
            className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Reemplazar
          </button>
          <button
            onClick={() => handleReplace(true)}
            disabled={results.length === 0}
            className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50"
          >
            Reemplazar todo
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
        </div>
      )}

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {results.map((result, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedResultIndex(i);
              const objects = canvas?.getObjects();
              if (objects && objects[result.objectIndex]) {
                canvas?.setActiveObject(objects[result.objectIndex]);
                canvas?.renderAll();
              }
            }}
            className={`w-full text-left px-2 py-1.5 text-xs rounded truncate ${
              i === selectedResultIndex
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            ...{result.text}...
          </button>
        ))}
      </div>
    </div>
  );
}
