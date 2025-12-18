import { useNotes } from '../context/NotesContext';
import type { Attachment } from '../types';

interface AttachmentBarProps {
  attachments: Attachment[];
  noteId: string;
}

export function AttachmentBar({ attachments, noteId }: AttachmentBarProps) {
  const { deleteAttachment } = useNotes();

  const handleDelete = async (attachmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this attachment?')) {
      await deleteAttachment(noteId, attachmentId);
    }
  };

  const handleClick = (attachment: Attachment) => {
    if (attachment.type.startsWith('image/')) {
      const win = window.open();
      if (win) {
        win.document.write(`
          <html>
            <head><title>${attachment.name}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a1a;">
              <img src="${attachment.data}" alt="${attachment.name}" style="max-width:100%;max-height:100vh;" />
            </body>
          </html>
        `);
      }
    } else {
      const link = document.createElement('a');
      link.href = attachment.data;
      link.download = attachment.name;
      link.click();
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('pdf')) return '📕';
    if (type.includes('word') || type.includes('document')) return '📘';
    if (type.includes('sheet') || type.includes('excel')) return '📗';
    return '📎';
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div className="attachment-bar">
      <div className="attachment-bar-header">
        <span>📎</span>
        <span>Attachments ({attachments.length})</span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Ctrl+V to paste
        </span>
      </div>
      {attachments.length === 0 ? (
        <div className="attachment-empty">
          No attachments. Paste an image or drag files here.
        </div>
      ) : (
        <div className="attachment-list">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={`attachment-item ${isImage(attachment.type) ? 'attachment-image' : ''}`}
              onClick={() => handleClick(attachment)}
              title={attachment.name}
            >
              {isImage(attachment.type) ? (
                <img
                  src={attachment.data}
                  alt={attachment.name}
                  className="attachment-thumbnail"
                />
              ) : (
                <>
                  <span className="attachment-icon">{getIcon(attachment.type)}</span>
                  <span className="attachment-name">{attachment.name}</span>
                </>
              )}
              <span
                className="attachment-delete"
                onClick={(e) => handleDelete(attachment.id, e)}
                title="Delete attachment"
              >
                ✕
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
