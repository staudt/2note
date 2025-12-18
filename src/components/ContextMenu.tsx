import { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const handleItemClick = (item: MenuItem) => {
    if (!item.disabled) {
      item.action();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
          onClick={() => handleItemClick(item)}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
