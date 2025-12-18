import { useState, useCallback, useMemo } from 'react';
import { useNotes } from '../context/NotesContext';
import { ContextMenu } from './ContextMenu';
import type { MenuItem } from './ContextMenu';

interface ContextMenuState {
  x: number;
  y: number;
  type: 'notebook' | 'note' | 'empty';
  notebookId?: string;
  noteId?: string;
}

interface PendingTask {
  noteId: string;
  noteTitle: string;
  line: number;
  text: string;
}

interface SidebarProps {
  onTaskClick: (noteId: string, line: number) => void;
}

export function Sidebar({ onTaskClick }: SidebarProps) {
  const {
    state,
    setActiveNotebook,
    setActiveNote,
    createNotebook,
    createNote,
    updateNotebook,
    updateNote,
    deleteNotebook,
    deleteNote,
    reorderNotebooks,
    reorderNotes,
    moveNoteToNotebook,
  } = useNotes();

  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: 'notebook' | 'note'; id: string; notebookId?: string } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [isTasksExpanded, setIsTasksExpanded] = useState(true);

  // Parse pending tasks from all notes
  const pendingTasks = useMemo((): PendingTask[] => {
    const tasks: PendingTask[] = [];
    const taskRegex = /\[ \]/g;

    for (const note of state.notes) {
      const lines = note.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (taskRegex.test(line)) {
          // Extract the task text (everything after [ ])
          const text = line.replace(/.*\[ \]\s*/, '').trim();
          tasks.push({
            noteId: note.id,
            noteTitle: note.title || 'Untitled',
            line: i + 1, // 1-indexed
            text: text || '(empty task)',
          });
        }
        // Reset regex lastIndex for next iteration
        taskRegex.lastIndex = 0;
      }
    }
    return tasks;
  }, [state.notes]);

  // Sort notebooks and notes by order
  const sortedNotebooks = [...state.notebooks].sort((a, b) => (a.order || 0) - (b.order || 0));

  const toggleNotebook = (id: string) => {
    const newExpanded = new Set(expandedNotebooks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotebooks(newExpanded);
  };

  const handleNotebookClick = (id: string) => {
    setActiveNotebook(id);
    toggleNotebook(id);
  };

  const handleNoteClick = (noteId: string, notebookId: string) => {
    setActiveNotebook(notebookId);
    setActiveNote(noteId);
  };

  const getNotesForNotebook = useCallback((notebookId: string) => {
    return state.notes
      .filter((n) => n.notebookId === notebookId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [state.notes]);

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, type: 'notebook' | 'note' | 'empty', notebookId?: string, noteId?: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, notebookId, noteId });
  };

  const handleNewNotebook = async () => {
    const name = prompt('Notebook name:');
    if (name) {
      await createNotebook(name);
    }
  };

  const handleNewNote = async (notebookId: string) => {
    const title = prompt('Note title:');
    if (title) {
      const note = await createNote(notebookId, title);
      setActiveNote(note.id);
      setExpandedNotebooks(prev => new Set([...prev, notebookId]));
    }
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    const notebook = state.notebooks.find(n => n.id === notebookId);
    if (confirm(`Delete "${notebook?.name}" and all its notes?`)) {
      await deleteNotebook(notebookId);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const note = state.notes.find(n => n.id === noteId);
    if (confirm(`Delete "${note?.title || 'Untitled'}"?`)) {
      await deleteNote(noteId);
    }
  };

  const handleRenameNotebook = async (notebookId: string) => {
    const notebook = state.notebooks.find(n => n.id === notebookId);
    const name = prompt('Rename notebook:', notebook?.name);
    if (name && name !== notebook?.name) {
      await updateNotebook(notebookId, { name });
    }
  };

  const handleRenameNote = async (noteId: string) => {
    const note = state.notes.find(n => n.id === noteId);
    const title = prompt('Rename note:', note?.title);
    if (title && title !== note?.title) {
      await updateNote(noteId, { title });
    }
  };

  const getContextMenuItems = (): MenuItem[] => {
    if (!contextMenu) return [];

    if (contextMenu.type === 'empty') {
      return [
        { label: 'New Notebook', action: handleNewNotebook },
      ];
    }

    if (contextMenu.type === 'notebook' && contextMenu.notebookId) {
      return [
        { label: 'New Note', action: () => handleNewNote(contextMenu.notebookId!) },
        { label: 'Rename', action: () => handleRenameNotebook(contextMenu.notebookId!) },
        { label: 'Delete', action: () => handleDeleteNotebook(contextMenu.notebookId!), danger: true },
      ];
    }

    if (contextMenu.type === 'note' && contextMenu.noteId) {
      return [
        { label: 'Rename', action: () => handleRenameNote(contextMenu.noteId!) },
        { label: 'Delete', action: () => handleDeleteNote(contextMenu.noteId!), danger: true },
      ];
    }

    return [];
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'notebook' | 'note', id: string, notebookId?: string) => {
    setDraggedItem({ type, id, notebookId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(targetId);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string, targetType: 'notebook' | 'note', targetNotebookId?: string) => {
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem) return;

    // Reorder notebooks
    if (draggedItem.type === 'notebook' && targetType === 'notebook') {
      const orderedIds = sortedNotebooks.map(n => n.id);
      const fromIndex = orderedIds.indexOf(draggedItem.id);
      const toIndex = orderedIds.indexOf(targetId);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        orderedIds.splice(fromIndex, 1);
        orderedIds.splice(toIndex, 0, draggedItem.id);
        await reorderNotebooks(orderedIds);
      }
    }

    // Reorder notes within same notebook
    if (draggedItem.type === 'note' && targetType === 'note' && draggedItem.notebookId === targetNotebookId) {
      const notes = getNotesForNotebook(draggedItem.notebookId!);
      const orderedIds = notes.map(n => n.id);
      const fromIndex = orderedIds.indexOf(draggedItem.id);
      const toIndex = orderedIds.indexOf(targetId);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        orderedIds.splice(fromIndex, 1);
        orderedIds.splice(toIndex, 0, draggedItem.id);
        await reorderNotes(draggedItem.notebookId!, orderedIds);
      }
    }

    // Move note to different notebook
    if (draggedItem.type === 'note' && targetType === 'notebook') {
      if (draggedItem.notebookId !== targetId) {
        await moveNoteToNotebook(draggedItem.id, targetId);
        setExpandedNotebooks(prev => new Set([...prev, targetId]));
      }
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div
      className="sidebar"
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('.notebook-item, .note-item')) return;
        handleContextMenu(e, 'empty');
      }}
    >
      <div className="sidebar-header">
        <span>Notebooks</span>
        <button className="btn btn-icon" onClick={handleNewNotebook} title="New Notebook">+</button>
      </div>
      <div className="sidebar-content">
        {sortedNotebooks.length === 0 ? (
          <div className="sidebar-empty">
            No notebooks yet.
            <br />
            Press Alt+Shift+N to create one.
          </div>
        ) : (
          sortedNotebooks.map((notebook) => {
            const notes = getNotesForNotebook(notebook.id);
            const isExpanded = expandedNotebooks.has(notebook.id);
            const isActive = state.activeNotebookId === notebook.id;
            const isDragging = draggedItem?.type === 'notebook' && draggedItem.id === notebook.id;
            const isDragOver = dragOverItem === notebook.id;

            return (
              <div
                key={notebook.id}
                className={`notebook-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'notebook', notebook.id)}
                onDragOver={(e) => handleDragOver(e, notebook.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, notebook.id, 'notebook')}
                onDragEnd={handleDragEnd}
              >
                <div
                  className={`notebook-header ${isActive ? 'active' : ''} ${isDragOver && draggedItem?.type === 'note' ? 'drag-over-notebook' : ''}`}
                  onClick={() => handleNotebookClick(notebook.id)}
                  onContextMenu={(e) => handleContextMenu(e, 'notebook', notebook.id)}
                >
                  <span className="notebook-toggle">
                    {notes.length > 0 ? (isExpanded ? '▼' : '▶') : ' '}
                  </span>
                  <span className="notebook-icon">📁</span>
                  <span className="notebook-name">{notebook.name}</span>
                </div>
                {isExpanded && notes.length > 0 && (
                  <div className="note-list">
                    {notes.map((note) => {
                      const isNoteDragging = draggedItem?.type === 'note' && draggedItem.id === note.id;
                      const isNoteDragOver = dragOverItem === note.id;

                      return (
                        <div
                          key={note.id}
                          className={`note-item ${state.activeNoteId === note.id ? 'active' : ''} ${isNoteDragging ? 'dragging' : ''} ${isNoteDragOver ? 'drag-over' : ''}`}
                          onClick={() => handleNoteClick(note.id, notebook.id)}
                          onContextMenu={(e) => handleContextMenu(e, 'note', notebook.id, note.id)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, 'note', note.id, notebook.id)}
                          onDragOver={(e) => handleDragOver(e, note.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, note.id, 'note', notebook.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <span className="note-icon">📄</span>
                          <span className="note-title">
                            {note.title || 'Untitled'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pending Tasks Section */}
      {pendingTasks.length > 0 && (
        <div className="sidebar-tasks">
          <div
            className="sidebar-tasks-header"
            onClick={() => setIsTasksExpanded(!isTasksExpanded)}
          >
            <span>
              <span className="sidebar-tasks-toggle">{isTasksExpanded ? '▼' : '▶'}</span>
              {' '}Pending Tasks
              <span className="sidebar-tasks-count">{pendingTasks.length}</span>
            </span>
          </div>
          {isTasksExpanded && (
            <div className="sidebar-tasks-list">
              {pendingTasks.map((task, index) => (
                <div
                  key={`${task.noteId}-${task.line}-${index}`}
                  className="task-item"
                  onClick={() => onTaskClick(task.noteId, task.line)}
                  title={`${task.noteTitle} - Line ${task.line}`}
                >
                  <span className="task-checkbox">[ ]</span>
                  <span className="task-text">{task.text}</span>
                  <span className="task-source">{task.noteTitle}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
