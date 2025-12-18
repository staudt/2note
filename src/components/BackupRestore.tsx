import { useRef, useState } from 'react';
import { useNotes } from '../context/NotesContext';

interface BackupRestoreProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupRestore({ isOpen, onClose }: BackupRestoreProps) {
  const { state, storage } = useNotes();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleBackup = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      notebooks: state.notebooks,
      notes: state.notes,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2note-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus('Backup downloaded successfully!');
    setTimeout(() => setStatus(null), 3000);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.notebooks || !data.notes) {
        throw new Error('Invalid backup file format');
      }

      // Confirm before restore
      if (!confirm('This will replace all your current notes. Are you sure?')) {
        return;
      }

      // Import notebooks
      for (const notebook of data.notebooks) {
        try {
          await storage.createNotebook(notebook.name);
        } catch (err) {
          // Notebook might already exist, continue
        }
      }

      // Get the newly created notebooks to map old IDs to new IDs
      const existingNotebooks = await storage.getNotebooks();
      const notebookMap = new Map<string, string>();

      for (const oldNotebook of data.notebooks) {
        const match = existingNotebooks.find(n => n.name === oldNotebook.name);
        if (match) {
          notebookMap.set(oldNotebook.id, match.id);
        }
      }

      // Import notes
      for (const note of data.notes) {
        const newNotebookId = notebookMap.get(note.notebookId);
        if (newNotebookId) {
          const newNote = await storage.createNote(newNotebookId, note.title || 'Untitled');
          await storage.updateNote(newNote.id, {
            content: note.content,
            columns: note.columns,
            attachments: note.attachments || [],
          });
        }
      }

      setStatus('Restore completed! Please refresh the page.');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setStatus('Error: Invalid backup file');
      setTimeout(() => setStatus(null), 3000);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="backup-modal-overlay" onClick={onClose}>
      <div className="backup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="backup-modal-header">
          <h2 className="backup-modal-title">Backup & Restore</h2>
          <button className="backup-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="backup-modal-content">
          <div className="backup-section">
            <h3>Backup</h3>
            <p>Download all your notebooks and notes as a JSON file.</p>
            <button className="btn" onClick={handleBackup}>
              Download Backup
            </button>
          </div>

          <div className="backup-section">
            <h3>Restore</h3>
            <p>Import notebooks and notes from a backup file.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleRestore}
              style={{ display: 'none' }}
            />
            <button className="btn" onClick={() => fileInputRef.current?.click()}>
              Choose Backup File
            </button>
          </div>

          {status && (
            <div className={`backup-status ${status.startsWith('Error') ? 'error' : 'success'}`}>
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
