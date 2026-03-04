export const nowIso = () => new Date().toISOString();
export const fmt = (iso: string) => new Date(iso).toLocaleString('de-DE');
export const newId = () => crypto?.randomUUID?.() || `t-${Date.now()}`;
export const parseImageLines = (raw = '') => raw.split('\n').map(s => s.trim()).filter(Boolean);
