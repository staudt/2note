export function toggleBullet(
  content: string,
  selectionStart: number,
  selectionEnd: number
): { content: string; newSelectionStart: number; newSelectionEnd: number } {
  const lines = content.split('\n');
  let charCount = 0;
  let startLineIndex = 0;
  let endLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1;
    if (charCount + lineLength > selectionStart && startLineIndex === 0) {
      startLineIndex = i;
    }
    if (charCount + lineLength > selectionEnd) {
      endLineIndex = i;
      break;
    }
    charCount += lineLength;
    if (i === lines.length - 1) {
      endLineIndex = i;
    }
  }

  let offset = 0;
  for (let i = startLineIndex; i <= endLineIndex; i++) {
    const line = lines[i];
    if (line.startsWith('• ')) {
      lines[i] = line.slice(2);
      offset -= 2;
    } else if (line.startsWith('- ')) {
      lines[i] = '• ' + line.slice(2);
    } else if (/^\d+\. /.test(line)) {
      lines[i] = '• ' + line.replace(/^\d+\. /, '');
    } else {
      lines[i] = '• ' + line;
      offset += 2;
    }
  }

  return {
    content: lines.join('\n'),
    newSelectionStart: selectionStart + (startLineIndex === 0 ? offset : 0),
    newSelectionEnd: selectionEnd + offset,
  };
}

export function toggleNumbering(
  content: string,
  selectionStart: number,
  selectionEnd: number
): { content: string; newSelectionStart: number; newSelectionEnd: number } {
  const lines = content.split('\n');
  let charCount = 0;
  let startLineIndex = 0;
  let endLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1;
    if (charCount + lineLength > selectionStart && startLineIndex === 0) {
      startLineIndex = i;
    }
    if (charCount + lineLength > selectionEnd) {
      endLineIndex = i;
      break;
    }
    charCount += lineLength;
    if (i === lines.length - 1) {
      endLineIndex = i;
    }
  }

  let offset = 0;
  let number = 1;
  for (let i = startLineIndex; i <= endLineIndex; i++) {
    const line = lines[i];
    if (/^\d+\. /.test(line)) {
      const match = line.match(/^(\d+)\. /);
      lines[i] = line.replace(/^\d+\. /, '');
      offset -= (match?.[0].length || 3);
    } else if (line.startsWith('• ')) {
      lines[i] = `${number}. ` + line.slice(2);
      offset += `${number}. `.length - 2;
      number++;
    } else if (line.startsWith('- ')) {
      lines[i] = `${number}. ` + line.slice(2);
      offset += `${number}. `.length - 2;
      number++;
    } else {
      lines[i] = `${number}. ` + line;
      offset += `${number}. `.length;
      number++;
    }
  }

  return {
    content: lines.join('\n'),
    newSelectionStart: selectionStart,
    newSelectionEnd: selectionEnd + offset,
  };
}

export function moveLine(
  content: string,
  selectionStart: number,
  direction: 'up' | 'down'
): { content: string; newSelectionStart: number } {
  const lines = content.split('\n');
  let charCount = 0;
  let lineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1;
    if (charCount + lineLength > selectionStart) {
      lineIndex = i;
      break;
    }
    charCount += lineLength;
    if (i === lines.length - 1) {
      lineIndex = i;
    }
  }

  if (direction === 'up' && lineIndex === 0) {
    return { content, newSelectionStart: selectionStart };
  }
  if (direction === 'down' && lineIndex === lines.length - 1) {
    return { content, newSelectionStart: selectionStart };
  }

  const targetIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
  const currentLine = lines[lineIndex];
  const targetLine = lines[targetIndex];

  lines[lineIndex] = targetLine;
  lines[targetIndex] = currentLine;

  return {
    content: lines.join('\n'),
    newSelectionStart: selectionStart + (direction === 'up' ? -(targetLine.length + 1) : (targetLine.length + 1)),
  };
}

export function toggleStrikethrough(
  content: string,
  selectionStart: number,
  selectionEnd: number
): { content: string; newSelectionStart: number; newSelectionEnd: number } {
  if (selectionStart === selectionEnd) {
    return { content, newSelectionStart: selectionStart, newSelectionEnd: selectionEnd };
  }

  const selectedText = content.slice(selectionStart, selectionEnd);

  if (selectedText.startsWith('~~') && selectedText.endsWith('~~')) {
    const newText = selectedText.slice(2, -2);
    return {
      content: content.slice(0, selectionStart) + newText + content.slice(selectionEnd),
      newSelectionStart: selectionStart,
      newSelectionEnd: selectionStart + newText.length,
    };
  } else {
    const newText = `~~${selectedText}~~`;
    return {
      content: content.slice(0, selectionStart) + newText + content.slice(selectionEnd),
      newSelectionStart: selectionStart,
      newSelectionEnd: selectionStart + newText.length,
    };
  }
}

export function toggleBold(
  content: string,
  selectionStart: number,
  selectionEnd: number
): { content: string; newSelectionStart: number; newSelectionEnd: number } {
  if (selectionStart === selectionEnd) {
    // No selection - insert ** and place cursor in middle
    const newContent = content.slice(0, selectionStart) + '****' + content.slice(selectionEnd);
    return {
      content: newContent,
      newSelectionStart: selectionStart + 2,
      newSelectionEnd: selectionStart + 2,
    };
  }

  const selectedText = content.slice(selectionStart, selectionEnd);

  if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length > 4) {
    // Remove bold
    const newText = selectedText.slice(2, -2);
    return {
      content: content.slice(0, selectionStart) + newText + content.slice(selectionEnd),
      newSelectionStart: selectionStart,
      newSelectionEnd: selectionStart + newText.length,
    };
  } else {
    // Add bold
    const newText = `**${selectedText}**`;
    return {
      content: content.slice(0, selectionStart) + newText + content.slice(selectionEnd),
      newSelectionStart: selectionStart,
      newSelectionEnd: selectionStart + newText.length,
    };
  }
}

export function getLineInfo(content: string, cursorPos: number): {
  lineIndex: number;
  lineStart: number;
  lineEnd: number;
  lineContent: string;
} {
  const lines = content.split('\n');
  let charCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineStart = charCount;
    const lineEnd = charCount + lines[i].length;

    if (cursorPos <= lineEnd || i === lines.length - 1) {
      return {
        lineIndex: i,
        lineStart,
        lineEnd,
        lineContent: lines[i],
      };
    }
    charCount = lineEnd + 1;
  }

  return { lineIndex: 0, lineStart: 0, lineEnd: 0, lineContent: '' };
}

export function indentLine(
  content: string,
  selectionStart: number,
  selectionEnd: number
): { content: string; newSelectionStart: number; newSelectionEnd: number } {
  const lines = content.split('\n');
  const { lineIndex: startLineIndex } = getLineInfo(content, selectionStart);
  const { lineIndex: endLineIndex } = getLineInfo(content, selectionEnd);

  let offset = 0;
  for (let i = startLineIndex; i <= endLineIndex; i++) {
    lines[i] = '    ' + lines[i];
    offset += 4;
  }

  return {
    content: lines.join('\n'),
    newSelectionStart: selectionStart + 4,
    newSelectionEnd: selectionEnd + offset,
  };
}

export function deindentLine(
  content: string,
  selectionStart: number,
  selectionEnd: number
): { content: string; newSelectionStart: number; newSelectionEnd: number } {
  const lines = content.split('\n');
  const { lineIndex: startLineIndex } = getLineInfo(content, selectionStart);
  const { lineIndex: endLineIndex } = getLineInfo(content, selectionEnd);

  let startOffset = 0;
  let totalOffset = 0;
  for (let i = startLineIndex; i <= endLineIndex; i++) {
    if (lines[i].startsWith('\t')) {
      lines[i] = lines[i].slice(1);
      if (i === startLineIndex) startOffset = -1;
      totalOffset -= 1;
    } else if (lines[i].startsWith('    ')) {
      lines[i] = lines[i].slice(4);
      if (i === startLineIndex) startOffset = -4;
      totalOffset -= 4;
    } else if (lines[i].startsWith('  ')) {
      // Handle legacy 2-space indents
      lines[i] = lines[i].slice(2);
      if (i === startLineIndex) startOffset = -2;
      totalOffset -= 2;
    }
  }

  return {
    content: lines.join('\n'),
    newSelectionStart: Math.max(0, selectionStart + startOffset),
    newSelectionEnd: Math.max(0, selectionEnd + totalOffset),
  };
}

export function toggleStar(
  content: string,
  selectionStart: number
): { content: string; newSelectionStart: number } {
  const { lineIndex, lineContent } = getLineInfo(content, selectionStart);
  const lines = content.split('\n');

  // Match line prefix (indentation + bullet/number)
  const prefixMatch = lineContent.match(/^(\s*(?:•\s*|\d+\.\s*|-\s*)?)/);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  const restOfLine = lineContent.slice(prefix.length);

  let newLine: string;
  let offset = 0;

  if (restOfLine.startsWith('⭐ ')) {
    // Remove star
    newLine = prefix + restOfLine.slice(2);
    offset = -2;
  } else {
    // Add star
    newLine = prefix + '⭐ ' + restOfLine;
    offset = 2;
  }

  lines[lineIndex] = newLine;

  return {
    content: lines.join('\n'),
    newSelectionStart: selectionStart + offset,
  };
}

export function toggleTask(
  content: string,
  selectionStart: number
): { content: string; newSelectionStart: number } {
  const { lineIndex, lineContent } = getLineInfo(content, selectionStart);
  const lines = content.split('\n');

  // Match line prefix (indentation + bullet/number + star)
  const prefixMatch = lineContent.match(/^(\s*(?:•\s*|\d+\.\s*|-\s*)?(?:⭐\s*)?)/);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  const restOfLine = lineContent.slice(prefix.length);

  let newLine: string;
  let offset = 0;

  if (restOfLine.startsWith('[ ] ')) {
    // Open task -> Closed task
    newLine = prefix + '[x] ' + restOfLine.slice(4);
    offset = 0;
  } else if (restOfLine.startsWith('[x] ')) {
    // Closed task -> Remove task
    newLine = prefix + restOfLine.slice(4);
    offset = -4;
  } else {
    // No task -> Open task
    newLine = prefix + '[ ] ' + restOfLine;
    offset = 4;
  }

  lines[lineIndex] = newLine;

  return {
    content: lines.join('\n'),
    newSelectionStart: selectionStart + offset,
  };
}

export function processAutoFormat(
  content: string,
  selectionStart: number
): { content: string; newSelectionStart: number } | null {
  const { lineContent, lineStart } = getLineInfo(content, selectionStart);
  const cursorInLine = selectionStart - lineStart;

  // Check for "- " at start of line (convert to bullet)
  if (lineContent.startsWith('- ') && cursorInLine === 2) {
    const newLine = '• ' + lineContent.slice(2);
    const newContent = content.slice(0, lineStart) + newLine + content.slice(lineStart + lineContent.length);
    return { content: newContent, newSelectionStart: selectionStart };
  }

  return null;
}

export function handleEnterKey(
  content: string,
  selectionStart: number
): { content: string; newSelectionStart: number } | null {
  const { lineContent, lineStart } = getLineInfo(content, selectionStart);

  // Match bullet, number, or task prefix with indentation
  const match = lineContent.match(/^(\s*)(•\s*|(\d+)\.\s*|-\s*)(\[[ x]\]\s*)?(⭐\s*)?/);

  if (match) {
    const [fullMatch, indent, bulletOrNum, num, task, star] = match;
    const restOfLine = lineContent.slice(fullMatch.length);

    // If line is empty (just the prefix), remove the prefix
    if (restOfLine.trim() === '') {
      const newContent = content.slice(0, lineStart) + indent + content.slice(lineStart + lineContent.length);
      return {
        content: newContent,
        newSelectionStart: lineStart + indent.length,
      };
    }

    // Continue with same format on next line
    let newPrefix = indent;
    if (num) {
      // Increment number
      newPrefix += `${parseInt(num) + 1}. `;
    } else if (bulletOrNum) {
      newPrefix += bulletOrNum;
    }
    if (task) newPrefix += '[ ] ';
    if (star) newPrefix += '';  // Don't continue star

    const beforeCursor = content.slice(0, selectionStart);
    const afterCursor = content.slice(selectionStart);
    const newContent = beforeCursor + '\n' + newPrefix + afterCursor;

    return {
      content: newContent,
      newSelectionStart: selectionStart + 1 + newPrefix.length,
    };
  }

  return null;
}
