interface StatusBarProps {
  line: number;
  column: number;
  modified: boolean;
}

export function StatusBar({ line, column, modified }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span>Ln {line}, Col {column}</span>
        {modified && <span style={{ color: 'var(--accent-yellow)' }}>Modified</span>}
      </div>
      <div className="status-bar-right">
        Ctrl+Shift+P for commands
      </div>
    </div>
  );
}
