import { useState, useEffect, useRef, useMemo } from 'react';
import type { Command } from '../utils/shortcuts';
import { formatShortcut } from '../utils/shortcuts';
import type { Note, Notebook } from '../types';

interface CommandPaletteProps {
  commands: Command[];
  notes: Note[];
  notebooks: Notebook[];
  isOpen: boolean;
  onClose: () => void;
  onNoteSelect: (noteId: string) => void;
}

interface PaletteItem {
  type: 'command' | 'note';
  id: string;
  name: string;
  shortcut?: string;
  action: () => void;
  notebookName?: string;
}

export function CommandPalette({ commands, notes, notebooks, isOpen, onClose, onNoteSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine commands and notes into a single list
  const allItems = useMemo((): PaletteItem[] => {
    const commandItems: PaletteItem[] = commands.map(cmd => ({
      type: 'command',
      id: cmd.id,
      name: cmd.name,
      shortcut: cmd.shortcut,
      action: cmd.action,
    }));

    const noteItems: PaletteItem[] = notes.map(note => {
      const notebook = notebooks.find(nb => nb.id === note.notebookId);
      return {
        type: 'note',
        id: note.id,
        name: note.title || 'Untitled',
        notebookName: notebook?.name,
        action: () => onNoteSelect(note.id),
      };
    });

    return [...commandItems, ...noteItems];
  }, [commands, notes, notebooks, onNoteSelect]);

  const filteredItems = useMemo(() => {
    if (!query) return allItems;
    const lowerQuery = query.toLowerCase();
    return allItems.filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      (item.notebookName && item.notebookName.toLowerCase().includes(lowerQuery))
    );
  }, [allItems, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
      onClose();
      return;
    }
  };

  const handleItemClick = (item: PaletteItem) => {
    item.action();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="command-palette-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type to search commands and notes..."
        />
        <div className="command-palette-list">
          {filteredItems.length === 0 ? (
            <div className="command-palette-empty">No results found</div>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="command-palette-item-icon">
                  {item.type === 'command' ? '>' : '📄'}
                </span>
                <span className="command-palette-item-name">{item.name}</span>
                {item.notebookName && (
                  <span className="command-palette-item-notebook">{item.notebookName}</span>
                )}
                {item.shortcut && (
                  <span className="command-palette-item-shortcut">
                    {formatShortcut(item.shortcut)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
