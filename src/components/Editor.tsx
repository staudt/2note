import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotes } from '../context/NotesContext';
import { AttachmentBar } from './AttachmentBar';
import { StatusBar } from './StatusBar';
import { matchesShortcut } from '../utils/shortcuts';

const COLUMN_SEPARATOR = '\n|||COLUMN|||\n';

interface EditorProps {
  targetLine?: number;
  onLineNavigated?: () => void;
  onOpenCommandPalette?: () => void;
}

export function Editor({ targetLine, onLineNavigated, onOpenCommandPalette }: EditorProps) {
  const { getActiveNote, updateNote, addAttachment } = useNotes();
  const activeNote = getActiveNote();
  const textareaRef = useRef<HTMLTextAreaElement | HTMLDivElement>(null);
  const textareaRightRef = useRef<HTMLTextAreaElement | HTMLDivElement>(null);
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

      // Update contenteditable divs manually to avoid cursor reset
      if (textareaRef.current instanceof HTMLDivElement) {
        const singleContent = activeNote.columns === 1 ? content : getColumnContent(content, 'left');
        if (textareaRef.current.innerHTML !== singleContent) {
          textareaRef.current.innerHTML = singleContent;
        }
      }
      if (textareaRightRef.current instanceof HTMLDivElement && activeNote.columns === 2) {
        const rightContent = getColumnContent(content, 'right');
        if (textareaRightRef.current.innerHTML !== rightContent) {
          textareaRightRef.current.innerHTML = rightContent;
        }
      }
    }
  }, [activeNote?.id, getColumnContent]);

  // Auto-focus the textarea when note changes
  useEffect(() => {
    if (activeNote) {
      // Use requestAnimationFrame for more reliable focus
      requestAnimationFrame(() => {
        const element = textareaRef.current;
        if (element) {
          element.focus();
          // Move cursor to end
          if (element instanceof HTMLTextAreaElement) {
            element.setSelectionRange(element.value.length, element.value.length);
          } else {
            // For contenteditable div, move cursor to end
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(element);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }
      });
    }
  }, [activeNote?.id]);

  // Handle navigation to specific line
  useEffect(() => {
    if (targetLine && activeNote && textareaRef.current) {
      const element = textareaRef.current;
      element.focus();
      onLineNavigated?.();
    }
  }, [targetLine, activeNote?.id, onLineNavigated]);

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

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>, column?: 'left' | 'right') => {
    const newContent = e.currentTarget.innerHTML;

    // Check for auto-format triggers (like "- " -> "• ")
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
        const text = textNode.textContent;
        const offset = range.startOffset;

        // Check if we just typed "- " at the start of a line
        if (text.startsWith('- ') && offset === 2) {
          // Replace "- " with "• "
          textNode.textContent = '• ' + text.slice(2);
          range.setStart(textNode, 2);
          range.setEnd(textNode, 2);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }

    // For two-column mode
    if (column) {
      if (column === 'left') {
        setLeftContent(newContent);
      } else {
        setRightContent(newContent);
      }
    } else {
      setLocalContent(newContent);
    }
    setIsModified(true);
    scheduleAutoSave();
  };


  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);
    setIsModified(true);
    scheduleAutoSave();
  };

  const updateCursorPosition = useCallback(() => {
    // For contenteditable div
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      const container = textareaRef.current || textareaRightRef.current;
      if (container) {
        preCaretRange.selectNodeContents(container);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        const text = preCaretRange.toString();
        const lines = text.split('\n');
        setCursorPosition({
          line: lines.length,
          column: (lines[lines.length - 1]?.length || 0) + 1,
        });
      }
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl+S - save
    if (matchesShortcut(e.nativeEvent, 'ctrl+s')) {
      e.preventDefault();
      saveNote();
      return;
    }

    // Ctrl+B - bold
    if (matchesShortcut(e.nativeEvent, 'ctrl+b')) {
      e.preventDefault();
      document.execCommand('bold', false);
      setIsModified(true);
      scheduleAutoSave();
      return;
    }

    // Ctrl+/ - strikethrough
    if (matchesShortcut(e.nativeEvent, 'ctrl+/')) {
      e.preventDefault();
      document.execCommand('strikeThrough', false);
      setIsModified(true);
      scheduleAutoSave();
      return;
    }

    // Ctrl+1 - toggle star
    if (matchesShortcut(e.nativeEvent, 'ctrl+1')) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const cursorOffset = range.startOffset;
        let node = range.startContainer;

        // Find the text node at the start of the line
        if (node.nodeType !== Node.TEXT_NODE) {
          node = node.childNodes[0] || node;
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          const text = node.textContent;
          // Match indentation + bullet/number
          const prefixMatch = text.match(/^(\s*(?:•\s*|\d+\.\s*)?)/);
          const prefix = prefixMatch ? prefixMatch[1] : '';
          const restOfLine = text.slice(prefix.length);
          let newOffset = cursorOffset;

          if (restOfLine.startsWith('⭐ ')) {
            // Remove star (2 characters)
            node.textContent = prefix + restOfLine.slice(2);
            // Adjust cursor if it's after the star
            if (cursorOffset > prefix.length) {
              newOffset = Math.max(prefix.length, cursorOffset - 2);
            }
          } else {
            // Add star after bullet/number (2 characters)
            node.textContent = prefix + '⭐ ' + restOfLine;
            // Adjust cursor if it's after the insertion point
            if (cursorOffset >= prefix.length) {
              newOffset = cursorOffset + 2;
            }
          }

          // Restore cursor position
          const newRange = document.createRange();
          newRange.setStart(node, newOffset);
          newRange.setEnd(node, newOffset);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      setIsModified(true);
      scheduleAutoSave();
      return;
    }

    // Ctrl+2 - toggle task
    if (matchesShortcut(e.nativeEvent, 'ctrl+2')) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const cursorOffset = range.startOffset;
        let node = range.startContainer;

        if (node.nodeType !== Node.TEXT_NODE) {
          node = node.childNodes[0] || node;
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          const text = node.textContent;
          // Match indentation + bullet/number + star
          const prefixMatch = text.match(/^(\s*(?:•\s*|\d+\.\s*)?(?:⭐\s*)?)/);
          const prefix = prefixMatch ? prefixMatch[1] : '';
          const restOfLine = text.slice(prefix.length);
          let newOffset = cursorOffset;

          if (restOfLine.startsWith('☐ ')) {
            // Open task -> Closed task (same length)
            node.textContent = prefix + '☑ ' + restOfLine.slice(2);
            // No cursor adjustment needed - same length
            newOffset = cursorOffset;
          } else if (restOfLine.startsWith('☑ ')) {
            // Closed task -> Remove task (remove 2 characters)
            node.textContent = prefix + restOfLine.slice(2);
            // Adjust cursor if it's after the task
            if (cursorOffset > prefix.length) {
              newOffset = Math.max(prefix.length, cursorOffset - 2);
            }
          } else {
            // No task -> Open task (add 2 characters: "☐ ")
            node.textContent = prefix + '☐ ' + restOfLine;
            // Adjust cursor if it's after the insertion point
            if (cursorOffset >= prefix.length) {
              newOffset = cursorOffset + 2;
            }
          }

          // Restore cursor position
          const newRange = document.createRange();
          newRange.setStart(node, newOffset);
          newRange.setEnd(node, newOffset);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      setIsModified(true);
      scheduleAutoSave();
      return;
    }

    // Tab - indent/dedent line
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const cursorOffset = range.startOffset;
        let node = range.startContainer;

        // Get to the text node
        if (node.nodeType !== Node.TEXT_NODE) {
          node = node.childNodes[0] || node;
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          let newOffset = cursorOffset;

          if (e.shiftKey) {
            // Shift+Tab - Dedent (remove one tab from start)
            const text = node.textContent;
            if (text.startsWith('\t')) {
              node.textContent = text.slice(1);
              newOffset = Math.max(0, cursorOffset - 1);
            } else if (text.startsWith('    ')) {
              // Also handle spaces
              node.textContent = text.slice(4);
              newOffset = Math.max(0, cursorOffset - 4);
            }
          } else {
            // Tab - Indent (add tab at start of line)
            const text = node.textContent;
            node.textContent = '\t' + text;
            newOffset = cursorOffset + 1;
          }

          // Restore cursor position
          const newRange = document.createRange();
          newRange.setStart(node, newOffset);
          newRange.setEnd(node, newOffset);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      setIsModified(true);
      scheduleAutoSave();
      return;
    }

    // Enter - continue bullets/numbers
    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;

        if (node.nodeType !== Node.TEXT_NODE) {
          node = node.childNodes[0] || node;
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          const text = node.textContent;

          // Check for bullet points
          const bulletMatch = text.match(/^(\s*)(•\s*|(\d+)\.\s*)((?:[☐☑]\s*)?)(⭐\s*)?/);
          if (bulletMatch) {
            const [fullMatch, indent, bulletOrNum, num, task] = bulletMatch;
            const restOfLine = text.slice(fullMatch.length);

            // If line is empty (just the prefix), don't continue the list
            if (restOfLine.trim() === '') {
              e.preventDefault();
              document.execCommand('insertText', false, '\n' + indent);
              return;
            }

            // Continue with same format on next line
            e.preventDefault();
            let newPrefix = indent;
            if (num) {
              // Increment number
              newPrefix += `${parseInt(num) + 1}. `;
            } else if (bulletOrNum) {
              newPrefix += bulletOrNum;
            }
            if (task) newPrefix += '☐ ';
            // Don't continue star

            document.execCommand('insertText', false, '\n' + newPrefix);
            return;
          }
        }
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;

    // Check if there's any text content available
    const hasText = e.clipboardData.types.includes('text/plain') || e.clipboardData.types.includes('text/html');
    let textContent = '';

    if (hasText) {
      textContent = e.clipboardData.getData('text/plain');
    }

    // Only process images if there's no meaningful text content
    // This prevents pasting image representations when text is available (like from OneNote)
    if (!textContent.trim()) {
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
    }

    // If we have text content, let the default paste behavior handle it
    // or manually insert it for contenteditable
    if (hasText && e.currentTarget instanceof HTMLDivElement) {
      // For contenteditable, we want plain text only
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }
  };

  const handleClick = useCallback(() => {
    updateCursorPosition();
  }, [updateCursorPosition]);

  const handleSelect = useCallback(() => {
    updateCursorPosition();
  }, [updateCursorPosition]);

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

  const toggleBullet = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const container = activeColumn === 'right' ? textareaRightRef.current : textareaRef.current;
    if (!container) return;

    // Get current selection/cursor position
    const range = selection.getRangeAt(0);

    // Find the line(s) containing the selection by looking at text nodes
    const startNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer
      : range.startContainer.childNodes[0] || range.startContainer;

    // For single cursor (no selection), work with just the current line
    if (range.collapsed) {
      const node = startNode;
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent;
        const offset = range.startOffset;

        if (text.match(/^\s*•\s/)) {
          // Remove bullet
          node.textContent = text.replace(/^(\s*)•\s*/, '$1');
          const newRange = document.createRange();
          newRange.setStart(node, Math.max(0, offset - 2));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // Add bullet
          const match = text.match(/^(\s*)(?:\d+\.\s*)?/);
          const indent = match ? match[1] : '';
          const rest = text.slice(match ? match[0].length : 0);
          node.textContent = indent + '• ' + rest;
          const newRange = document.createRange();
          newRange.setStart(node, offset + 2);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else {
      // Multi-line selection - work with selected text, preserving structure
      const selectedText = range.toString();
      if (!selectedText) return;

      const lines = selectedText.split('\n');

      // Check if all selected lines have bullets
      let allHaveBullets = true;
      for (const line of lines) {
        if (line.trim() !== '' && !line.match(/^\s*•\s/)) {
          allHaveBullets = false;
          break;
        }
      }

      const newLines = lines.map(line => {
        // Preserve empty lines exactly
        if (line.trim() === '') return line;

        if (allHaveBullets && line.match(/^\s*•\s/)) {
          return line.replace(/^(\s*)•\s/, '$1');
        } else if (!allHaveBullets) {
          const match = line.match(/^(\s*)(?:\d+\.\s)?/);
          const indent = match ? match[1] : '';
          const rest = line.slice(match ? match[0].length : 0);
          return indent + '• ' + rest;
        }
        return line;
      });

      // Replace selection
      range.deleteContents();
      const textNode = document.createTextNode(newLines.join('\n'));
      range.insertNode(textNode);

      // Move cursor to end of inserted text
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setIsModified(true);
    scheduleAutoSave();
  };

  const toggleNumberedList = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const container = activeColumn === 'right' ? textareaRightRef.current : textareaRef.current;
    if (!container) return;

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer
      : range.startContainer.childNodes[0] || range.startContainer;

    // For single cursor (no selection), work with just the current line
    if (range.collapsed) {
      const node = startNode;
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent;
        const offset = range.startOffset;

        const numberMatch = text.match(/^\s*(\d+)\.\s/);
        if (numberMatch) {
          // Remove number
          const oldLength = numberMatch[0].length - numberMatch[1].length + 1;
          node.textContent = text.replace(/^(\s*)\d+\.\s*/, '$1');
          const newRange = document.createRange();
          newRange.setStart(node, Math.max(0, offset - oldLength));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // Add number
          const match = text.match(/^(\s*)(?:•\s*)?/);
          const indent = match ? match[1] : '';
          const rest = text.slice(match ? match[0].length : 0);
          node.textContent = indent + '1. ' + rest;
          const newRange = document.createRange();
          newRange.setStart(node, offset + 3);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else {
      // Multi-line selection - work with selected text, preserving structure
      const selectedText = range.toString();
      if (!selectedText) return;

      const lines = selectedText.split('\n');

      // Check if all selected lines have numbers
      let allHaveNumbers = true;
      for (const line of lines) {
        if (line.trim() !== '' && !line.match(/^\s*\d+\.\s/)) {
          allHaveNumbers = false;
          break;
        }
      }

      const newLines = lines.map((line, idx) => {
        // Preserve empty lines exactly
        if (line.trim() === '') return line;

        if (allHaveNumbers && line.match(/^\s*\d+\.\s/)) {
          return line.replace(/^(\s*)\d+\.\s/, '$1');
        } else if (!allHaveNumbers) {
          const match = line.match(/^(\s*)(?:•\s)?/);
          const indent = match ? match[1] : '';
          const rest = line.slice(match ? match[0].length : 0);
          return indent + `${idx + 1}. ` + rest;
        }
        return line;
      });

      // Replace selection
      range.deleteContents();
      const textNode = document.createTextNode(newLines.join('\n'));
      range.insertNode(textNode);

      // Move cursor to end of inserted text
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setIsModified(true);
    scheduleAutoSave();
  };

  const indentLine = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const container = activeColumn === 'right' ? textareaRightRef.current : textareaRef.current;
    if (!container) return;

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer
      : range.startContainer.childNodes[0] || range.startContainer;

    if (range.collapsed) {
      const node = startNode;
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const offset = range.startOffset;
        node.textContent = '\t' + node.textContent;
        const newRange = document.createRange();
        newRange.setStart(node, offset + 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      // Multi-line selection
      const selectedText = range.toString();
      if (!selectedText) return;

      const lines = selectedText.split('\n');
      const newLines = lines.map(line => '\t' + line);

      range.deleteContents();
      const textNode = document.createTextNode(newLines.join('\n'));
      range.insertNode(textNode);

      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setIsModified(true);
    scheduleAutoSave();
  };

  const dedentLine = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const container = activeColumn === 'right' ? textareaRightRef.current : textareaRef.current;
    if (!container) return;

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer
      : range.startContainer.childNodes[0] || range.startContainer;

    if (range.collapsed) {
      const node = startNode;
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent;
        const offset = range.startOffset;
        let removed = 0;

        if (text.startsWith('\t')) {
          node.textContent = text.slice(1);
          removed = 1;
        } else if (text.startsWith('    ')) {
          node.textContent = text.slice(4);
          removed = 4;
        }

        if (removed > 0) {
          const newRange = document.createRange();
          newRange.setStart(node, Math.max(0, offset - removed));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else {
      // Multi-line selection
      const selectedText = range.toString();
      if (!selectedText) return;

      const lines = selectedText.split('\n');
      const newLines = lines.map(line => {
        if (line.startsWith('\t')) return line.slice(1);
        if (line.startsWith('    ')) return line.slice(4);
        return line;
      });

      range.deleteContents();
      const textNode = document.createTextNode(newLines.join('\n'));
      range.insertNode(textNode);

      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setIsModified(true);
    scheduleAutoSave();
  };

  const toggleBold = () => {
    document.execCommand('bold', false);
    setIsModified(true);
    scheduleAutoSave();
  };

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
          onBlur={saveNote}
          placeholder="Note title..."
        />
        <div className="editor-toolbar">
          <div className="editor-toolbar-group">
            <button
              className="btn btn-icon"
              onClick={toggleBullet}
              title="Toggle bullet (•)"
            >
              •
            </button>
            <button
              className="btn btn-icon"
              onClick={toggleNumberedList}
              title="Toggle numbered list"
            >
              1.
            </button>
            <button
              className="btn btn-icon"
              onClick={dedentLine}
              title="Decrease indent (Shift+Tab)"
            >
              ◂
            </button>
            <button
              className="btn btn-icon"
              onClick={indentLine}
              title="Increase indent (Tab)"
            >
              ▸
            </button>
            <button
              className="btn btn-icon"
              onClick={toggleBold}
              title="Bold (Ctrl+B)"
            >
              <b>B</b>
            </button>
          </div>
          <div className="editor-toolbar-divider"></div>
          <button
            className="btn btn-icon"
            onClick={onOpenCommandPalette}
            title="Command palette (Ctrl+P)"
          >
            ⌘
          </button>
          <div className="editor-toolbar-divider"></div>
          <button
            className="btn btn-icon"
            onClick={toggleColumns}
            title={isTwoColumn ? 'Single column' : 'Two columns'}
          >
            {isTwoColumn ? '▯' : '▯▯'}
          </button>
        </div>
      </div>

      {isTwoColumn ? (
        <div className="editor-content two-columns">
          <div
            ref={textareaRef as any}
            className={`editor-textarea editor-textarea-left ${activeColumn === 'left' ? 'active' : ''}`}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleContentChange(e, 'left')}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste as any}
            onClick={handleClick}
            onSelect={handleSelect}
            onKeyUp={updateCursorPosition}
            onFocus={() => handleFocus('left')}
            data-placeholder="Left column..."
          />
          <div className="column-divider" />
          <div
            ref={textareaRightRef as any}
            className={`editor-textarea editor-textarea-right ${activeColumn === 'right' ? 'active' : ''}`}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleContentChange(e, 'right')}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste as any}
            onClick={handleClick}
            onSelect={handleSelect}
            onKeyUp={updateCursorPosition}
            onFocus={() => handleFocus('right')}
            data-placeholder="Right column..."
          />
        </div>
      ) : (
        <div className="editor-content">
          <div
            ref={textareaRef as any}
            className="editor-textarea"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleContentChange(e)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste as any}
            onClick={handleClick}
            onSelect={handleSelect}
            onKeyUp={updateCursorPosition}
            data-placeholder="Start typing... (Type '- ' for bullets, '1. ' for numbers)"
          />
        </div>
      )}

      <AttachmentBar attachments={activeNote.attachments} noteId={activeNote.id} />
      <StatusBar line={cursorPosition.line} column={cursorPosition.column} modified={isModified} />
    </div>
  );
}
