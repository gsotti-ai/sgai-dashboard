import React, { useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { BoardColumn } from './components/BoardColumn';
import { BriefingSection } from './components/BriefingSection';
import { TaskModal } from './components/TaskModal';
import { COLUMNS, Task } from './types';
import { newId, nowIso } from './utils';

const API = new URL('../api/tasks', window.location.href).toString();
const UPLOAD_API = new URL('../api/upload-image', window.location.href).toString();
const BRIEFING_TODAY_URL = '../data/calendar-sync/today.json';
const BRIEFING_TOMORROW_URL = '../data/calendar-sync/tomorrow.json';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [briefing, setBriefing] = useState<{ today: any[]; tomorrow: any[] }>({ today: [], tomorrow: [] });
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const loadTasks = async () => {
    const r = await fetch(API, { cache: 'no-store' });
    const d = await r.json();
    setTasks(Array.isArray(d.tasks) ? d.tasks : []);
  };

  const saveTasks = async (next: Task[]) => {
    setTasks(next);
    await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks: next }) });
  };

  const loadBriefing = async () => {
    try {
      const [t, m] = await Promise.all([fetch(BRIEFING_TODAY_URL), fetch(BRIEFING_TOMORROW_URL)]);
      const tj = await t.json();
      const mj = await m.json();
      setBriefing({ today: tj.events || [], tomorrow: mj.events || [] });
    } catch {}
  };

  useEffect(() => {
    loadTasks();
    loadBriefing();
    const i = setInterval(() => { loadTasks(); loadBriefing(); }, 5000);
    return () => clearInterval(i);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? tasks.filter(t => `${t.header || t.title || ''} ${t.description || ''}`.toLowerCase().includes(q)) : tasks;
  }, [tasks, search]);

  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = {};
    for (const c of COLUMNS) g[c.id] = [];
    for (const t of filtered) (g[t.status] ||= []).push(t);
    return g;
  }, [filtered]);

  const addTask = async (payload: any) => {
    const now = nowIso();
    const next: Task[] = [{
      id: newId(), header: payload.header, title: payload.header, description: payload.description || '',
      imageUrls: payload.imageUrls || [], comments: [], assignee: payload.assignee || 'agent',
      dueAt: payload.dueAt || null, status: 'scheduled', createdAt: now, updatedAt: now, doneAt: null,
      history: [{ from: null, to: 'scheduled', at: now }]
    }, ...tasks];
    await saveTasks(next);
    setShowAdd(false);
  };

  const moveTask = async (id: string, to: string) => {
    const next = tasks.map(t => t.id !== id ? t : ({ ...t, status: to, updatedAt: nowIso() }));
    await saveTasks(next);
  };

  const onDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active?.id || '');
    if (!activeId.startsWith('task-')) return;
    const taskId = activeId.replace('task-', '');
    setActiveTask(tasks.find(t => t.id === taskId) || null);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const activeId = String(event.active?.id || '');
    const overId = String(event.over?.id || '');
    setActiveTask(null);
    if (!activeId.startsWith('task-') || !overId.startsWith('col-')) return;
    const taskId = activeId.replace('task-', '');
    const targetCol = overId.replace('col-', '');
    await moveTask(taskId, targetCol);
  };

  const removeTask = async (id: string) => saveTasks(tasks.filter(t => t.id !== id));

  const uploadFiles = async (files: FileList | null) => {
    const urls: string[] = [];
    for (const file of Array.from(files || [])) {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch(UPLOAD_API, { method: 'POST', body: form });
      const d = await r.json();
      if (d.url) urls.push(d.url);
    }
    return urls;
  };

  return <div className="wrap">
    <div className="header"><div><h1>📌 Task Board</h1><div className="sub">Open: {tasks.filter(t => t.status !== 'done').length} · Done: {tasks.filter(t => t.status === 'done').length}</div></div></div>
    <div className="toolbar">
      <input className="search" placeholder="Suche in Tasks..." value={search} onChange={e => setSearch(e.target.value)} />
      <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Task</button>
    </div>

    <BriefingSection briefing={briefing} />

    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveTask(null)}>
      <div className="board">
        {COLUMNS.map(col => <BoardColumn key={col.id} columnId={col.id} label={col.label} tasks={grouped[col.id] || []} onEdit={setEditing} />)}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="card" style={{ width: 320, boxShadow: '0 14px 32px rgba(0,0,0,.45)', opacity: 0.95 }}>
            <div className="row"><div className="card-title">{activeTask.header || activeTask.title}</div><span className={`pill ${activeTask.assignee === 'agent' ? 'agent' : 'user'}`}>{activeTask.assignee === 'agent' ? 'SGAi' : 'Stefan'}</span></div>
            {activeTask.description ? <div className="meta">{activeTask.description}</div> : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>

    {showAdd && <TaskModal title="Neuen Task anlegen" onClose={() => setShowAdd(false)} onSave={addTask} onUpload={uploadFiles} />}
    {editing && <TaskModal title="Task bearbeiten" task={editing} onClose={() => setEditing(null)} onUpload={uploadFiles} onSave={async (p) => {
      const next = tasks.map(t => t.id !== editing.id ? t : ({ ...t, header: p.header, title: p.header, description: p.description, imageUrls: p.imageUrls, dueAt: p.dueAt, assignee: p.assignee, comments: p.comments || t.comments || [], updatedAt: nowIso() }));
      await saveTasks(next); setEditing(null);
    }} onDelete={async () => { await removeTask(editing.id); setEditing(null); }} />}
  </div>;
}
