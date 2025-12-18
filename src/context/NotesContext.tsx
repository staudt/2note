import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { Notebook, Note, Attachment, AppState } from '../types';
import type { StorageAdapter } from '../storage/types';
import { getStorageAdapter } from '../storage';

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTEBOOKS'; payload: Notebook[] }
  | { type: 'ADD_NOTEBOOK'; payload: Notebook }
  | { type: 'UPDATE_NOTEBOOK'; payload: Notebook }
  | { type: 'DELETE_NOTEBOOK'; payload: string }
  | { type: 'SET_NOTES'; payload: Note[] }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'SET_ACTIVE_NOTEBOOK'; payload: string | null }
  | { type: 'SET_ACTIVE_NOTE'; payload: string | null }
  | { type: 'ADD_ATTACHMENT'; payload: { noteId: string; attachment: Attachment } }
  | { type: 'DELETE_ATTACHMENT'; payload: { noteId: string; attachmentId: string } };

const initialState: AppState = {
  notebooks: [],
  notes: [],
  activeNotebookId: null,
  activeNoteId: null,
  isLoading: true,
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_NOTEBOOKS':
      return { ...state, notebooks: action.payload };
    case 'ADD_NOTEBOOK':
      return { ...state, notebooks: [...state.notebooks, action.payload] };
    case 'UPDATE_NOTEBOOK':
      return {
        ...state,
        notebooks: state.notebooks.map((n) =>
          n.id === action.payload.id ? action.payload : n
        ),
      };
    case 'DELETE_NOTEBOOK':
      return {
        ...state,
        notebooks: state.notebooks.filter((n) => n.id !== action.payload),
        notes: state.notes.filter((n) => n.notebookId !== action.payload),
        activeNotebookId:
          state.activeNotebookId === action.payload ? null : state.activeNotebookId,
        activeNoteId:
          state.notes.find((n) => n.id === state.activeNoteId)?.notebookId === action.payload
            ? null
            : state.activeNoteId,
      };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'ADD_NOTE':
      return { ...state, notes: [...state.notes, action.payload] };
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.payload.id ? action.payload : n
        ),
      };
    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter((n) => n.id !== action.payload),
        activeNoteId: state.activeNoteId === action.payload ? null : state.activeNoteId,
      };
    case 'SET_ACTIVE_NOTEBOOK':
      return { ...state, activeNotebookId: action.payload };
    case 'SET_ACTIVE_NOTE':
      return { ...state, activeNoteId: action.payload };
    case 'ADD_ATTACHMENT':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.payload.noteId
            ? { ...n, attachments: [...n.attachments, action.payload.attachment] }
            : n
        ),
      };
    case 'DELETE_ATTACHMENT':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.payload.noteId
            ? {
                ...n,
                attachments: n.attachments.filter((a) => a.id !== action.payload.attachmentId),
              }
            : n
        ),
      };
    default:
      return state;
  }
}

interface NotesContextValue {
  state: AppState;
  storage: StorageAdapter;
  createNotebook: (name: string) => Promise<Notebook>;
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  reorderNotebooks: (orderedIds: string[]) => Promise<void>;
  createNote: (notebookId: string, title: string) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  reorderNotes: (notebookId: string, orderedIds: string[]) => Promise<void>;
  moveNoteToNotebook: (noteId: string, targetNotebookId: string) => Promise<void>;
  setActiveNotebook: (id: string | null) => void;
  setActiveNote: (id: string | null) => void;
  addAttachment: (noteId: string, file: File) => Promise<Attachment>;
  deleteAttachment: (noteId: string, attachmentId: string) => Promise<void>;
  getActiveNote: () => Note | null;
}

const NotesContext = createContext<NotesContextValue | null>(null);

interface NotesProviderProps {
  children: React.ReactNode;
  userId: string;
}

export function NotesProvider({ children, userId }: NotesProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const storage = useMemo(() => getStorageAdapter(userId), [userId]);

  useEffect(() => {
    async function loadData() {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const [notebooks, notes] = await Promise.all([
          storage.getNotebooks(),
          storage.getNotes(),
        ]);
        dispatch({ type: 'SET_NOTEBOOKS', payload: notebooks });
        dispatch({ type: 'SET_NOTES', payload: notes });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    loadData();
  }, [storage]);

  const createNotebook = useCallback(async (name: string) => {
    const notebook = await storage.createNotebook(name);
    dispatch({ type: 'ADD_NOTEBOOK', payload: notebook });
    return notebook;
  }, []);

  const updateNotebook = useCallback(async (id: string, updates: Partial<Notebook>) => {
    const notebook = await storage.updateNotebook(id, updates);
    dispatch({ type: 'UPDATE_NOTEBOOK', payload: notebook });
  }, []);

  const deleteNotebook = useCallback(async (id: string) => {
    await storage.deleteNotebook(id);
    dispatch({ type: 'DELETE_NOTEBOOK', payload: id });
  }, []);

  const createNote = useCallback(async (notebookId: string, title: string) => {
    const note = await storage.createNote(notebookId, title);
    dispatch({ type: 'ADD_NOTE', payload: note });
    return note;
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    const note = await storage.updateNote(id, updates);
    dispatch({ type: 'UPDATE_NOTE', payload: note });
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await storage.deleteNote(id);
    dispatch({ type: 'DELETE_NOTE', payload: id });
  }, []);

  const setActiveNotebook = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_NOTEBOOK', payload: id });
  }, []);

  const setActiveNote = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_NOTE', payload: id });
  }, []);

  const addAttachment = useCallback(async (noteId: string, file: File) => {
    const attachment = await storage.addAttachment(noteId, file);
    dispatch({ type: 'ADD_ATTACHMENT', payload: { noteId, attachment } });
    return attachment;
  }, []);

  const deleteAttachment = useCallback(async (noteId: string, attachmentId: string) => {
    await storage.deleteAttachment(noteId, attachmentId);
    dispatch({ type: 'DELETE_ATTACHMENT', payload: { noteId, attachmentId } });
  }, []);

  const getActiveNote = useCallback(() => {
    return state.notes.find((n) => n.id === state.activeNoteId) || null;
  }, [state.notes, state.activeNoteId]);

  const reorderNotebooks = useCallback(async (orderedIds: string[]) => {
    await storage.reorderNotebooks(orderedIds);
    const reordered = orderedIds
      .map((id, index) => {
        const notebook = state.notebooks.find(n => n.id === id);
        return notebook ? { ...notebook, order: index + 1 } : null;
      })
      .filter((n): n is Notebook => n !== null);
    dispatch({ type: 'SET_NOTEBOOKS', payload: reordered });
  }, [state.notebooks]);

  const reorderNotes = useCallback(async (notebookId: string, orderedIds: string[]) => {
    await storage.reorderNotes(notebookId, orderedIds);
    const updatedNotes = state.notes.map(note => {
      if (note.notebookId === notebookId) {
        const orderIndex = orderedIds.indexOf(note.id);
        return orderIndex >= 0 ? { ...note, order: orderIndex + 1 } : note;
      }
      return note;
    });
    dispatch({ type: 'SET_NOTES', payload: updatedNotes });
  }, [state.notes]);

  const moveNoteToNotebook = useCallback(async (noteId: string, targetNotebookId: string) => {
    const updatedNote = await storage.moveNoteToNotebook(noteId, targetNotebookId);
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
  }, []);

  return (
    <NotesContext.Provider
      value={{
        state,
        storage,
        createNotebook,
        updateNotebook,
        deleteNotebook,
        reorderNotebooks,
        createNote,
        updateNote,
        deleteNote,
        reorderNotes,
        moveNoteToNotebook,
        setActiveNotebook,
        setActiveNote,
        addAttachment,
        deleteAttachment,
        getActiveNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
