import React, { useState } from 'react';
import { Task } from '../types';
import { fmt, nowIso, parseImageLines } from '../utils';
import { ImageSelector } from './ImageSelector';

export function TaskModal({ title, task, onClose, onSave, onDelete, onUpload }: {
  title: string;
  task?: Task | null;
  onClose: () => void;
  onSave: (p: any) => void;
  onDelete?: () => void;
  onUpload: (files: FileList | null) => Promise<string[]>;
}) {
  const [header, setHeader] = useState(task?.header || task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assignee, setAssignee] = useState(task?.assignee || 'agent');
  const [dueAt, setDueAt] = useState(task?.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '');
  const [imageText, setImageText] = useState((task?.imageUrls || []).join('\n'));
  const [comments, setComments] = useState<any[]>(task?.comments || []);
  const [commentInput, setCommentInput] = useState('');

  return <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="modal-card">
    <h3 style={{ marginTop: 0 }}>{title}</h3>
    <div className="modal-grid">
      <input className="full" value={header} onChange={e => setHeader(e.target.value)} placeholder="Header" />
      <textarea className="full" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
      <ImageSelector value={imageText} onChange={setImageText} onUpload={onUpload} />
      <select value={assignee} onChange={e => setAssignee(e.target.value)}><option value="agent">SGAi (Agent)</option><option value="user">Stefan (User)</option></select>
      <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
    </div>

    {task ? <>
      <div className="modal-grid" style={{ marginTop: 10 }}>
        <input className="full" value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="Kommentar" />
        <button onClick={() => { if (!commentInput.trim()) return; setComments([...comments, { at: nowIso(), author: 'agent', text: commentInput.trim() }]); setCommentInput(''); }}>Kommentar hinzufügen</button>
      </div>
      <div className="meta" style={{ maxHeight: 180, overflow: 'auto', marginTop: 8, border: '1px solid var(--line)', borderRadius: 8, padding: 8 }}>
        {comments.slice().reverse().map((c, i) => <div key={i}><strong>{c.author || 'agent'}</strong> · {fmt(c.at)}<br />{c.text || ''}</div>)}
      </div>
    </> : null}

    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 12 }}>
      {task ? <button className="btn-danger" onClick={onDelete}>Delete</button> : <span />}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose}>Abbrechen</button>
        <button className="btn-primary" onClick={() => onSave({ header, description, assignee, dueAt: dueAt ? new Date(dueAt).toISOString() : null, imageUrls: parseImageLines(imageText), comments })}>Speichern</button>
      </div>
    </div>
  </div></div>;
}
