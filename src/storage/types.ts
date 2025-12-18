import type { Notebook, Note, Attachment } from '../types';

export interface StorageAdapter {
  // Notebooks
  getNotebooks(): Promise<Notebook[]>;
  createNotebook(name: string): Promise<Notebook>;
  updateNotebook(id: string, updates: Partial<Notebook>): Promise<Notebook>;
  deleteNotebook(id: string): Promise<void>;
  reorderNotebooks(orderedIds: string[]): Promise<void>;

  // Notes
  getNotes(notebookId?: string): Promise<Note[]>;
  getNote(id: string): Promise<Note | null>;
  createNote(notebookId: string, title: string): Promise<Note>;
  updateNote(id: string, updates: Partial<Note>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  reorderNotes(notebookId: string, orderedIds: string[]): Promise<void>;
  moveNoteToNotebook(noteId: string, targetNotebookId: string): Promise<Note>;

  // Attachments
  addAttachment(noteId: string, file: File): Promise<Attachment>;
  deleteAttachment(noteId: string, attachmentId: string): Promise<void>;
}
