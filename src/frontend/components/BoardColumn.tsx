import React, { memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Task } from '../types';

const CARD_HEIGHT = 160;

const TaskCard = memo(function TaskCard({ t, onEdit, onMove }: { t: Task; onEdit: (t: Task) => void; onMove: (id: string, to: string) => void }) {
  return <div className="card" style={{ margin: '0 10px' }} onClick={() => onEdit(t)}>
    <div className="row"><div className="card-title">{t.header || t.title}</div><span className={`pill ${t.assignee === 'agent' ? 'agent' : 'user'}`}>{t.assignee === 'agent' ? 'SGAi' : 'Stefan'}</span></div>
    {t.description ? <div className="meta">{t.description}</div> : null}
    <div className="actions">
      <button onClick={(e) => { e.stopPropagation(); onMove(t.id, 'queue'); }}>Queue</button>
      <button onClick={(e) => { e.stopPropagation(); onMove(t.id, 'in_progress'); }}>Start</button>
      <button onClick={(e) => { e.stopPropagation(); onMove(t.id, 'done'); }}>Done</button>
    </div>
  </div>;
});

export function BoardColumn({ label, tasks, onEdit, onMove }: { label: string; tasks: Task[]; onEdit: (t: Task) => void; onMove: (id: string, to: string) => void }) {
  const height = Math.min(560, Math.max(220, tasks.length * CARD_HEIGHT));
  return <section className="col">
    <div className="col-head"><span>{label}</span><span className="count">{tasks.length}</span></div>
    <div className="cards" style={{ padding: 0 }}>
      <List height={height} itemCount={tasks.length} itemSize={CARD_HEIGHT} width={'100%'}>
        {({ index, style }) => <div style={style}><TaskCard t={tasks[index]} onEdit={onEdit} onMove={onMove} /></div>}
      </List>
      {tasks.length === 0 ? <div className="meta" style={{ padding: 10 }}>Keine Tasks</div> : null}
    </div>
  </section>;
}
