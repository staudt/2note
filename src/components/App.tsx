import { useState, useEffect, useCallback } from 'react';
import { useNotes } from '../context/NotesContext';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Editor } from './Editor';
import { CommandPalette } from './CommandPalette';
import { InputDialog } from './InputDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { HelpModal } from './HelpModal';
import { BackupRestore } from './BackupRestore';
import type { Command } from '../utils/shortcuts';
import { matchesShortcut } from '../utils/shortcuts';

type DialogType = 'none' | 'newNotebook' | 'renameNotebook' | 'renameNote' | 'deleteNote' | 'deleteNotebook';

export function App() {
  const {
    state,
    createNotebook,
    createNote,
    updateNotebook,
    updateNote,
    deleteNote,
    deleteNotebook,
    setActiveNote,
  } = useNotes();

  const { user, isAuthEnabled, signOut } = useAuth();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('none');
  const [targetLine, setTargetLine] = useState<number | undefined>(undefined);

  const activeNote = state.notes.find((n) => n.id === state.activeNoteId);
  const activeNotebook = state.notebooks.find((n) => n.id === state.activeNotebookId);

  const handleNewNotebook = useCallback(async (name: string) => {
    await createNotebook(name);
    setDialogType('none');
  }, [createNotebook]);

  const handleNewNote = useCallback(async () => {
    if (state.activeNotebookId) {
      const note = await createNote(state.activeNotebookId, 'New Note');
      setActiveNote(note.id);
    }
  }, [createNote, state.activeNotebookId, setActiveNote]);

  const handleRenameNotebook = useCallback(async (name: string) => {
    if (state.activeNotebookId) {
      await updateNotebook(state.activeNotebookId, { name });
    }
    setDialogType('none');
  }, [updateNotebook, state.activeNotebookId]);

  const handleRenameNote = useCallback(async (title: string) => {
    if (state.activeNoteId) {
      await updateNote(state.activeNoteId, { title });
    }
    setDialogType('none');
  }, [updateNote, state.activeNoteId]);

  const handleDeleteNote = useCallback(async () => {
    if (state.activeNoteId) {
      await deleteNote(state.activeNoteId);
    }
    setDialogType('none');
  }, [deleteNote, state.activeNoteId]);

  const handleDeleteNotebook = useCallback(async () => {
    if (state.activeNotebookId) {
      await deleteNotebook(state.activeNotebookId);
    }
    setDialogType('none');
  }, [deleteNotebook, state.activeNotebookId]);

  const handleTaskClick = useCallback((noteId: string, line: number) => {
    const note = state.notes.find(n => n.id === noteId);
    if (note) {
      setActiveNote(noteId);
      setTargetLine(line);
    }
  }, [state.notes, setActiveNote]);

  const handleNoteSelect = useCallback((noteId: string) => {
    const note = state.notes.find(n => n.id === noteId);
    if (note) {
      setActiveNote(noteId);
    }
  }, [state.notes, setActiveNote]);

  const navigateNotes = useCallback((direction: 'next' | 'prev') => {
    const notebookNotes = state.notes.filter((n) => n.notebookId === state.activeNotebookId);
    if (notebookNotes.length === 0) return;

    const currentIndex = notebookNotes.findIndex((n) => n.id === state.activeNoteId);
    let newIndex: number;

    if (direction === 'next') {
      newIndex = currentIndex < notebookNotes.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : notebookNotes.length - 1;
    }

    setActiveNote(notebookNotes[newIndex].id);
  }, [state.notes, state.activeNotebookId, state.activeNoteId, setActiveNote]);

  const commands: Command[] = [
    {
      id: 'newNote',
      name: 'New Note',
      shortcut: 'alt+n',
      action: () => {
        if (state.activeNotebookId) {
          handleNewNote();
        } else {
          alert('Please select a notebook first');
        }
      },
    },
    {
      id: 'newNotebook',
      name: 'New Notebook',
      shortcut: 'alt+shift+n',
      action: () => setDialogType('newNotebook'),
    },
    {
      id: 'renameNote',
      name: 'Rename Note',
      shortcut: 'alt+r',
      action: () => {
        if (state.activeNoteId) {
          setDialogType('renameNote');
        }
      },
    },
    {
      id: 'renameNotebook',
      name: 'Rename Notebook',
      shortcut: 'alt+shift+r',
      action: () => {
        if (state.activeNotebookId) {
          setDialogType('renameNotebook');
        }
      },
    },
    {
      id: 'deleteNote',
      name: 'Delete Note',
      shortcut: 'alt+d',
      action: () => {
        if (state.activeNoteId) {
          setDialogType('deleteNote');
        }
      },
    },
    {
      id: 'deleteNotebook',
      name: 'Delete Notebook',
      shortcut: 'alt+shift+d',
      action: () => {
        if (state.activeNotebookId) {
          setDialogType('deleteNotebook');
        }
      },
    },
    {
      id: 'nextNote',
      name: 'Next Note',
      shortcut: 'alt+]',
      action: () => navigateNotes('next'),
    },
    {
      id: 'prevNote',
      name: 'Previous Note',
      shortcut: 'alt+[',
      action: () => navigateNotes('prev'),
    },
    {
      id: 'closeNote',
      name: 'Close Note',
      shortcut: 'alt+w',
      action: () => setActiveNote(null),
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette / Quick open
      if (matchesShortcut(e, 'ctrl+p')) {
        e.preventDefault();
        setIsPaletteOpen(true);
        return;
      }

      // Check other commands
      for (const command of commands) {
        if (command.shortcut && matchesShortcut(e, command.shortcut)) {
          e.preventDefault();
          command.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commands]);

  if (state.isLoading) {
    return (
      <div className="app">
        <div className="editor-empty">
          <div className="editor-empty-text">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <span className="app-title">2Note</span>
        <div className="user-menu">
          {isAuthEnabled && user && (
            <>
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="user-avatar" />
              )}
              <span className="user-name">{user.displayName || user.email}</span>
              <button className="sign-out-button" onClick={signOut}>
                Sign out
              </button>
            </>
          )}
          <button
            className="backup-button"
            onClick={() => setIsBackupOpen(true)}
            title="Backup & Restore"
          >
            ↕
          </button>
          <button
            className="help-button"
            onClick={() => setIsHelpOpen(true)}
            title="Help"
          >
            ?
          </button>
        </div>
      </div>
      <div className="app-main">
        <Sidebar onTaskClick={handleTaskClick} />
        <Editor targetLine={targetLine} onLineNavigated={() => setTargetLine(undefined)} />
      </div>

      <CommandPalette
        commands={commands}
        notes={state.notes}
        notebooks={state.notebooks}
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onNoteSelect={handleNoteSelect}
      />

      <InputDialog
        isOpen={dialogType === 'newNotebook'}
        title="New Notebook"
        placeholder="Notebook name..."
        onConfirm={handleNewNotebook}
        onCancel={() => setDialogType('none')}
      />

      <InputDialog
        isOpen={dialogType === 'renameNotebook'}
        title="Rename Notebook"
        placeholder="Notebook name..."
        defaultValue={activeNotebook?.name || ''}
        onConfirm={handleRenameNotebook}
        onCancel={() => setDialogType('none')}
      />

      <InputDialog
        isOpen={dialogType === 'renameNote'}
        title="Rename Note"
        placeholder="Note title..."
        defaultValue={activeNote?.title || ''}
        onConfirm={handleRenameNote}
        onCancel={() => setDialogType('none')}
      />

      <ConfirmDialog
        isOpen={dialogType === 'deleteNote'}
        title="Delete Note"
        message={`Are you sure you want to delete "${activeNote?.title || 'this note'}"?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteNote}
        onCancel={() => setDialogType('none')}
        isDanger
      />

      <ConfirmDialog
        isOpen={dialogType === 'deleteNotebook'}
        title="Delete Notebook"
        message={`Are you sure you want to delete "${activeNotebook?.name || 'this notebook'}" and all its notes?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteNotebook}
        onCancel={() => setDialogType('none')}
        isDanger
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <BackupRestore
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
      />
    </div>
  );
}
