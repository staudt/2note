import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotes } from '../context/NotesContext';
import { AttachmentBar } from './AttachmentBar';
import { StatusBar } from './StatusBar';
import {
  toggleBullet,
  toggleNumbering,
  moveLine,
  toggleStrikethrough,
  indentLine,
  deindentLine,
  toggleStar,
  toggleTask,
  processAutoFormat,
  handleEnterKey,
} from '../utils/formatting';
import { matchesShortcut } from '../utils/shortcuts';

const COLUMN_SEPARATOR = '\n|||COLUMN|||\n';

interface EditorProps {
  targetLine?: number;
  onLineNavigated?: () => void;
}

export function Editor({ targetLine, onLineNavigated }: EditorProps) {
  const { getActiveNote, updateNote, addAttachment } = useNotes();
  const activeNote = getActiveNote();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRightRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [isModified, setIsModified] = useState(false);
  const [activeColumn, setActiveColumn] = useState<'left' | 'right'>('left');
  const saveTimeoutRef = useRef<number | null>(null);

  // Split content for two-column mode
  const getColumnContent = useCallback((content: string, column: 'left' | 'right') => {
    if (!content.includes(COLUMN_SEPARATOR)) {
      return column === 'left' ? content : '';
    }
    const parts = content.split(COLUMN_SEPARATOR);
    return column === 'left' ? parts[0] : (parts[1] || '');
  }, []);

  // Combine content from both columns
  const combineColumnContent = useCallback((left: string, right: string) => {
    if (!right.trim()) return left;
    return `${left}${COLUMN_SEPARATOR}${right}`;
  }, []);

  const [leftContent, setLeftContent] = useState('');
  const [rightContent, setRightContent] = useState('');

  useEffect(() => {
    if (activeNote) {
      const content = activeNote.content;
      setLocalContent(content);
      setLeftContent(getColumnContent(content, 'left'));
      setRightContent(getColumnContent(content, 'right'));
      setLocalTitle(activeNote.title);
      setIsModified(false);
    }
  }, [activeNote?.id, getColumnContent]);

  // Auto-focus the textarea when note changes
  useEffect(() => {
    if (activeNote) {
      // Use requestAnimationFrame for more reliable focus
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          // Move cursor to end
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      });
    }
  }, [activeNote?.id]);

  // Handle navigation to specific line
  useEffect(() => {
    if (targetLine && activeNote && textareaRef.current) {
      const lines = localContent.split('\n');
      let charIndex = 0;
      for (let i = 0; i < targetLine - 1 && i < lines.length; i++) {
        charIndex += lines[i].length + 1;
      }

      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charIndex, charIndex);
      updateCursorPosition(textareaRef.current);
      onLineNavigated?.();
    }
  }, [targetLine, activeNote?.id]);

  const saveNote = useCallback(async () => {
    if (!activeNote) return;

    const contentToSave = activeNote.columns === 2
      ? combineColumnContent(leftContent, rightContent)
      : localContent;

    if (contentToSave !== activeNote.content || localTitle !== activeNote.title) {
      await updateNote(activeNote.id, {
        content: contentToSave,
        title: localTitle,
      });
      setIsModified(false);
    }
  }, [activeNote, localContent, leftContent, rightContent, localTitle, updateNote, combineColumnContent]);

  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveNote();
    }, 1000);
  }, [saveNote]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>, column?: 'left' | 'right') => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;

    // For two-column mode
    if (column) {
      if (column === 'left') {
        setLeftContent(newContent);
      } else {
        setRightContent(newContent);
      }
      setIsModified(true);
      scheduleAutoSave();
      updateCursorPosition(e.target);
      return;
    }

    // Check for auto-format triggers (like "- " -> "• ")
    const autoFormatResult = processAutoFormat(newContent, cursorPos);
    if (autoFormatResult) {
      setLocalContent(autoFormatResult.content);
      setIsModified(true);
      scheduleAutoSave();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = autoFormatResult.newSelectionStart;
          textareaRef.current.selectionEnd = autoFormatResult.newSelectionStart;
          updateCursorPosition(textareaRef.current);
        }
      }, 0);
      return;
    }

    setLocalContent(newContent);
    setIsModified(true);
    scheduleAutoSave();
    updateCursorPosition(e.target);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);
    setIsModified(true);
    scheduleAutoSave();
  };

  const updateCursorPosition = (textarea: HTMLTextAreaElement) => {
    const text = textarea.value.slice(0, textarea.selectionStart);
    const lines = text.split('\n');
    setCursorPosition({
      line: lines.length,
      column: (lines[lines.length - 1]?.length || 0) + 1,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, column?: 'left' | 'right') => {
    const textarea = e.currentTarget;
    const content = column ? (column === 'left' ? leftContent : rightContent) : localContent;
    const setContent = column
      ? (column === 'left' ? setLeftContent : setRightContent)
      : setLocalContent;

    // Tab - indent line or insert tab
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (e.shiftKey) {
        const result = deindentLine(content, textarea.selectionStart, textarea.selectionEnd);
        setContent(result.content);
        setIsModified(true);
        scheduleAutoSave();
        setTimeout(() => {
          textarea.selectionStart = result.newSelectionStart;
          textarea.selectionEnd = result.newSelectionEnd;
        }, 0);
      } else {
        const result = indentLine(content, textarea.selectionStart, textarea.selectionEnd);
        setContent(result.content);
        setIsModified(true);
        scheduleAutoSave();
        setTimeout(() => {
          textarea.selectionStart = result.newSelectionStart;
          textarea.selectionEnd = result.newSelectionEnd;
        }, 0);
      }
      return;
    }

    // Enter - continue bullets/numbers
    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      const result = handleEnterKey(content, textarea.selectionStart);
      if (result) {
        e.preventDefault();
        setContent(result.content);
        setIsModified(true);
        scheduleAutoSave();
        setTimeout(() => {
          textarea.selectionStart = result.newSelectionStart;
          textarea.selectionEnd = result.newSelectionStart;
        }, 0);
        return;
      }
    }

    // Ctrl+1 - toggle star
    if (matchesShortcut(e.nativeEvent, 'ctrl+1')) {
      e.preventDefault();
      const result = toggleStar(content, textarea.selectionStart);
      setContent(result.content);
      setIsModified(true);
      scheduleAutoSave();
      setTimeout(() => {
        textarea.selectionStart = result.newSelectionStart;
        textarea.selectionEnd = result.newSelectionStart;
      }, 0);
      return;
    }

    // Ctrl+2 - toggle task
    if (matchesShortcut(e.nativeEvent, 'ctrl+2')) {
      e.preventDefault();
      const result = toggleTask(content, textarea.selectionStart);
      setContent(result.content);
      setIsModified(true);
      scheduleAutoSave();
      setTimeout(() => {
        textarea.selectionStart = result.newSelectionStart;
        textarea.selectionEnd = result.newSelectionStart;
      }, 0);
      return;
    }

    if (matchesShortcut(e.nativeEvent, 'ctrl+s')) {
      e.preventDefault();
      saveNote();
      return;
    }

    if (matchesShortcut(e.nativeEvent, 'ctrl+b')) {
      e.preventDefault();
      const result = toggleBullet(content, textarea.selectionStart, textarea.selectionEnd);
      setContent(result.content);
      setIsModified(true);
      scheduleAutoSave();
      setTimeout(() => {
        textarea.selectionStart = result.newSelectionStart;
        textarea.selectionEnd = result.newSelectionEnd;
      }, 0);
      return;
    }

    if (matchesShortcut(e.nativeEvent, 'ctrl+shift+b')) {
      e.preventDefault();
      const result = toggleNumbering(content, textarea.selectionStart, textarea.selectionEnd);
      setContent(result.content);
      setIsModified(true);
      scheduleAutoSave();
      setTimeout(() => {
        textarea.selectionStart = result.newSelectionStart;
        textarea.selectionEnd = result.newSelectionEnd;
      }, 0);
      return;
    }

    if (matchesShortcut(e.nativeEvent, 'ctrl+/')) {
      e.preventDefault();
      const result = toggleStrikethrough(content, textarea.selectionStart, textarea.selectionEnd);
      setContent(result.content);
      setIsModified(true);
      scheduleAutoSave();
      setTimeout(() => {
        textarea.selectionStart = result.newSelectionStart;
        textarea.selectionEnd = result.newSelectionEnd;
      }, 0);
      return;
    }

    if (matchesShortcut(e.nativeEvent, 'alt+up')) {
      e.preventDefault();
      const result = moveLine(content, textarea.selectionStart, 'up');
      setContent(result.content);
      setIsModified(true);
      scheduleAutoSave();
      setTimeout(() => {
        textarea.selectionStart = result.newSelectionStart;
        textarea.selectionEnd = result.newSelectionStart;
      }, 0);
      return;
    }

    if (matchesShortcut(e.nativeEvent, 'alt+down')) {
      e.preventDefault();
      const result = moveLine(content, textarea.selectionStart, 'down');
      setContent(result.content);
      setIsModified(true);
      scheduleAutoSave();
      setTimeout(() => {
        textarea.selectionStart = result.newSelectionStart;
        textarea.selectionEnd = result.newSelectionStart;
      }, 0);
      return;
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file && activeNote) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const newFile = new File([file], `pasted-image-${timestamp}.png`, { type: file.type });
          await addAttachment(activeNote.id, newFile);
        }
        return;
      }
    }
  };

  const handleClick = (textarea: HTMLTextAreaElement) => {
    updateCursorPosition(textarea);
  };

  const handleSelect = (textarea: HTMLTextAreaElement) => {
    updateCursorPosition(textarea);
  };

  const handleFocus = (column: 'left' | 'right') => {
    setActiveColumn(column);
  };

  if (!activeNote) {
    return (
      <div className="editor-container">
        <div className="editor-empty">
          <div className="editor-empty-icon">📝</div>
          <div className="editor-empty-text">No note selected</div>
          <div className="editor-empty-hint">
            Select a note from the sidebar or press Alt+N to create a new one
          </div>
        </div>
        <StatusBar line={1} column={1} modified={false} />
      </div>
    );
  }

  const toggleColumns = async () => {
    if (activeNote) {
      const newColumns = activeNote.columns === 2 ? 1 : 2;

      // When switching to single column, combine content
      if (newColumns === 1 && rightContent) {
        const combined = combineColumnContent(leftContent, rightContent);
        setLocalContent(combined);
      }
      // When switching to two columns, split existing content
      if (newColumns === 2) {
        setLeftContent(localContent);
        setRightContent('');
      }

      await updateNote(activeNote.id, { columns: newColumns });
    }
  };

  const isTwoColumn = activeNote.columns === 2;

  return (
    <div className="editor-container">
      <div className="editor-header">
        <input
          type="text"
          className="editor-title-input"
          value={localTitle}
          onChange={handleTitleChange}
          placeholder="Note title..."
        />
        <button
          className="btn btn-icon"
          onClick={toggleColumns}
          title={isTwoColumn ? 'Single column' : 'Two columns'}
        >
          {isTwoColumn ? '▯' : '▯▯'}
        </button>
      </div>

      {isTwoColumn ? (
        <div className="editor-content two-columns">
          <textarea
            ref={textareaRef}
            className={`editor-textarea editor-textarea-left ${activeColumn === 'left' ? 'active' : ''}`}
            value={leftContent}
            onChange={(e) => handleContentChange(e, 'left')}
            onKeyDown={(e) => handleKeyDown(e, 'left')}
            onPaste={handlePaste}
            onClick={(e) => handleClick(e.currentTarget)}
            onSelect={(e) => handleSelect(e.currentTarget)}
            onFocus={() => handleFocus('left')}
            placeholder="Left column..."
          />
          <div className="column-divider" />
          <textarea
            ref={textareaRightRef}
            className={`editor-textarea editor-textarea-right ${activeColumn === 'right' ? 'active' : ''}`}
            value={rightContent}
            onChange={(e) => handleContentChange(e, 'right')}
            onKeyDown={(e) => handleKeyDown(e, 'right')}
            onPaste={handlePaste}
            onClick={(e) => handleClick(e.currentTarget)}
            onSelect={(e) => handleSelect(e.currentTarget)}
            onFocus={() => handleFocus('right')}
            placeholder="Right column..."
          />
        </div>
      ) : (
        <div className="editor-content">
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={localContent}
            onChange={(e) => handleContentChange(e)}
            onKeyDown={(e) => handleKeyDown(e)}
            onPaste={handlePaste}
            onClick={(e) => handleClick(e.currentTarget)}
            onSelect={(e) => handleSelect(e.currentTarget)}
            placeholder="Start typing... (Ctrl+B for bullets, Ctrl+Shift+B for numbers)"
          />
        </div>
      )}

      <AttachmentBar attachments={activeNote.attachments} noteId={activeNote.id} />
      <StatusBar line={cursorPosition.line} column={cursorPosition.column} modified={isModified} />
    </div>
  );
}
