import { useEffect, useRef } from 'react';
import { isAuthEnabled } from '../firebase/config';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'General', items: [
    { shortcut: 'Ctrl+P', description: 'Command palette / Quick open' },
    { shortcut: 'Ctrl+S', description: 'Save note' },
  ]},
  { category: 'Notes', items: [
    { shortcut: 'Alt+N', description: 'New note' },
    { shortcut: 'Alt+Shift+N', description: 'New notebook' },
    { shortcut: 'Alt+R', description: 'Rename note' },
    { shortcut: 'Alt+Shift+R', description: 'Rename notebook' },
    { shortcut: 'Alt+D', description: 'Delete note' },
    { shortcut: 'Alt+Shift+D', description: 'Delete notebook' },
    { shortcut: 'Alt+W', description: 'Close note' },
    { shortcut: 'Alt+]', description: 'Next note' },
    { shortcut: 'Alt+[', description: 'Previous note' },
  ]},
  { category: 'Formatting', items: [
    { shortcut: 'Ctrl+B', description: 'Toggle bold' },
    { shortcut: 'Ctrl+/', description: 'Toggle strikethrough' },
    { shortcut: 'Ctrl+1', description: 'Toggle star' },
    { shortcut: 'Ctrl+2', description: 'Toggle task checkbox' },
    { shortcut: 'Tab', description: 'Indent line' },
    { shortcut: 'Shift+Tab', description: 'Unindent line' },
    { shortcut: 'Alt+Up', description: 'Move line up' },
    { shortcut: 'Alt+Down', description: 'Move line down' },
  ]},
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay">
      <div ref={modalRef} className="help-modal">
        <div className="help-modal-header">
          <h2 className="help-modal-title">Help</h2>
          <button className="help-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="help-modal-content">
          <section className="help-section">
            <h3 className="help-section-title">Keyboard Shortcuts</h3>
            {shortcuts.map((category) => (
              <div key={category.category} className="help-category">
                <h4 className="help-category-title">{category.category}</h4>
                <div className="help-shortcuts">
                  {category.items.map((item) => (
                    <div key={item.shortcut} className="help-shortcut-item">
                      <span className="help-shortcut-key">{item.shortcut}</span>
                      <span className="help-shortcut-desc">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="help-section">
            <h3 className="help-section-title">Data Storage</h3>
            <div className="help-storage-info">
              {isAuthEnabled ? (
                <>
                  <p>Your notes are stored securely in Firebase Firestore.</p>
                  <p className="help-storage-path">
                    <strong>Location:</strong> Cloud (Firebase Firestore)
                  </p>
                  <p className="help-storage-note">
                    Data syncs across devices when signed in with the same account.
                    Use the Backup & Restore feature to export your notes.
                  </p>
                </>
              ) : (
                <>
                  <p>Your notes are stored locally in your browser's localStorage.</p>
                  <p className="help-storage-path">
                    <strong>Location:</strong> Browser localStorage (domain-specific)
                  </p>
                  <p className="help-storage-note">
                    Data persists across sessions but is specific to this browser.
                    Use the Backup & Restore feature to export your notes.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="help-section">
            <h3 className="help-section-title">Tips</h3>
            <ul className="help-tips-list">
              <li>Type "- " to start a bullet point (auto-converts to •)</li>
              <li>Type "1. " to start a numbered list</li>
              <li>Right-click on notebooks/notes for context menu</li>
              <li>Drag and drop to reorder notebooks and notes</li>
              <li>Paste images directly into notes</li>
              <li>Use the column toggle button for two-column layout</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
