export interface Command {
  id: string;
  name: string;
  shortcut: string;
  action: () => void;
}

export function formatShortcut(shortcut: string): string {
  return shortcut
    .replace('ctrl', 'Ctrl')
    .replace('shift', 'Shift')
    .replace('alt', 'Alt')
    .replace(/\+/g, ' + ');
}

export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const needsCtrl = parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');

  const pressedKey = e.key.toLowerCase();

  // Map special key names
  const keyMap: Record<string, string> = {
    'up': 'arrowup',
    'down': 'arrowdown',
    'left': 'arrowleft',
    'right': 'arrowright',
  };

  const expectedKey = keyMap[key] || key;
  const keyMatches = pressedKey === expectedKey;

  return (
    keyMatches &&
    e.ctrlKey === needsCtrl &&
    e.shiftKey === needsShift &&
    e.altKey === needsAlt
  );
}
