import { useState, useEffect, useRef } from 'react';

interface InputDialogProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function InputDialog({
  isOpen,
  title,
  placeholder,
  defaultValue = '',
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen, defaultValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      if (value.trim()) {
        onConfirm(value.trim());
      }
    }
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="input-dialog-overlay" onClick={onCancel}>
      <div className="input-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="input-dialog-title">{title}</div>
        <input
          ref={inputRef}
          type="text"
          className="input-dialog-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <div className="input-dialog-buttons">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn" onClick={handleSubmit} disabled={!value.trim()}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
