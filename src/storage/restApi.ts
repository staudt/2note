import type { Notebook, Note, Attachment } from '../types';
import type { StorageAdapter } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export const restApiAdapter: StorageAdapter = {
  // Notebooks
  async getNotebooks(): Promise<Notebook[]> {
    return fetchApi<Notebook[]>('/notebooks');
  },

  async createNotebook(name: string): Promise<Notebook> {
    return fetchApi<Notebook>('/notebooks', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async updateNotebook(id: string, updates: Partial<Notebook>): Promise<Notebook> {
    return fetchApi<Notebook>(`/notebooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteNotebook(id: string): Promise<void> {
    await fetchApi(`/notebooks/${id}`, { method: 'DELETE' });
  },

  async reorderNotebooks(orderedIds: string[]): Promise<void> {
    await fetchApi('/notebooks/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  },

  // Notes
  async getNotes(notebookId?: string): Promise<Note[]> {
    const query = notebookId ? `?notebookId=${notebookId}` : '';
    return fetchApi<Note[]>(`/notes${query}`);
  },

  async getNote(id: string): Promise<Note | null> {
    try {
      return await fetchApi<Note>(`/notes/${id}`);
    } catch {
      return null;
    }
  },

  async createNote(notebookId: string, title: string): Promise<Note> {
    return fetchApi<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({ notebookId, title }),
    });
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    return fetchApi<Note>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteNote(id: string): Promise<void> {
    await fetchApi(`/notes/${id}`, { method: 'DELETE' });
  },

  async reorderNotes(notebookId: string, orderedIds: string[]): Promise<void> {
    await fetchApi(`/notebooks/${notebookId}/notes/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  },

  async moveNoteToNotebook(noteId: string, targetNotebookId: string): Promise<Note> {
    return fetchApi<Note>(`/notes/${noteId}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetNotebookId }),
    });
  },

  // Attachments
  async addAttachment(noteId: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/notes/${noteId}/attachments`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async deleteAttachment(noteId: string, attachmentId: string): Promise<void> {
    await fetchApi(`/notes/${noteId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },
};
