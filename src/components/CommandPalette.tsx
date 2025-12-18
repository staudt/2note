import { useState, useEffect, useRef } from 'react';
import type { Command } from '../utils/shortcuts';
import { formatShortcut } from '../utils/shortcuts';

interface CommandPaletteProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ commands, isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

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
      setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
      onClose();
      return;
    }
  };

  const handleItemClick = (command: Command) => {
    command.action();
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
          placeholder="Type a command..."
        />
        <div className="command-palette-list">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">No commands found</div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleItemClick(command)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="command-palette-item-name">{command.name}</span>
                {command.shortcut && (
                  <span className="command-palette-item-shortcut">
                    {formatShortcut(command.shortcut)}
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
