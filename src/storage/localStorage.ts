import type { Notebook, Note, Attachment } from '../types';
import type { StorageAdapter } from './types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Factory function to create a user-specific storage adapter
export function createLocalStorageAdapter(userId: string): StorageAdapter {
  const NOTEBOOKS_KEY = `2note_${userId}_notebooks`;
  const NOTES_KEY = `2note_${userId}_notes`;

  function getStoredNotebooks(): Notebook[] {
    const data = localStorage.getItem(NOTEBOOKS_KEY);
    return data ? JSON.parse(data) : [];
  }

  function saveNotebooks(notebooks: Notebook[]): void {
    localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
  }

  function getStoredNotes(): Note[] {
    const data = localStorage.getItem(NOTES_KEY);
    return data ? JSON.parse(data) : [];
  }

  function saveNotes(notes: Note[]): void {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  return {
  // Notebooks
  async getNotebooks(): Promise<Notebook[]> {
    return getStoredNotebooks();
  },

  async createNotebook(name: string): Promise<Notebook> {
    const notebooks = getStoredNotebooks();
    const now = new Date().toISOString();
    const maxOrder = notebooks.reduce((max, n) => Math.max(max, n.order || 0), 0);
    const notebook: Notebook = {
      id: generateId(),
      name,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    notebooks.push(notebook);
    saveNotebooks(notebooks);
    return notebook;
  },

  async updateNotebook(id: string, updates: Partial<Notebook>): Promise<Notebook> {
    const notebooks = getStoredNotebooks();
    const index = notebooks.findIndex((n) => n.id === id);
    if (index === -1) throw new Error('Notebook not found');

    notebooks[index] = {
      ...notebooks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveNotebooks(notebooks);
    return notebooks[index];
  },

  async deleteNotebook(id: string): Promise<void> {
    const notebooks = getStoredNotebooks().filter((n) => n.id !== id);
    saveNotebooks(notebooks);

    // Also delete all notes in this notebook
    const notes = getStoredNotes().filter((n) => n.notebookId !== id);
    saveNotes(notes);
  },

  async reorderNotebooks(orderedIds: string[]): Promise<void> {
    const notebooks = getStoredNotebooks();
    orderedIds.forEach((id, index) => {
      const notebook = notebooks.find(n => n.id === id);
      if (notebook) {
        notebook.order = index + 1;
      }
    });
    saveNotebooks(notebooks);
  },

  // Notes
  async getNotes(notebookId?: string): Promise<Note[]> {
    const notes = getStoredNotes();
    if (notebookId) {
      return notes.filter((n) => n.notebookId === notebookId);
    }
    return notes;
  },

  async getNote(id: string): Promise<Note | null> {
    const notes = getStoredNotes();
    return notes.find((n) => n.id === id) || null;
  },

  async createNote(notebookId: string, title: string): Promise<Note> {
    const notes = getStoredNotes();
    const now = new Date().toISOString();
    const notebookNotes = notes.filter(n => n.notebookId === notebookId);
    const maxOrder = notebookNotes.reduce((max, n) => Math.max(max, n.order || 0), 0);
    const note: Note = {
      id: generateId(),
      notebookId,
      title,
      content: '',
      attachments: [],
      columns: 1,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    notes.push(note);
    saveNotes(notes);
    return note;
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const notes = getStoredNotes();
    const index = notes.findIndex((n) => n.id === id);
    if (index === -1) throw new Error('Note not found');

    notes[index] = {
      ...notes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveNotes(notes);
    return notes[index];
  },

  async deleteNote(id: string): Promise<void> {
    const notes = getStoredNotes().filter((n) => n.id !== id);
    saveNotes(notes);
  },

  async reorderNotes(notebookId: string, orderedIds: string[]): Promise<void> {
    const notes = getStoredNotes();
    orderedIds.forEach((id, index) => {
      const note = notes.find(n => n.id === id && n.notebookId === notebookId);
      if (note) {
        note.order = index + 1;
      }
    });
    saveNotes(notes);
  },

  async moveNoteToNotebook(noteId: string, targetNotebookId: string): Promise<Note> {
    const notes = getStoredNotes();
    const index = notes.findIndex(n => n.id === noteId);
    if (index === -1) throw new Error('Note not found');

    const targetNotes = notes.filter(n => n.notebookId === targetNotebookId);
    const maxOrder = targetNotes.reduce((max, n) => Math.max(max, n.order || 0), 0);

    notes[index].notebookId = targetNotebookId;
    notes[index].order = maxOrder + 1;
    notes[index].updatedAt = new Date().toISOString();
    saveNotes(notes);
    return notes[index];
  },

  // Attachments
  async addAttachment(noteId: string, file: File): Promise<Attachment> {
    const notes = getStoredNotes();
    const index = notes.findIndex((n) => n.id === noteId);
    if (index === -1) throw new Error('Note not found');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: Attachment = {
          id: generateId(),
          name: file.name,
          type: file.type,
          data: reader.result as string,
          createdAt: new Date().toISOString(),
        };

        notes[index].attachments.push(attachment);
        notes[index].updatedAt = new Date().toISOString();
        saveNotes(notes);
        resolve(attachment);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  async deleteAttachment(noteId: string, attachmentId: string): Promise<void> {
      const notes = getStoredNotes();
      const index = notes.findIndex((n) => n.id === noteId);
      if (index === -1) throw new Error('Note not found');

      notes[index].attachments = notes[index].attachments.filter(
        (a) => a.id !== attachmentId
      );
      notes[index].updatedAt = new Date().toISOString();
      saveNotes(notes);
    },
  };
}
