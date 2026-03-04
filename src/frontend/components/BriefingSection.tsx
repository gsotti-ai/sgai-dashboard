import React from 'react';

export function BriefingSection({ briefing }: { briefing: { today: any[]; tomorrow: any[] } }) {
  return (
    <section className="col" style={{ marginBottom: 12, minHeight: 'auto' }}>
      <div className="col-head"><span>📅 Briefing</span><span className="status-dot" title="live" /></div>
      <div className="cards">
        <div>
          <strong>Heute ({briefing.today.length})</strong>
          {briefing.today.map((e, i) => (
            <div className="meta" key={i}>{new Date(e.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · {e.title}</div>
          ))}
        </div>
        <div>
          <strong>Morgen ({briefing.tomorrow.length})</strong>
          {briefing.tomorrow.map((e, i) => (
            <div className="meta" key={i}>{new Date(e.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · {e.title}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
