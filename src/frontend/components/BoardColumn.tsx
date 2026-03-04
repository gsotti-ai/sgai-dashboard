import React, { memo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Task } from '../types';

const TaskCard = memo(function TaskCard({ t, onEdit, idx }: { t: Task; onEdit: (t: Task) => void; idx: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task-${t.id}` });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0 : 1,
    marginBottom: 10,
    position: 'relative',
    zIndex: isDragging ? 0 : 1,
    touchAction: 'none',
    boxShadow: isDragging ? 'none' : undefined,
  };

  return <div ref={setNodeRef} style={{...style, animationDelay: `${Math.min(idx,8) * 45}ms`}} className="card card-animate" onClick={() => onEdit(t)} {...listeners} {...attributes}>
    <div className="row"><div className="card-title">{t.header || t.title}</div><span className={`pill ${t.assignee === 'agent' ? 'agent' : 'user'}`}>{t.assignee === 'agent' ? 'SGAi' : 'Stefan'}</span></div>
    {t.description ? <div className="meta">{t.description}</div> : null}
  </div>;
});

export function BoardColumn({ label, columnId, tasks, onEdit }: { label: string; columnId: string; tasks: Task[]; onEdit: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${columnId}` });

  return <section id={`col-${columnId}`} ref={setNodeRef} data-col={columnId} className={`col ${isOver ? 'drag-over' : ''}`}>
    <div className="col-head"><span>{label}</span><span className="count">{tasks.length}</span></div>
    <div className="cards">
      {tasks.map((t, i) => <TaskCard key={t.id} t={t} idx={i} onEdit={onEdit} />)}
      {tasks.length === 0 ? <div className="meta">Keine Tasks</div> : null}
    </div>
  </section>;
}
