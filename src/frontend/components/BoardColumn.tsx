import React, { memo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Task } from '../types';

const TaskCard = memo(function TaskCard({ t, onEdit }: { t: Task; onEdit: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task-${t.id}` });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.92 : 1,
    marginBottom: 10,
    position: 'relative',
    zIndex: isDragging ? 9999 : 1,
    touchAction: 'none',
    boxShadow: isDragging ? '0 12px 28px rgba(0,0,0,.35)' : undefined,
  };

  return <div ref={setNodeRef} style={style} className="card" onClick={() => onEdit(t)} {...listeners} {...attributes}>
    <div className="row"><div className="card-title">{t.header || t.title}</div><span className={`pill ${t.assignee === 'agent' ? 'agent' : 'user'}`}>{t.assignee === 'agent' ? 'SGAi' : 'Stefan'}</span></div>
    {t.description ? <div className="meta">{t.description}</div> : null}
  </div>;
});

export function BoardColumn({ label, columnId, tasks, onEdit }: { label: string; columnId: string; tasks: Task[]; onEdit: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${columnId}` });

  return <section ref={setNodeRef} className={`col ${isOver ? 'drag-over' : ''}`}>
    <div className="col-head"><span>{label}</span><span className="count">{tasks.length}</span></div>
    <div className="cards">
      {tasks.map(t => <TaskCard key={t.id} t={t} onEdit={onEdit} />)}
      {tasks.length === 0 ? <div className="meta">Keine Tasks</div> : null}
    </div>
  </section>;
}
