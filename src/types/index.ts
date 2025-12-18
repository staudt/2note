export interface Notebook {
  id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string;
  createdAt: string;
}

export interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  attachments: Attachment[];
  columns: 1 | 2;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  notebooks: Notebook[];
  notes: Note[];
  activeNotebookId: string | null;
  activeNoteId: string | null;
  isLoading: boolean;
  error: string | null;
}
