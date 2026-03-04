import React, { useEffect, useMemo, useState } from 'react';

type Task = any;
const API = new URL('../api/tasks', window.location.href).toString();
const UPLOAD_API = new URL('../api/upload-image', window.location.href).toString();
const BRIEFING_TODAY_URL = '../data/calendar-sync/today.json';
const BRIEFING_TOMORROW_URL = '../data/calendar-sync/tomorrow.json';

const COLUMNS = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'queue', label: 'Queue' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

const nowIso = () => new Date().toISOString();
const fmt = (iso: string) => new Date(iso).toLocaleString('de-DE');
const newId = () => crypto?.randomUUID?.() || `t-${Date.now()}`;
const parseImageLines = (raw = '') => raw.split('\n').map(s => s.trim()).filter(Boolean);
const escapeHtml = (s = '') => s.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[m]);

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [briefing, setBriefing] = useState<{today:any[]; tomorrow:any[]}>({today:[], tomorrow:[]});

  const loadTasks = async () => {
    const r = await fetch(API, { cache: 'no-store' });
    const d = await r.json();
    setTasks(Array.isArray(d.tasks) ? d.tasks : []);
  };

  const saveTasks = async (next: Task[]) => {
    setTasks(next);
    await fetch(API, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tasks: next }) });
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
    loadTasks(); loadBriefing();
    const i = setInterval(() => { loadTasks(); loadBriefing(); }, 5000);
    return () => clearInterval(i);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? tasks.filter(t => `${t.header||t.title||''} ${t.description||''}`.toLowerCase().includes(q)) : tasks;
  }, [tasks, search]);

  const addTask = async (payload: any) => {
    const now = nowIso();
    const next = [{
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

  const removeTask = async (id: string) => saveTasks(tasks.filter(t => t.id !== id));

  const uploadFiles = async (files: FileList | null) => {
    const urls:string[] = [];
    for (const file of Array.from(files || [])) {
      const form = new FormData(); form.append('file', file);
      const r = await fetch(UPLOAD_API, { method: 'POST', body: form });
      const d = await r.json(); if (d.url) urls.push(d.url);
    }
    return urls;
  };

  return <div className="wrap">
    <div className="header"><div><h1>📌 Task Board</h1><div className="sub">Open: {tasks.filter(t=>t.status!=='done').length} · Done: {tasks.filter(t=>t.status==='done').length}</div></div></div>
    <div className="toolbar">
      <input className="search" placeholder="Suche in Tasks..." value={search} onChange={e=>setSearch(e.target.value)} />
      <button className="btn-primary" onClick={()=>setShowAdd(true)}>+ Add Task</button>
    </div>

    <section className="col" style={{marginBottom:12,minHeight:'auto'}}>
      <div className="col-head"><span>📅 Briefing</span><span className="count">live</span></div>
      <div className="cards">
        <div><strong>Heute ({briefing.today.length})</strong>{briefing.today.map((e,i)=><div className="meta" key={i}>{new Date(e.start).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} · {e.title}</div>)}</div>
        <div><strong>Morgen ({briefing.tomorrow.length})</strong>{briefing.tomorrow.map((e,i)=><div className="meta" key={i}>{new Date(e.start).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} · {e.title}</div>)}</div>
      </div>
    </section>

    <div className="board">
      {COLUMNS.map(col => <section className="col" key={col.id}>
        <div className="col-head"><span>{col.label}</span><span className="count">{filtered.filter(t=>t.status===col.id).length}</span></div>
        <div className="cards">
          {filtered.filter(t=>t.status===col.id).map(t => <div key={t.id} className="card" onClick={()=>setEditing(t)}>
            <div className="row"><div className="card-title">{t.header || t.title}</div><span className={`pill ${t.assignee==='agent'?'agent':'user'}`}>{t.assignee==='agent'?'SGAi':'Stefan'}</span></div>
            {t.description ? <div className="meta">{t.description}</div> : null}
            <div className="actions">
              <button onClick={(e)=>{e.stopPropagation(); moveTask(t.id,'queue');}}>Queue</button>
              <button onClick={(e)=>{e.stopPropagation(); moveTask(t.id,'in_progress');}}>Start</button>
              <button onClick={(e)=>{e.stopPropagation(); moveTask(t.id,'done');}}>Done</button>
            </div>
          </div>)}
        </div>
      </section>)}
    </div>

    {showAdd && <TaskModal title="Neuen Task anlegen" onClose={()=>setShowAdd(false)} onSave={addTask} onUpload={uploadFiles} />}
    {editing && <TaskModal title="Task bearbeiten" task={editing} onClose={()=>setEditing(null)} onUpload={uploadFiles} onSave={async (p)=>{
      const next = tasks.map(t => t.id !== editing.id ? t : ({ ...t, header: p.header, title:p.header, description:p.description, imageUrls:p.imageUrls, dueAt:p.dueAt, assignee:p.assignee, comments: p.comments || t.comments || [], updatedAt: nowIso() }));
      await saveTasks(next); setEditing(null);
    }} onDelete={async ()=>{ await removeTask(editing.id); setEditing(null); }} />}
  </div>;
}

function TaskModal({ title, task, onClose, onSave, onDelete, onUpload }: any) {
  const [header, setHeader] = useState(task?.header || task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assignee, setAssignee] = useState(task?.assignee || 'agent');
  const [dueAt, setDueAt] = useState(task?.dueAt ? new Date(task.dueAt).toISOString().slice(0,16) : '');
  const [imageText, setImageText] = useState((task?.imageUrls || []).join('\n'));
  const [comments, setComments] = useState<any[]>(task?.comments || []);
  const [commentInput, setCommentInput] = useState('');

  return <div className="modal open" onClick={(e)=>e.target===e.currentTarget && onClose()}><div className="modal-card">
    <h3 style={{marginTop:0}}>{title}</h3>
    <div className="modal-grid">
      <input className="full" value={header} onChange={e=>setHeader(e.target.value)} placeholder="Header" />
      <textarea className="full" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" />
      <textarea className="full" value={imageText} onChange={e=>setImageText(e.target.value)} placeholder="Image URLs" />
      <input className="full" type="file" accept="image/*" multiple onChange={async e=>{
        const urls = await onUpload(e.currentTarget.files);
        setImageText(v => [...parseImageLines(v), ...urls].join('\n'));
      }} />
      <select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="agent">SGAi (Agent)</option><option value="user">Stefan (User)</option></select>
      <input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)} />
    </div>

    {task ? <>
      <div className="modal-grid" style={{marginTop:10}}>
        <input className="full" value={commentInput} onChange={e=>setCommentInput(e.target.value)} placeholder="Kommentar" />
        <button onClick={()=>{ if(!commentInput.trim()) return; setComments([...comments, { at: nowIso(), author:'agent', text: commentInput.trim() }]); setCommentInput(''); }}>Kommentar hinzufügen</button>
      </div>
      <div className="meta" style={{maxHeight:120, overflow:'auto', marginTop:8, border:'1px solid var(--line)', borderRadius:8, padding:8}}>
        {comments.slice().reverse().map((c,i)=><div key={i}><strong>{c.author||'agent'}</strong> · {fmt(c.at)}<br />{escapeHtml(c.text||'')}</div>)}
      </div>
    </> : null}

    <div style={{display:'flex', gap:8, justifyContent:'space-between', marginTop:12}}>
      {task ? <button className="btn-danger" onClick={onDelete}>Delete</button> : <span />}
      <div style={{display:'flex',gap:8}}>
        <button onClick={onClose}>Abbrechen</button>
        <button className="btn-primary" onClick={()=>onSave({ header, description, assignee, dueAt: dueAt ? new Date(dueAt).toISOString() : null, imageUrls: parseImageLines(imageText), comments })}>Speichern</button>
      </div>
    </div>
  </div></div>;
}
