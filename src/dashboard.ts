// @ts-nocheck
const API = new URL('../api/tasks', window.location.href).toString();
const UPLOAD_API = new URL('../api/upload-image', window.location.href).toString();
let taskCache = [];
let lastSyncHash = '';
let dragId = null;
let editingTaskId = null;
const BRIEFING_TODAY_URL = '../data/calendar-sync/today.json';
const BRIEFING_TOMORROW_URL = '../data/calendar-sync/tomorrow.json';

const COLUMNS = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'queue', label: 'Queue' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

const nowIso = () => new Date().toISOString();
const fmt = (iso) => new Date(iso).toLocaleString('de-DE');
const newId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;

function humanDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '-';
  const min = Math.floor(ms / 60000), h = Math.floor(min/60), m = min%60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

function setNotice(text) { document.getElementById('agentNotice').textContent = text || ''; }
function hashTasks(tasks){ try{return JSON.stringify(tasks)}catch{return String(Date.now())} }
function load(){ return taskCache; }

async function loadFromServer({silent=false}={}) {
  try {
    const r = await fetch(API, { cache:'no-store' });
    if (!r.ok) throw new Error('http '+r.status);
    const data = await r.json();
    const incoming = Array.isArray(data.tasks) ? data.tasks : [];
    const h = hashTasks(incoming);
    if (!silent || h !== lastSyncHash) {
      taskCache = incoming; lastSyncHash = h; render();
    }
  } catch {
    if (!silent) render();
  }
}

function save(items) {
  taskCache = items;
  fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({tasks:items}) }).catch(()=>{});
}

function boardInfo(items){
  const open = items.filter(t=>t.status!=='done').length;
  const done = items.filter(t=>t.status==='done').length;
  document.getElementById('boardInfo').textContent = `Open: ${open} · Done: ${done} · Refresh: ${new Date().toLocaleTimeString('de-DE')}`;
}

async function loadBriefing(){
  const box = document.getElementById('briefingCards');
  const meta = document.getElementById('briefingMeta');
  try {
    const [rToday, rTomorrow] = await Promise.all([
      fetch(BRIEFING_TODAY_URL, { cache:'no-store' }),
      fetch(BRIEFING_TOMORROW_URL, { cache:'no-store' }),
    ]);
    if (!rToday.ok || !rTomorrow.ok) throw new Error('briefing fetch failed');
    const today = await rToday.json();
    const tomorrow = await rTomorrow.json();
    const tEvents = Array.isArray(today.events) ? today.events : [];
    const mEvents = Array.isArray(tomorrow.events) ? tomorrow.events : [];

    const fmtLine = (e) => {
      const s = new Date(e.start).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
      const en = new Date(e.end).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
      return `<div class="meta">${s}–${en} · ${escapeHtml(e.title || '(ohne Titel)')}</div>`;
    };

    box.innerHTML = `
      <div>
        <strong>Heute (${tEvents.length})</strong>
        ${tEvents.length ? tEvents.map(fmtLine).join('') : '<div class="meta">Keine Termine</div>'}
      </div>
      <div>
        <strong>Morgen (${mEvents.length})</strong>
        ${mEvents.length ? mEvents.map(fmtLine).join('') : '<div class="meta">Keine Termine</div>'}
      </div>
    `;
    meta.textContent = `aktualisiert ${new Date().toLocaleTimeString('de-DE')}`;
  } catch {
    box.innerHTML = '<div class="meta">Briefing konnte nicht geladen werden.</div>';
    meta.textContent = 'Fehler';
  }
}

function parseImageLines(raw) {
  return (raw || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function setUploadStatus(id, text){
  const el = document.getElementById(id);
  if (el) el.textContent = text || '';
}

async function uploadOneImage(file){
  const form = new FormData();
  form.append('file', file, file.name || 'upload.png');
  const r = await fetch(UPLOAD_API, { method:'POST', body: form });
  if (!r.ok) throw new Error(`upload failed (${r.status})`);
  const data = await r.json();
  if (!data?.url) throw new Error('no url returned');
  return data.url;
}

async function handleImageFiles(files, textareaId, statusId){
  const list = Array.from(files || []);
  if (!list.length) return;
  setUploadStatus(statusId, `Upload läuft (${list.length})...`);
  const ta = document.getElementById(textareaId);
  const existing = parseImageLines(ta.value);
  const uploaded = [];
  for (let i=0; i<list.length; i++) {
    const f = list[i];
    try {
      const url = await uploadOneImage(f);
      uploaded.push(url);
      setUploadStatus(statusId, `Upload ${i+1}/${list.length} fertig`);
    } catch (e) {
      setUploadStatus(statusId, `Fehler bei ${f.name}: ${e.message}`);
    }
  }
  const merged = [...existing, ...uploaded];
  ta.value = merged.join('\n');
  if (uploaded.length) setUploadStatus(statusId, `${uploaded.length} Bild(er) hochgeladen`);
}

function wireDropzone(zoneId, fileInputId, textareaId, statusId){
  const zone = document.getElementById(zoneId);
  const inp = document.getElementById(fileInputId);
  zone.addEventListener('click', () => inp.click());
  inp.addEventListener('change', () => handleImageFiles(inp.files, textareaId, statusId));
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    handleImageFiles(e.dataTransfer.files, textareaId, statusId);
  });
}

function addTask() {
  const header = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDescription').value.trim();
  const images = parseImageLines(document.getElementById('taskImages').value);
  const assignee = document.getElementById('taskAssignee').value;
  const due = document.getElementById('taskDue').value;
  if (!header) return;
  const items = load();
  const now = nowIso();
  items.unshift({
    id:newId(),
    header,
    title: header,
    description,
    imageUrls: images,
    comments: [],
    assignee,
    dueAt: due ? new Date(due).toISOString() : null,
    status:'scheduled',
    createdAt:now,
    updatedAt:now,
    doneAt:null,
    history:[{from:null,to:'scheduled',at:now}]
  });
  save(items);
  closeModal();
  render();
}

function moveTask(id, to) {
  const items = load();
  const t = items.find(x=>x.id===id);
  if (!t || t.status===to) return;
  const now = nowIso();
  t.history.push({from:t.status,to,at:now});
  t.status=to; t.updatedAt=now;
  if (to==='done' && !t.doneAt) t.doneAt=now;
  if (to!=='done') t.doneAt=null;
  if ((to==='queue'||to==='in_progress') && t.assignee!=='agent') { t.assignee='agent'; setNotice(`🤖 Verantwortlichkeit übernommen: "${t.header || t.title}"`); }
  save(items); render();
}

function deleteTask(id){ save(load().filter(x=>x.id!==id)); render(); }

function renderComments(t){
  const el = document.getElementById('commentList');
  const comments = Array.isArray(t.comments) ? t.comments : [];
  if (!comments.length) {
    el.innerHTML = '<div class="meta">Noch keine Kommentare.</div>';
    return;
  }
  el.innerHTML = comments.slice().reverse().map(c => `<div style="margin-bottom:6px;"><strong>${escapeHtml(c.author || 'agent')}</strong> · ${fmt(c.at)}<br/>${escapeHtml(c.text || '')}</div>`).join('');
}

function openEditModal(id){
  const t = load().find(x => x.id === id);
  if (!t) return;
  editingTaskId = id;
  document.getElementById('editTitle').value = t.header || t.title || '';
  document.getElementById('editDescription').value = t.description || '';
  document.getElementById('editImages').value = (t.imageUrls || []).join('\n');
  document.getElementById('editAssignee').value = t.assignee || 'user';
  document.getElementById('editDue').value = t.dueAt ? new Date(t.dueAt).toISOString().slice(0,16) : '';
  document.getElementById('editStatus').value = t.status || 'scheduled';
  document.getElementById('commentInput').value = '';
  renderComments(t);
  document.getElementById('editModal').classList.add('open');
}

function closeEditModal(){
  editingTaskId = null;
  document.getElementById('editModal').classList.remove('open');
  document.getElementById('editDescription').value = '';
  document.getElementById('editImages').value = '';
  document.getElementById('editImageFile').value = '';
  setUploadStatus('editUploadStatus','');
  document.getElementById('commentInput').value = '';
}

function moveFromEdit(){
  if (!editingTaskId) return;
  const to = document.getElementById('editStatus').value;
  moveTask(editingTaskId, to);
  const t = load().find(x => x.id === editingTaskId);
  if (t) document.getElementById('editStatus').value = t.status;
}

function saveEdit(){
  if (!editingTaskId) return;
  const items = load();
  const t = items.find(x => x.id === editingTaskId);
  if (!t) return;
  const title = document.getElementById('editTitle').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  const images = parseImageLines(document.getElementById('editImages').value);
  if (!title) return;
  const assignee = document.getElementById('editAssignee').value;
  const dueVal = document.getElementById('editDue').value;
  t.header = title;
  t.title = title;
  t.description = description;
  t.imageUrls = images;
  t.assignee = assignee;
  t.dueAt = dueVal ? new Date(dueVal).toISOString() : null;
  t.updatedAt = nowIso();
  t.history = t.history || [];
  t.history.push({ from: t.status, to: t.status, at: t.updatedAt, by: 'edit' });
  save(items);
  closeEditModal();
  render();
}

function addComment(){
  if (!editingTaskId) return;
  const text = document.getElementById('commentInput').value.trim();
  if (!text) return;
  const items = load();
  const t = items.find(x => x.id === editingTaskId);
  if (!t) return;
  t.comments = Array.isArray(t.comments) ? t.comments : [];
  const at = nowIso();
  t.comments.push({ at, author: 'agent', text });
  t.updatedAt = at;
  t.history = t.history || [];
  t.history.push({ from: t.status, to: t.status, at, by: 'comment' });
  save(items);
  document.getElementById('commentInput').value = '';
  renderComments(t);
  render();
}

function assigneePill(v){ return v==='agent' ? '<span class="pill agent">SGAi</span>' : '<span class="pill user">Stefan</span>'; }

function renderCard(t){
  const doneMeta = t.status==='done' ? `<div class="meta">Abgeschlossen: ${fmt(t.doneAt)}<br/>Dauer: ${humanDuration(new Date(t.doneAt)-new Date(t.createdAt))}</div>` : '';
  const due = t.dueAt ? `<div class="due">Due: ${fmt(t.dueAt)}</div>` : '';
  const description = t.description ? `<div class="meta">${escapeHtml(t.description)}</div>` : '';
  const imgs = (t.imageUrls || []).slice(0,3).map(u => `<a href="${escapeHtml(u)}" target="_blank" rel="noreferrer" class="meta" style="display:inline-block; margin-right:6px;">🖼️ Bild</a>`).join('');
  const imgBlock = imgs ? `<div>${imgs}</div>` : '';
  return `<div class="card" draggable="true" onclick="onCardClick(event,'${t.id}')" ondragstart="onDragStart(event,'${t.id}')" ondragend="onDragEnd(event)">
    <div class="row"><div class="card-title">${escapeHtml(t.header || t.title || '')}</div>${assigneePill(t.assignee)}</div>
    ${description}
    ${imgBlock}
    ${due}
    ${doneMeta}
    <div class="actions"><button onclick="openEditModal('${t.id}')">Edit</button></div>
  </div>`;
}

function render(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const items = load();
  const filtered = q ? items.filter(t => (`${t.header || t.title || ''} ${t.description || ''} ${(t.assignee||'')} ${(t.comments||[]).map(c=>c.text).join(' ')} ${(t.imageUrls||[]).join(' ')}`).toLowerCase().includes(q)) : items;
  const board = document.getElementById('board');
  board.innerHTML = COLUMNS.map(col=>{
    const cards = filtered.filter(t=>t.status===col.id).map(renderCard).join('') || '<div class="meta">Keine Tasks</div>';
    return `<section class="col" data-col="${col.id}" ondragover="allowDrop(event)" ondrop="onDropOnColumn(event,'${col.id}')" ondragleave="onDragLeave(event)">
      <div class="col-head"><span>${col.label}</span><span class="count">${filtered.filter(t=>t.status===col.id).length}</span></div>
      <div class="cards">${cards}</div>
    </section>`;
  }).join('');
  boardInfo(items);
}

function openModal(){ document.getElementById('addModal').classList.add('open'); document.getElementById('taskTitle').focus(); }
function closeModal(){ document.getElementById('addModal').classList.remove('open'); document.getElementById('taskTitle').value=''; document.getElementById('taskDescription').value=''; document.getElementById('taskImages').value=''; document.getElementById('taskImageFile').value=''; setUploadStatus('taskUploadStatus',''); document.getElementById('taskDue').value=''; }

function onCardClick(ev, id){
  if (ev.target.closest('button')) return;
  openEditModal(id);
}

function onDragStart(ev,id){ dragId=id; ev.dataTransfer.setData('text/plain', id); ev.currentTarget.classList.add('dragging'); }
function onDragEnd(ev){ ev.currentTarget.classList.remove('dragging'); document.querySelectorAll('.col').forEach(c=>c.classList.remove('drag-over')); }
function allowDrop(ev){ ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); }
function onDragLeave(ev){ ev.currentTarget.classList.remove('drag-over'); }
function onDropOnColumn(ev,colId){ ev.preventDefault(); ev.currentTarget.classList.remove('drag-over'); const id = ev.dataTransfer.getData('text/plain') || dragId; if(id) moveTask(id,colId); }

function escapeHtml(s){ return s.replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

(window as any).moveTask=moveTask;
(window as any).deleteTask=deleteTask;
(window as any).openEditModal=openEditModal;
(window as any).onCardClick=onCardClick;
(window as any).onDragStart=onDragStart;
(window as any).onDragEnd=onDragEnd;
(window as any).allowDrop=allowDrop;
(window as any).onDropOnColumn=onDropOnColumn;
(window as any).onDragLeave=onDragLeave;

document.getElementById('openAddDialog').addEventListener('click', openModal);
document.getElementById('cancelAdd').addEventListener('click', closeModal);
document.getElementById('addTaskBtn').addEventListener('click', addTask);
document.getElementById('taskTitle').addEventListener('keydown', e => { if (e.key==='Enter') addTask(); });

document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
document.getElementById('moveStatusBtn').addEventListener('click', moveFromEdit);
document.getElementById('addCommentBtn').addEventListener('click', addComment);
document.getElementById('deleteInEdit').addEventListener('click', () => {
  if (!editingTaskId) return;
  const id = editingTaskId;
  closeEditModal();
  deleteTask(id);
});
document.getElementById('editTitle').addEventListener('keydown', e => { if (e.key==='Enter') saveEdit(); });

document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('addModal').addEventListener('click', e => { if (e.target.id==='addModal') closeModal(); });
document.getElementById('editModal').addEventListener('click', e => { if (e.target.id==='editModal') closeEditModal(); });

wireDropzone('taskDropzone','taskImageFile','taskImages','taskUploadStatus');
wireDropzone('editDropzone','editImageFile','editImages','editUploadStatus');

loadFromServer();
loadBriefing();
setInterval(() => {
  loadFromServer({silent:true});
  loadBriefing();
}, 5000);
window.addEventListener('focus', () => {
  loadFromServer({silent:true});
  loadBriefing();
});
