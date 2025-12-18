import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmButtonRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      onConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="input-dialog-overlay" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-title">{title}</div>
        <div className="confirm-dialog-message">{message}</div>
        <div className="confirm-dialog-buttons">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            className={`btn ${isDanger ? 'btn-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
