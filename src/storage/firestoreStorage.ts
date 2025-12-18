import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Notebook, Note, Attachment } from '../types';
import type { StorageAdapter } from './types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createFirestoreAdapter(db: Firestore, userId: string): StorageAdapter {
  const userDoc = doc(db, 'users', userId);
  const notebooksCol = collection(userDoc, 'notebooks');
  const notesCol = collection(userDoc, 'notes');

  return {
    // Notebooks
    async getNotebooks(): Promise<Notebook[]> {
      const snapshot = await getDocs(notebooksCol);
      return snapshot.docs.map(doc => doc.data() as Notebook);
    },

    async createNotebook(name: string): Promise<Notebook> {
      const notebooks = await this.getNotebooks();
      const maxOrder = notebooks.reduce((max, n) => Math.max(max, n.order || 0), 0);
      const now = new Date().toISOString();

      const notebook: Notebook = {
        id: generateId(),
        name,
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(notebooksCol, notebook.id), notebook);
      return notebook;
    },

    async updateNotebook(id: string, updates: Partial<Notebook>): Promise<Notebook> {
      const notebookRef = doc(notebooksCol, id);
      const notebookSnap = await getDoc(notebookRef);

      if (!notebookSnap.exists()) throw new Error('Notebook not found');

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(notebookRef, updateData);

      return {
        ...notebookSnap.data(),
        ...updateData,
      } as Notebook;
    },

    async deleteNotebook(id: string): Promise<void> {
      // Delete all notes in this notebook first
      const notesQuery = query(notesCol, where('notebookId', '==', id));
      const notesSnapshot = await getDocs(notesQuery);

      const batch = writeBatch(db);
      notesSnapshot.docs.forEach(noteDoc => {
        batch.delete(noteDoc.ref);
      });
      batch.delete(doc(notebooksCol, id));

      await batch.commit();
    },

    async reorderNotebooks(orderedIds: string[]): Promise<void> {
      const batch = writeBatch(db);

      orderedIds.forEach((id, index) => {
        batch.update(doc(notebooksCol, id), { order: index + 1 });
      });

      await batch.commit();
    },

    // Notes
    async getNotes(notebookId?: string): Promise<Note[]> {
      let snapshot;
      if (notebookId) {
        const q = query(notesCol, where('notebookId', '==', notebookId));
        snapshot = await getDocs(q);
      } else {
        snapshot = await getDocs(notesCol);
      }
      return snapshot.docs.map(doc => doc.data() as Note);
    },

    async getNote(id: string): Promise<Note | null> {
      const noteSnap = await getDoc(doc(notesCol, id));
      return noteSnap.exists() ? (noteSnap.data() as Note) : null;
    },

    async createNote(notebookId: string, title: string): Promise<Note> {
      const notes = await this.getNotes(notebookId);
      const minOrder = notes.reduce((min, n) => Math.min(min, n.order || 0), 0);
      const now = new Date().toISOString();

      const note: Note = {
        id: generateId(),
        notebookId,
        title,
        content: '',
        attachments: [],
        columns: 1,
        order: minOrder - 1,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(notesCol, note.id), note);
      return note;
    },

    async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
      const noteRef = doc(notesCol, id);
      const noteSnap = await getDoc(noteRef);

      if (!noteSnap.exists()) throw new Error('Note not found');

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(noteRef, updateData);

      return {
        ...noteSnap.data(),
        ...updateData,
      } as Note;
    },

    async deleteNote(id: string): Promise<void> {
      await deleteDoc(doc(notesCol, id));
    },

    async reorderNotes(_notebookId: string, orderedIds: string[]): Promise<void> {
      const batch = writeBatch(db);

      orderedIds.forEach((id, index) => {
        batch.update(doc(notesCol, id), { order: index + 1 });
      });

      await batch.commit();
    },

    async moveNoteToNotebook(noteId: string, targetNotebookId: string): Promise<Note> {
      const noteRef = doc(notesCol, noteId);
      const noteSnap = await getDoc(noteRef);

      if (!noteSnap.exists()) throw new Error('Note not found');

      const targetNotes = await this.getNotes(targetNotebookId);
      const maxOrder = targetNotes.reduce((max, n) => Math.max(max, n.order || 0), 0);

      const updateData = {
        notebookId: targetNotebookId,
        order: maxOrder + 1,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(noteRef, updateData);

      return {
        ...noteSnap.data(),
        ...updateData,
      } as Note;
    },

    // Attachments (stored as base64 in the note document)
    async addAttachment(noteId: string, file: File): Promise<Attachment> {
      const noteRef = doc(notesCol, noteId);
      const noteSnap = await getDoc(noteRef);

      if (!noteSnap.exists()) throw new Error('Note not found');

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const attachment: Attachment = {
            id: generateId(),
            name: file.name,
            type: file.type,
            data: reader.result as string,
            createdAt: new Date().toISOString(),
          };

          const note = noteSnap.data() as Note;
          const attachments = [...note.attachments, attachment];

          await updateDoc(noteRef, {
            attachments,
            updatedAt: new Date().toISOString(),
          });

          resolve(attachment);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },

    async deleteAttachment(noteId: string, attachmentId: string): Promise<void> {
      const noteRef = doc(notesCol, noteId);
      const noteSnap = await getDoc(noteRef);

      if (!noteSnap.exists()) throw new Error('Note not found');

      const note = noteSnap.data() as Note;
      const attachments = note.attachments.filter(a => a.id !== attachmentId);

      await updateDoc(noteRef, {
        attachments,
        updatedAt: new Date().toISOString(),
      });
    },
  };
}
