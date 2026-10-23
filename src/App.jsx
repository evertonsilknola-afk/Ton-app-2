import React, { useState, useEffect, useMemo } from 'react';
import { Home, CalendarDays, BarChart3, BookMarked, History, Menu, Bell, Moon, Sun, User, X, Check, Edit3, Trash2, Plus, PlayCircle, Clock, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, Timer, Pause, Square, Filter, Globe, RotateCcw, CheckCircle2 } from 'lucide-react';
import { EDITAL } from './data.js';
import { todayStr, addD, dow, fmt, fmtMin, hms, parseT, pc, MES, DIA, COLORS, catColor, accColor, genCycle } from './util.js';

const KEY = 'acs_v4';
const DEF = { sessions: [], checked: {}, reviews: [], reminders: [], goals: { hours: 20, q: 230 }, plan: null, cyc: { start: todayStr(), count: 0 }, planName: 'Meu Plano' };
const SUBJ = Object.fromEntries(EDITAL.map((s, i) => [s.id, { ...s, name: s.title.replace(/^\d+\.\s*/, ''), color: COLORS[i % COLORS.length] }]));
const blank = (o = {}) => ({ id: null, mode: 'hoje', date: todayStr(), category: 'Teoria', subjectId: '', topic: '', time: '00:00:00', material: '', finished: false, rev: false, c: '', e: '', pages: [{ s: '', e: '' }], videos: [{ t: '', s: '00:00:00', e: '00:00:00' }], comment: '', again: false, ...o });
const dateLabel = d => (d === todayStr() ? 'HOJE' : d === addD(todayStr(), -1) ? 'ONTEM' : `${d.slice(8)} ${MES[+d.slice(5, 7) - 1]}/${d.slice(2, 4)} ${DIA[dow(d)]}`);

const Card = ({ title, right, children, className = '' }) => (
  <div className={'glass p-4 ' + className}>
    {title && <div className="flex justify-between items-center mb-2"><span className="lbl">{title}</span>{right}</div>}
    {children}
  </div>
);
const Stat = ({ title, sub, value }) => (
  <div className="glass p-4 flex flex-col justify-between min-h-[110px]">
    <div><div className="lbl">{title}</div><div className="text-[11px] font-semibold t1 mt-1 leading-4">{sub}</div></div>
    <div className="text-3xl font-extrabold t1 self-end">{value}</div>
  </div>
);
const Ring = ({ segs, size = 160, sw = 22, center, gap = 0 }) => {
  const r = (size - sw) / 2, C = 2 * Math.PI * r, tot = segs.reduce((a, b) => a + b.v, 0) || 1; let acc = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,80,85,.18)" strokeWidth={sw} />
        {segs.map((s, i) => { const len = (s.v / tot) * C; const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth={sw} strokeDasharray={`${Math.max(len - gap, 0)} ${C - Math.max(len - gap, 0)}`} strokeDashoffset={-acc} />; acc += len; return el; })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center font-extrabold t1">{center}</div>
    </div>
  );
};
const Pie = ({ data, size = 170 }) => {
  const tot = data.reduce((a, b) => a + b.v, 0);
  if (!tot) return <div className="t2 text-xs py-10">Nenhum estudo neste dia</div>;
  const r = size / 2; let a = -Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        if (data.length === 1) return <circle key={i} cx={r} cy={r} r={r} fill={d.c} />;
        const ang = (d.v / tot) * 2 * Math.PI, x1 = r + r * Math.cos(a), y1 = r + r * Math.sin(a); a += ang;
        const x2 = r + r * Math.cos(a), y2 = r + r * Math.sin(a);
        return <path key={i} d={`M${r} ${r}L${x1} ${y1}A${r} ${r} 0 ${ang > Math.PI ? 1 : 0} 1 ${x2} ${y2}Z`} fill={d.c} />;
      })}
    </svg>
  );
};
const Badge = ({ v }) => <span className="badge" style={{ background: v == null ? 'rgba(120,80,85,.3)' : accColor(v) }}>{v == null ? '-' : v}</span>;

export default function App() {
  const [tab, setTab] = useState('home');
  const [side, setSide] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('acs_dark') === '1');
  const [db, setDb] = useState(() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEF; } });
  const [f, setF] = useState(null);
  const [pm, setPm] = useState(null);
  const [flt, setFlt] = useState({ subject: '', category: '', open: false });
  const [weekOff, setWeekOff] = useState(0);
  const [wMetric, setWMetric] = useState('tempo');
  const [dayOff, setDayOff] = useState(0);
  const [remText, setRemText] = useState('');
  const [tmOpen, setTmOpen] = useState(false);
  const [tm, setTm] = useState({ acc: 0, at: null, subject: '' });
  const [, tick] = useState(0);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(db)); }, [db]);
  useEffect(() => { localStorage.setItem('acs_dark', dark ? '1' : '0'); document.documentElement.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => { if (!tm.at) return; const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, [tm.at]);
  const elapsed = tm.acc + (tm.at ? (Date.now() - tm.at) / 1000 : 0);
  const today = todayStr();
  const upd = fn => setDb(d => ({ ...d, ...fn(d) }));

  const stats = useMemo(() => {
    const d = {}, t = {}; EDITAL.forEach(s => (d[s.id] = { id: s.id, name: SUBJ[s.id].name, time: 0, c: 0, e: 0 }));
    let time = 0, c = 0, e = 0, pages = 0, pagesSec = 0, vid = 0;
    db.sessions.forEach(x => {
      time += x.sec; c += x.c; e += x.e;
      if (d[x.subjectId]) { d[x.subjectId].time += x.sec; d[x.subjectId].c += x.c; d[x.subjectId].e += x.e; }
      const k = x.subjectId + '_' + x.topic; t[k] = t[k] || { c: 0, e: 0 }; t[k].c += x.c; t[k].e += x.e;
      const pg = (x.pages || []).reduce((a, p) => a + Math.max(0, p.e - p.s), 0); if (pg) { pages += pg; pagesSec += x.sec; }
      vid += (x.videos || []).reduce((a, v) => a + Math.max(0, parseT(v.e) - parseT(v.s)), 0);
    });
    const total = EDITAL.reduce((a, s) => a + s.topics.length, 0), done = Object.values(db.checked).filter(Boolean).length;
    return { d, t, time, c, e, q: c + e, pages, pph: pagesSec ? (pages / (pagesSec / 3600)).toFixed(1) : '0', vid, total, done };
  }, [db]);

  const studied = useMemo(() => new Set(db.sessions.filter(s => s.sec > 0 || s.c + s.e > 0).map(s => s.date)), [db.sessions]);
  const first = db.sessions.length ? db.sessions.map(s => s.date).sort()[0] : today;
  const streak = (() => { let n = 0, cur = today; if (!studied.has(cur)) cur = addD(cur, -1); while (studied.has(cur)) { n++; cur = addD(cur, -1); } return n; })();
  const totalDays = Math.round((new Date(today) - new Date(first)) / 864e5) + 1;
  const dayAgg = date => { const o = { sec: 0, q: 0, subj: {} }; db.sessions.filter(s => s.date === date).forEach(s => { o.sec += s.sec; o.q += s.c + s.e; o.subj[s.subjectId] = (o.subj[s.subjectId] || 0) + s.sec; }); return o; };
  const weekStart = addD(today, -dow(today) + weekOff * 7);
  const week = Array.from({ length: 7 }, (_, i) => { const d = addD(weekStart, i); const a = dayAgg(d); return { d, sec: a.sec, q: a.q }; });
  const curWeek = Array.from({ length: 7 }, (_, i) => dayAgg(addD(addD(today, -dow(today)), i)));
  const wSec = curWeek.reduce((a, b) => a + b.sec, 0), wQ = curWeek.reduce((a, b) => a + b.q, 0);
  const dueRev = db.reviews.filter(r => !r.done && r.due <= today && db.sessions.some(s => s.id === r.sid));
  const cycle = useMemo(() => {
    if (!db.plan) return null; const pool = {};
    db.sessions.filter(s => s.date >= db.cyc.start).forEach(s => (pool[s.subjectId] = (pool[s.subjectId] || 0) + s.sec / 60));
    const blocks = db.plan.cycle.map(b => { const got = Math.min(pool[b.id] || 0, b.min); pool[b.id] = (pool[b.id] || 0) - got; return { ...b, got }; });
    return { blocks, total: blocks.reduce((a, b) => a + b.min, 0), done: blocks.reduce((a, b) => a + b.got, 0) };
  }, [db]);

  // ---------- ações ----------
  const openRec = (o = {}) => setF(blank(o));
  const editSession = s => setF(blank({ id: s.id, mode: 'outro', date: s.date, category: s.category, subjectId: s.subjectId, topic: s.topic, time: hms(s.sec), material: s.material || '', c: s.c || '', e: s.e || '', comment: s.comment || '', pages: s.pages?.length ? s.pages.map(p => ({ s: p.s, e: p.e })) : [{ s: '', e: '' }], videos: s.videos?.length ? s.videos : [{ t: '', s: '00:00:00', e: '00:00:00' }] }));
  const save = () => {
    if (!f.subjectId) return alert('Selecione a disciplina.');
    const date = f.mode === 'hoje' ? today : f.mode === 'ontem' ? addD(today, -1) : f.date;
    const s = { id: f.id || Date.now(), date, category: f.category, subjectId: f.subjectId, topic: f.topic, sec: parseT(f.time), material: f.material, c: +f.c || 0, e: +f.e || 0, comment: f.comment, pages: f.pages.filter(p => p.s !== '' || p.e !== '').map(p => ({ s: +p.s || 0, e: +p.e || 0 })), videos: f.videos.filter(v => v.t || parseT(v.e) > parseT(v.s)) };
    setDb(d => {
      const sessions = f.id ? d.sessions.map(x => (x.id === f.id ? s : x)) : [s, ...d.sessions];
      const checked = { ...d.checked }; if (f.finished && f.topic) checked[f.subjectId + '_' + f.topic] = true;
      let reviews = d.reviews; if (f.rev && !f.id) reviews = [...reviews, ...[1, 7, 30].map(n => ({ id: s.id + n, sid: s.id, due: addD(date, n), n, done: false }))];
      return { ...d, sessions, checked, reviews };
    });
    setF(f.again ? blank({ subjectId: f.subjectId, category: f.category }) : null);
  };
  const delSession = id => { if (confirm('Excluir este registro de estudo?')) upd(d => ({ sessions: d.sessions.filter(s => s.id !== id), reviews: d.reviews.filter(r => r.sid !== id) })); };
  const startTimer = subject => { setTm(t => ({ ...t, subject: subject || t.subject, at: t.at || Date.now() })); setTmOpen(true); };
  const pauseTimer = () => setTm(t => ({ ...t, acc: t.acc + (t.at ? (Date.now() - t.at) / 1000 : 0), at: null }));
  const finishTimer = () => { const sec = elapsed; setTm({ acc: 0, at: null, subject: '' }); setTmOpen(false); openRec({ subjectId: tm.subject, time: hms(sec) }); };
  const editGoals = () => { const h = prompt('Meta semanal de horas de estudo:', db.goals.hours); if (h === null) return; const q = prompt('Meta semanal de questões:', db.goals.q); if (q === null) return; upd(() => ({ goals: { hours: +h || db.goals.hours, q: +q || db.goals.q } })); };
  const openPlan = () => {
    const p = db.plan; const w = {}; EDITAL.forEach(s => (w[s.id] = p?.w?.[s.id] || { imp: 2, kn: 2.5 }));
    setPm({ step: 1, w, hours: p?.hours || 25, days: p?.days || [1, 2, 3, 4, 5, 6], min: p?.min || 60, max: p?.max || 105 });
  };
  const concluirPlan = () => {
    const raw = EDITAL.map(s => pm.w[s.id].imp * (6 - pm.w[s.id].kn)), sum = raw.reduce((a, b) => a + b, 0);
    const plan = { w: pm.w, hours: pm.hours, days: pm.days, min: pm.min, max: Math.max(pm.max, pm.min), pct: Object.fromEntries(EDITAL.map((s, i) => [s.id, Math.round((raw[i] / sum) * 100)])) };
    plan.cycle = genCycle(plan); upd(() => ({ plan, cyc: { start: today, count: db.cyc.count } })); setPm(null); setTab('planejamento');
  };
  const restartCycle = () => upd(d => ({ cyc: { start: today, count: d.cyc.count + (cycle && cycle.done >= cycle.total - 0.01 ? 1 : 0) } }));

  // ---------- gráficos ----------
  const StreakChips = () => (
    <div className="flex gap-1 overflow-x-auto hs pb-1">
      {Array.from({ length: 30 }, (_, i) => { const d = addD(today, i - 29), ok = studied.has(d), fail = !ok && d >= first && d < today;
        return <div key={d} title={d} className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center" style={{ background: ok ? 'var(--p)' : fail ? 'rgba(255,255,255,.55)' : 'rgba(120,80,85,.15)', color: ok ? '#fff' : 'var(--bad)' }}>{ok ? <Check size={14} /> : fail ? <X size={14} /> : null}</div>; })}
    </div>
  );
  const WeekBars = () => {
    const vals = week.map(w => (wMetric === 'tempo' ? w.sec / 3600 : w.q)), max = Math.max(1, ...vals);
    return (
      <Card title="Estudo semanal" right={<div className="flex items-center gap-1 text-[11px] font-bold t2"><button onClick={() => setWeekOff(weekOff - 1)}><ChevronLeft size={16} /></button>{week[0].d.slice(8)}/{week[0].d.slice(5, 7)} – {week[6].d.slice(8)}/{week[6].d.slice(5, 7)}<button onClick={() => setWeekOff(weekOff + 1)}><ChevronRight size={16} /></button></div>}>
        <div className="flex items-end gap-2 h-32">{vals.map((v, i) => <div key={i} className="flex-1 flex flex-col items-center justify-end h-full"><div className="text-[9px] font-bold t2">{v ? (wMetric === 'tempo' ? v.toFixed(1) + 'h' : v) : ''}</div><div className="w-full rounded-t-md" style={{ height: (v / max) * 85 + '%', minHeight: v ? 4 : 2, background: 'var(--p)', opacity: v ? 1 : .25 }} /><div className="text-[9px] t2 mt-1">{DIA[i]}</div></div>)}</div>
        <div className="flex gap-2 mt-3 justify-end">{[['tempo', 'Tempo'], ['q', 'Questões']].map(([k, l]) => <button key={k} onClick={() => setWMetric(k)} className={wMetric === k ? 'btn !py-1 !px-3 !text-[10px]' : 'btn-g !py-1 !px-3 !text-[10px]'}>{l}</button>)}</div>
      </Card>
    );
  };
  const Evo = () => {
    const ss = db.sessions; const pts = []; if (ss.length) for (let d = first; d <= today; d = addD(d, 1)) { let q = 0, e = 0; ss.filter(s => s.date === d).forEach(s => { q += s.c + s.e; e += s.e; }); pts.push({ d, q, e }); }
    const P = pts.slice(-45), max = Math.max(10, ...P.map(p => p.q)), n = P.length;
    const X = i => 40 + i * (920 / Math.max(n - 1, 1)), Y = v => 210 - (v / max) * 180;
    const line = k => P.map((p, i) => `${X(i)},${Y(p[k])}`).join(' ');
    return (
      <Card title="Evolução no tempo">
        {!n ? <div className="t2 text-sm py-10 text-center">Registre estudos para ver sua evolução.</div> :
          <svg viewBox="0 0 1000 250" className="w-full">
            {[0, .25, .5, .75, 1].map(g => <g key={g}><line x1="40" x2="960" y1={Y(max * g)} y2={Y(max * g)} stroke="rgba(120,80,85,.2)" /><text x="32" y={Y(max * g) + 4} fontSize="11" textAnchor="end" fill="#7d5a5f">{Math.round(max * g)}</text></g>)}
            <polyline points={line('q')} fill="none" stroke="#4fae82" strokeWidth="3" strokeLinejoin="round" />
            <polyline points={line('e')} fill="none" stroke="#b8323b" strokeWidth="3" strokeLinejoin="round" />
            {P.map((p, i) => (n < 16 || i % Math.ceil(n / 12) === 0) && <text key={i} x={X(i)} y="237" fontSize="11" textAnchor="middle" fill="#7d5a5f">{p.d.slice(8)}/{p.d.slice(5, 7)}</text>)}
            {P.map((p, i) => <g key={i}><circle cx={X(i)} cy={Y(p.q)} r="3.5" fill="#4fae82" /><circle cx={X(i)} cy={Y(p.e)} r="3.5" fill="#b8323b" /></g>)}
          </svg>}
        <div className="flex gap-4 text-[11px] font-bold justify-center"><span style={{ color: '#4fae82' }}>● Questões</span><span style={{ color: '#b8323b' }}>● Erros</span></div>
      </Card>
    );
  };

  // ---------- telas ----------
  const accAll = pc(stats.c, stats.q);
  const Painel = () => (
    <Card title="Painel" className="overflow-hidden">
      <div className="overflow-x-auto hs"><table className="w-full text-sm">
        <thead><tr className="t2 text-xs"><th className="text-left py-2 font-bold">Disciplinas</th><th>Tempo</th><th><Check size={14} className="mx-auto" /></th><th><X size={14} className="mx-auto" /></th><th><Edit3 size={14} className="mx-auto" /></th><th>%</th></tr></thead>
        <tbody>{Object.values(stats.d).map(r => { const t = r.c + r.e; return (
          <tr key={r.id} className="border-t border-white/30 text-center">
            <td className="text-left py-2 font-semibold cursor-pointer" style={{ color: 'var(--p2)' }} onClick={() => openRec({ subjectId: r.id })}>{r.name}</td>
            <td className="t1 whitespace-nowrap">{r.time ? fmt(r.time) : '-'}</td><td style={{ color: 'var(--ok)' }} className="font-bold">{r.c}</td><td style={{ color: 'var(--bad)' }} className="font-bold">{r.e}</td><td className="font-bold t1">{t}</td>
            <td><Badge v={t ? pc(r.c, t) : null} /></td></tr>); })}</tbody></table></div>
    </Card>
  );
  const Planej = ({ limit }) => !cycle ? <Card title="Planejamento"><button className="btn" onClick={openPlan}>Criar planejamento</button></Card> : (
    <Card title="Planejamento"><div className="space-y-2">{cycle.blocks.slice(0, limit || 99).map((b, i) => (
      <div key={i} className="glass-in px-3 py-2 flex items-center gap-3 cursor-pointer" onClick={() => openRec({ subjectId: b.id, time: hms(Math.max(0, b.min - b.got) * 60) })}>
        <div className="w-1.5 h-8 rounded-full" style={{ background: SUBJ[b.id].color }} />
        <div className="flex-1 min-w-0"><div className="font-bold text-sm t1 truncate">{SUBJ[b.id].name}</div><div className="bar !h-1.5 mt-1"><div style={{ width: (b.got / b.min) * 100 + '%' }} /></div></div>
        <span className="text-[11px] font-bold t2 flex items-center gap-1 whitespace-nowrap"><Clock size={12} />{fmtMin(Math.round(b.got))} / {fmtMin(b.min)}</span></div>))}</div></Card>
  );
  const renderHome = () => {
    const da = dayAgg(addD(today, dayOff)); const pie = Object.entries(da.subj).map(([id, v]) => ({ v, c: SUBJ[id].color, n: SUBJ[id].name }));
    const recent = db.sessions.slice(0, 5);
    return (
      <div className="max-w-[1300px] mx-auto space-y-4">
        <h2 className="text-2xl font-extrabold t1">Home</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat title="Tempo de estudo" value={fmt(stats.time)} />
          <Stat title="Desempenho" sub={<><div style={{ color: 'var(--ok)' }}>{stats.c} Acertos</div><div style={{ color: 'var(--bad)' }}>{stats.e} Erros</div></>} value={accAll + '%'} />
          <Stat title="Progresso no edital" sub={<><div style={{ color: 'var(--ok)' }}>{stats.done} Tópicos Concluídos</div><div style={{ color: 'var(--bad)' }}>{stats.total - stats.done} Tópicos Pendentes</div></>} value={pc(stats.done, stats.total) + '%'} />
          <div className="glass p-4 flex items-center text-center text-xs italic t1 col-span-2 lg:col-span-1">“Há dois tipos de pessoa que vão te dizer que você não pode fazer a diferença neste mundo: as que têm medo de tentar e as que têm medo de que você se dê bem” — Ray Goforth</div>
        </div>
        <Card title="Constância nos estudos"><p className="text-sm t1 mb-2">Você está há <b>{streak} {streak === 1 ? 'dia' : 'dias'}</b> sem falhar!</p><StreakChips /></Card>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Painel />
            <Card title="Revisões">{!dueRev.length ? <p className="t2 text-sm">Nenhuma revisão pendente. Marque “Programar revisões” ao registrar um estudo.</p> : dueRev.map(r => { const s = db.sessions.find(x => x.id === r.sid); return (
              <div key={r.id} className="glass-in p-2 mb-2 flex items-center gap-2 text-sm">
                <span className="btn-o !py-0.5 !px-2 !text-[10px]">{r.n} {r.n === 1 ? 'dia' : 'dias'}</span>
                <button title="Registrar revisão" onClick={() => openRec({ subjectId: s.subjectId, topic: s.topic, category: 'Revisão' })}><PlayCircle size={20} style={{ color: 'var(--p)' }} /></button>
                <div className="flex-1 min-w-0"><div className="font-bold t1 text-xs">{SUBJ[s.subjectId].name}</div><div className="t2 text-[11px] truncate">{s.date.slice(8)}/{s.date.slice(5, 7)} · {s.topic || 'Estudo geral'}</div></div>
                <button title="Concluir" onClick={() => upd(d => ({ reviews: d.reviews.map(x => (x.id === r.id ? { ...x, done: true } : x)) }))}><CheckCircle2 size={22} style={{ color: 'var(--ok)' }} /></button></div>); })}</Card>
            <Planej limit={5} />
            <Card title="Lembretes">
              <div className="space-y-2">{db.reminders.map(r => <div key={r.id} className="glass-in px-3 py-2 flex items-center gap-2 text-xs font-bold t1"><input type="checkbox" checked={r.done} onChange={() => upd(d => ({ reminders: d.reminders.map(x => (x.id === r.id ? { ...x, done: !x.done } : x)) }))} style={{ accentColor: 'var(--p)' }} /><span className={'flex-1 uppercase ' + (r.done ? 'line-through opacity-50' : '')}>{r.t}</span><button onClick={() => upd(d => ({ reminders: d.reminders.filter(x => x.id !== r.id) }))}><Trash2 size={15} /></button></div>)}</div>
              <div className="flex gap-2 mt-3"><input className="inp" placeholder="Novo lembrete..." value={remText} onChange={e => setRemText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && remText.trim()) { upd(d => ({ reminders: [...d.reminders, { id: Date.now(), t: remText.trim(), done: false }] })); setRemText(''); } }} /><button className="btn" onClick={() => { if (remText.trim()) { upd(d => ({ reminders: [...d.reminders, { id: Date.now(), t: remText.trim(), done: false }] })); setRemText(''); } }}><Plus size={14} /></button></div>
            </Card>
          </div>
          <div className="space-y-4">
            <Card title="Metas de estudo semanal" right={<button onClick={editGoals}><Edit3 size={14} className="t2" /></button>}>
              <div className="text-[11px] font-bold t2 mb-1">{fmt(wSec)} / {db.goals.hours}h00min · Horas de estudo</div><div className="bar"><div style={{ width: Math.min(100, (wSec / 3600 / db.goals.hours) * 100) + '%' }} /></div>
              <div className="text-[11px] font-bold t2 mt-3 mb-1">{wQ} / {db.goals.q} · Questões</div><div className="bar"><div style={{ width: Math.min(100, (wQ / db.goals.q) * 100) + '%', background: '#8a4b8f' }} /></div>
            </Card>
            <WeekBars />
            <Card title="Estudos do dia" right={<div className="flex items-center gap-1 text-[11px] font-bold t2"><button onClick={() => setDayOff(dayOff - 1)}><ChevronLeft size={16} /></button>{addD(today, dayOff).split('-').reverse().join('/')}<button onClick={() => setDayOff(Math.min(0, dayOff + 1))}><ChevronRight size={16} /></button></div>}>
              <div className="flex flex-col items-center"><Pie data={pie} /><div className="font-extrabold text-xl t1 mt-2">{fmt(da.sec)}</div>
                <div className="w-full mt-2 space-y-1">{pie.map((p, i) => <div key={i} className="flex justify-between text-[11px] font-bold t2"><span className="flex items-center gap-2"><i className="w-3 h-3 rounded-sm inline-block" style={{ background: p.c }} />{p.n}</span><span>{fmt(p.v)}</span></div>)}</div></div>
            </Card>
            <Card title="Últimas atividades">{!recent.length ? <p className="t2 text-sm">Sem atividades ainda.</p> : recent.map(s => <div key={s.id} className="flex justify-between text-xs py-1 border-b border-white/30"><span className="font-bold t1">{SUBJ[s.subjectId]?.name}</span><span className="t2">{dateLabel(s.date)} · {fmt(s.sec)}</span></div>)}</Card>
          </div>
        </div>
      </div>
    );
  };
  const renderStats = () => {
    const days = studied.size, avg = days ? stats.time / days : 0, fail = Math.max(0, totalDays - days);
    return (
      <div className="max-w-[1300px] mx-auto space-y-4">
        <div className="flex justify-between items-center"><h2 className="text-2xl font-extrabold t1">Estatísticas</h2><button className="btn" onClick={() => openRec()}>Adicionar Estudo</button></div>
        <div className="grid lg:grid-cols-[260px_1fr] gap-3">
          <Card title="Desempenho" className="flex flex-col items-center"><Ring segs={[{ v: stats.c, c: '#4fae82' }, { v: stats.e, c: '#c0474f' }]} center={<span className="text-2xl">{accAll}%</span>} /></Card>
          <div className="grid sm:grid-cols-2 gap-3">
            <Stat title="Tempo de estudo" sub={<><div>{fmt(avg)} por dia estudado (média)</div><div>{days} dias estudados</div><div>{days ? totalDays : 0} dias totais</div></>} value={fmt(stats.time)} />
            <Stat title="Constância nos estudos" sub={<><div>{days} dias estudados</div><div>{days ? fail : 0} dias falhados</div></>} value={pc(days, totalDays) + '%'} />
            <Stat title="Páginas lidas" sub={`${stats.pph} páginas por hora`} value={stats.pages} />
            <Stat title="Videoaulas" value={fmt(stats.vid)} />
            <div className="sm:col-span-2"><Stat title="Progresso no edital" sub={<><div style={{ color: 'var(--ok)' }}>{stats.done} Tópicos Concluídos</div><div style={{ color: 'var(--bad)' }}>{stats.total - stats.done} Tópicos Pendentes</div></>} value={pc(stats.done, stats.total) + '%'} /></div>
          </div>
        </div>
        <Evo />
      </div>
    );
  };
  const renderPlanejamento = () => (
    <div className="max-w-[1300px] mx-auto space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2"><h2 className="text-2xl font-extrabold t1">Planejamento</h2>
        <div className="flex gap-2"><button className="btn-g" onClick={() => confirm('Recomeçar o ciclo agora?') && restartCycle()}><RotateCcw size={12} className="inline mr-1" />Recomeçar Ciclo</button><button className="btn" onClick={openPlan}>{db.plan ? 'Editar Planejamento' : 'Criar Planejamento'}</button></div></div>
      {!cycle ? <Card><p className="t1 text-sm mb-3">Você ainda não tem um planejamento. Informe a importância de cada disciplina, seu conhecimento e as horas semanais para gerar o ciclo de estudos.</p><button className="btn" onClick={openPlan}>Criar planejamento</button></Card> :
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <Card title="Ciclos completos" className="flex flex-col items-center"><div className="w-14 h-14 rounded-full border-4 flex items-center justify-center text-2xl font-extrabold" style={{ borderColor: 'var(--p)', color: 'var(--p)' }}>{db.cyc.count}</div></Card>
              <Card title="Progresso"><div className="text-xs font-bold t2 mb-2">{fmtMin(Math.round(cycle.done))} / {fmtMin(cycle.total)}</div><div className="bar"><div style={{ width: (cycle.done / cycle.total) * 100 + '%' }} /></div></Card>
            </div>
            <Card title="Sequência dos estudos" right={<button className="btn !py-1 !px-3" onClick={openPlan}>Ajustar Ciclo</button>}>
              <div className="space-y-2 max-h-[460px] overflow-y-auto hs">{cycle.blocks.map((b, i) => (
                <div key={i} className="glass-in p-3">
                  <div className="flex items-center gap-3"><div className="w-1.5 h-7 rounded-full" style={{ background: SUBJ[b.id].color }} /><span className="flex-1 font-bold text-sm t1">{SUBJ[b.id].name}</span><span className="text-[11px] font-bold t2 flex items-center gap-1"><Clock size={12} />{fmtMin(Math.round(b.got))} / {fmtMin(b.min)}</span></div>
                  <div className="bar !h-1.5 my-2"><div style={{ width: (b.got / b.min) * 100 + '%' }} /></div>
                  <div className="flex gap-4 text-[11px] font-bold t2 flex-wrap">
                    <button className="flex items-center gap-1" onClick={() => startTimer(b.id)}><PlayCircle size={14} />Iniciar Estudo</button>
                    <button className="flex items-center gap-1" onClick={() => openRec({ subjectId: b.id })}><Plus size={14} />Adicionar Estudo Manualmente</button>
                    <button className="flex items-center gap-1" onClick={() => { setFlt({ subject: b.id, category: '', open: false }); setTab('historico'); }}><History size={14} />Exibir Registros de Estudo</button>
                  </div></div>))}</div>
            </Card>
          </div>
          <Card title="Ciclo" className="flex flex-col items-center">
            <Ring size={300} sw={46} gap={2} segs={cycle.blocks.map(b => ({ v: b.min, c: SUBJ[b.id].color }))} center={<span className="text-xl">{fmtMin(cycle.total)}</span>} />
            <div className="flex w-full mt-5 h-3 rounded-full overflow-hidden">{EDITAL.map(s => { const m = cycle.blocks.filter(b => b.id === s.id).reduce((a, b) => a + b.min, 0); return <div key={s.id} style={{ width: (m / cycle.total) * 100 + '%', background: SUBJ[s.id].color }} />; })}</div>
            <div className="w-full mt-3 grid grid-cols-2 gap-1">{EDITAL.map(s => <span key={s.id} className="text-[11px] font-bold t2 flex items-center gap-2"><i className="w-3 h-3 rounded-sm inline-block" style={{ background: SUBJ[s.id].color }} />{SUBJ[s.id].name} · {db.plan.pct[s.id]}%</span>)}</div>
          </Card>
        </div>}
    </div>
  );
  const renderEdital = () => (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-extrabold t1">Edital</h2>
      <Card title="Progresso no edital"><div className="flex justify-between text-xs t2 mb-2"><span>{stats.done} de {stats.total} tópicos concluídos</span><b className="t1 text-lg">{pc(stats.done, stats.total)}%</b></div><div className="bar"><div style={{ width: pc(stats.done, stats.total) + '%' }} /></div></Card>
      {EDITAL.map(s => (
        <details key={s.id} className="glass overflow-hidden group">
          <summary className="px-4 py-3 flex items-center justify-between cursor-pointer list-none"><div className="flex items-center gap-3"><div className="w-1.5 h-6 rounded-full" style={{ background: SUBJ[s.id].color }} /><span className="font-bold text-sm t1">{SUBJ[s.id].name}</span><span className="text-[11px] t2">{s.topics.filter(t => db.checked[s.id + '_' + t]).length}/{s.topics.length}</span></div><ChevronDown size={18} className="t2 group-open:rotate-180 transition-transform" /></summary>
          <div className="overflow-x-auto hs"><table className="w-full text-xs"><thead><tr className="t2"><th className="text-left px-4 py-2">Tópicos</th><th><Check size={13} className="mx-auto" /></th><th><X size={13} className="mx-auto" /></th><th><Edit3 size={13} className="mx-auto" /></th><th className="px-2">%</th></tr></thead>
            <tbody>{s.topics.map((t, i) => { const k = s.id + '_' + t, st = stats.t[k] || { c: 0, e: 0 }, tot = st.c + st.e, on = !!db.checked[k]; return (
              <tr key={i} className="border-t border-white/30" style={{ background: on ? 'rgba(255,255,255,.2)' : '' }}>
                <td className="px-4 py-2"><label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" checked={on} onChange={() => upd(d => ({ checked: { ...d.checked, [k]: !d.checked[k] } }))} className="mt-0.5 w-4 h-4" style={{ accentColor: 'var(--p)' }} /><span className={'font-medium t1 ' + (on ? 'line-through opacity-60' : '')}>{t}</span></label></td>
                <td className="text-center font-bold" style={{ color: 'var(--ok)' }}>{st.c || '-'}</td><td className="text-center font-bold" style={{ color: 'var(--bad)' }}>{st.e || '-'}</td><td className="text-center font-bold t1">{tot || '-'}</td><td className="text-center px-2"><Badge v={tot ? pc(st.c, tot) : null} /></td></tr>); })}</tbody></table></div>
        </details>))}
    </div>
  );
  const renderHist = () => {
    const list = db.sessions.filter(s => (!flt.subject || s.subjectId === flt.subject) && (!flt.category || s.category === flt.category)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
    const groups = []; list.forEach(s => { let g = groups.find(x => x.d === s.date); if (!g) groups.push((g = { d: s.date, items: [] })); g.items.push(s); });
    return (
      <div className="max-w-[1300px] mx-auto space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2 relative"><h2 className="text-2xl font-extrabold t1">Histórico</h2>
          <div className="flex gap-2"><button className="btn" onClick={() => openRec()}>Adicionar Estudo</button><button className="btn-o flex items-center gap-1" onClick={() => setFlt({ ...flt, open: !flt.open })}><Filter size={13} />Filtros{(flt.subject || flt.category) ? ' •' : ''}</button></div>
          {flt.open && <div className="glass absolute right-0 top-12 z-30 p-4 w-64 space-y-3"><select className="inp" value={flt.subject} onChange={e => setFlt({ ...flt, subject: e.target.value })}><option value="">Todas as disciplinas</option>{EDITAL.map(s => <option key={s.id} value={s.id}>{SUBJ[s.id].name}</option>)}</select><select className="inp" value={flt.category} onChange={e => setFlt({ ...flt, category: e.target.value })}><option value="">Todas as categorias</option>{['Teoria', 'Revisão', 'Questões', 'Leitura de Lei'].map(c => <option key={c}>{c}</option>)}</select><button className="btn-g w-full" onClick={() => setFlt({ subject: '', category: '', open: false })}>Limpar filtros</button></div>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat title="Tempo de estudo" value={fmt(stats.time)} /><Stat title="Desempenho" sub={<><div style={{ color: 'var(--ok)' }}>{stats.c} Acertos</div><div style={{ color: 'var(--bad)' }}>{stats.e} Erros</div></>} value={accAll + '%'} />
          <Stat title="Progresso no edital" sub={<><div style={{ color: 'var(--ok)' }}>{stats.done} Tópicos Concluídos</div><div style={{ color: 'var(--bad)' }}>{stats.total - stats.done} Pendentes</div></>} value={pc(stats.done, stats.total) + '%'} />
          <Stat title="Páginas lidas" sub={`${stats.pph} páginas por hora`} value={stats.pages} />
        </div>
        {!groups.length && <Card><p className="t2 text-sm">Nenhum estudo registrado{flt.subject || flt.category ? ' com esses filtros' : ''}.</p></Card>}
        {groups.map(g => (
          <div key={g.d}>
            <div className="flex items-center gap-3 mb-2"><h3 className="font-extrabold text-lg t1 whitespace-nowrap">{dateLabel(g.d)}</h3><div className="flex-1 h-px" style={{ background: 'var(--p)', opacity: .5 }} /><span className="text-xs font-bold t1 flex items-center gap-1"><Clock size={13} />{fmt(g.items.reduce((a, b) => a + b.sec, 0))}</span></div>
            <div className="glass overflow-hidden">{g.items.map(s => { const t = s.c + s.e; return (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 border-b border-white/30 last:border-0 flex-wrap">
                <div className="w-1.5 self-stretch rounded-full" style={{ background: SUBJ[s.subjectId]?.color }} />
                <div className="flex-1 min-w-[160px]"><div className="font-extrabold text-sm uppercase t1">{SUBJ[s.subjectId]?.name}</div><div className="text-[11px] t2 truncate max-w-[420px]">{s.topic || 'Estudo geral'}{s.material ? ' · ' + s.material : ''}</div></div>
                <span className="text-xs t2 flex items-center gap-1"><Clock size={12} />{hms(s.sec)}</span>
                <span className="font-bold text-sm w-6 text-center" style={{ color: 'var(--ok)' }}>{s.c}</span><span className="font-bold text-sm w-6 text-center" style={{ color: 'var(--bad)' }}>{s.e}</span><Badge v={t ? pc(s.c, t) : null} />
                <span className="badge w-24 text-center" style={{ background: catColor(s.category) }}>{s.category.toUpperCase()}</span>
                <button onClick={() => s.comment && alert(s.comment)} style={{ opacity: s.comment ? 1 : .3, color: 'var(--p)' }}><MessageSquare size={18} /></button>
                <button onClick={() => editSession(s)} className="t2"><Edit3 size={16} /></button><button onClick={() => delSession(s.id)} className="t2"><Trash2 size={16} /></button>
              </div>); })}</div>
          </div>))}
      </div>
    );
  };

  // ---------- modais ----------
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const recModal = () => f && (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && setF(null)}>
      <div className="glass modal" style={{ background: dark ? undefined : 'rgba(255,240,241,.82)' }}>
        <div className="flex justify-between items-center mb-3"><h2 className="text-xl font-extrabold t1">{f.id ? 'Editar Estudo' : 'Registro de Estudo'}</h2><button onClick={() => setF(null)} style={{ color: 'var(--p)' }}><X size={24} /></button></div>
        <div className="flex gap-2 items-center mb-4">{[['hoje', 'HOJE'], ['ontem', 'ONTEM'], ['outro', 'OUTRO']].map(([k, l]) => <button key={k} type="button" onClick={() => set('mode', k)} className={f.mode === k ? 'btn !py-1.5' : 'btn-g !py-1.5'}>{l}</button>)}{f.mode === 'outro' && <input type="date" className="inp !w-40" value={f.date} max={today} onChange={e => set('date', e.target.value)} />}</div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-4"><div className="lbl">Categoria</div><select className="inp" value={f.category} onChange={e => set('category', e.target.value)}>{['Teoria', 'Revisão', 'Questões', 'Leitura de Lei'].map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="col-span-12 sm:col-span-5"><div className="lbl">Disciplina</div><select className="inp" value={f.subjectId} onChange={e => setF(x => ({ ...x, subjectId: e.target.value, topic: '' }))}><option value="">Selecione...</option>{EDITAL.map(s => <option key={s.id} value={s.id}>{SUBJ[s.id].name}</option>)}</select></div>
          <div className="col-span-12 sm:col-span-3"><div className="lbl">Tempo de estudo</div><input className="inp" value={f.time} onChange={e => set('time', e.target.value)} placeholder="00:00:00" /></div>
          <div className="col-span-12 sm:col-span-8"><div className="lbl">Tópico</div><select className="inp" disabled={!f.subjectId} value={f.topic} onChange={e => set('topic', e.target.value)}><option value="">Selecione...</option>{f.subjectId && SUBJ[f.subjectId].topics.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="col-span-12 sm:col-span-4"><div className="lbl">Material</div><input className="inp" placeholder="Ex.: Aula 01" value={f.material} onChange={e => set('material', e.target.value)} /></div>
        </div>
        <div className="flex gap-6 my-4 flex-wrap">{[['finished', 'Teoria finalizada'], ['rev', 'Programar revisões']].map(([k, l]) => <label key={k} className="lbl flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f[k]} onChange={e => set(k, e.target.checked)} style={{ accentColor: 'var(--p)' }} />{l}</label>)}</div>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div className="fieldset"><span className="lg">Questões · Acertos / Erros</span><div className="flex gap-2 pt-2"><input type="number" min="0" className="inp text-center" placeholder="0" value={f.c} onChange={e => set('c', e.target.value)} /><input type="number" min="0" className="inp text-center" placeholder="0" value={f.e} onChange={e => set('e', e.target.value)} /></div></div>
          <div className="fieldset"><span className="lg">Páginas · Início / Fim</span>{f.pages.map((p, i) => <div key={i} className="flex gap-2 pt-2"><input type="number" min="0" className="inp text-center" placeholder="0" value={p.s} onChange={e => set('pages', f.pages.map((x, j) => (j === i ? { ...x, s: e.target.value } : x)))} /><input type="number" min="0" className="inp text-center" placeholder="0" value={p.e} onChange={e => set('pages', f.pages.map((x, j) => (j === i ? { ...x, e: e.target.value } : x)))} /></div>)}<button type="button" className="mx-auto block mt-2" style={{ color: 'var(--p)' }} onClick={() => set('pages', [...f.pages, { s: '', e: '' }])}><Plus size={16} /></button></div>
          <div className="fieldset"><span className="lg">Videoaulas · Título / Início / Fim</span>{f.videos.map((v, i) => <div key={i} className="flex gap-1 pt-2"><input className="inp !text-xs" placeholder="Vídeo 01" value={v.t} onChange={e => set('videos', f.videos.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))} /><input className="inp !text-xs !w-20" value={v.s} onChange={e => set('videos', f.videos.map((x, j) => (j === i ? { ...x, s: e.target.value } : x)))} /><input className="inp !text-xs !w-20" value={v.e} onChange={e => set('videos', f.videos.map((x, j) => (j === i ? { ...x, e: e.target.value } : x)))} /></div>)}<button type="button" className="mx-auto block mt-2" style={{ color: 'var(--p)' }} onClick={() => set('videos', [...f.videos, { t: '', s: '00:00:00', e: '00:00:00' }])}><Plus size={16} /></button></div>
        </div>
        <div className="lbl">Comentários</div><textarea rows={2} className="inp mb-4" value={f.comment} onChange={e => set('comment', e.target.value)} />
        <div className="flex justify-between items-center flex-wrap gap-3">{!f.id ? <label className="lbl flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.again} onChange={e => set('again', e.target.checked)} style={{ accentColor: 'var(--p)' }} />Salvar e criar novo</label> : <span />}
          <div className="flex gap-2"><button className="btn-o !py-2 !px-6" onClick={() => setF(null)}>Cancelar</button><button className="btn !py-2 !px-8" onClick={save}>Salvar</button></div></div>
      </div>
    </div>
  );
  const planModal = () => {
    if (!pm) return null;
    const raw = EDITAL.map(s => pm.w[s.id].imp * (6 - pm.w[s.id].kn)), sum = raw.reduce((a, b) => a + b, 0) || 1;
    const opts = [30, 45, 60, 75, 90, 105, 120, 150, 180];
    return (
      <div className="modal-bg"><div className="glass modal" style={{ background: dark ? undefined : 'rgba(255,240,241,.82)' }}>
        <div className="flex justify-between items-center mb-2"><h2 className="text-xl font-extrabold t1">Criar Planejamento</h2><button onClick={() => setPm(null)} style={{ color: 'var(--p)' }}><X size={24} /></button></div>
        {pm.step === 1 ? <>
          <p className="text-sm t1 mb-3">Para cada disciplina, selecione a <u>importância</u> para sua prova e seu <u>grau de conhecimento</u>.</p>
          <div className="grid sm:grid-cols-[1fr_220px] gap-4">
            <div className="grid grid-cols-2 gap-3 max-h-[340px] overflow-y-auto hs">{EDITAL.map(s => { const w = pm.w[s.id]; return (
              <div key={s.id} className="glass-in p-3"><div className="text-center font-bold text-sm t1 mb-2">{SUBJ[s.id].name}</div>
                {[['imp', 'Importância', 1], ['kn', 'Conhecimento', 0]].map(([k, l, mn]) => <div key={k} className="mb-2"><div className="flex justify-between lbl"><span>{l}</span><span>{w[k]}</span></div><input type="range" min={mn} max="5" step=".5" value={w[k]} className="w-full" style={{ accentColor: 'var(--p)' }} onChange={e => setPm(p => ({ ...p, w: { ...p.w, [s.id]: { ...p.w[s.id], [k]: +e.target.value } } }))} /></div>)}</div>); })}</div>
            <div className="space-y-2">{EDITAL.map((s, i) => <div key={s.id} className="rounded-lg flex items-center text-xs font-bold t1" style={{ background: SUBJ[s.id].color + 'cc' }}><span className="px-2 py-2 border-r border-white/50">{Math.round((raw[i] / sum) * 100)}%</span><span className="flex-1 text-center px-1">{SUBJ[s.id].name}</span></div>)}</div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><button className="btn-o !py-2 !px-6" onClick={() => setPm(null)}>Voltar</button><button className="btn !py-2 !px-6" onClick={() => setPm({ ...pm, step: 2 })}>Avançar</button></div></> : <>
          <div className="lbl mt-2">Quantas horas, em média, pretende estudar por semana?</div><input type="number" min="1" className="inp !w-28 mb-4" value={pm.hours} onChange={e => setPm({ ...pm, hours: +e.target.value || 1 })} />
          <div className="lbl mb-2">Em quais dias você pretende estudar?</div>
          <div className="flex rounded-xl overflow-hidden mb-4">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => { const on = pm.days.includes(i); return <button key={i} className="flex-1 py-2 text-xs font-bold" style={{ background: on ? 'var(--p)' : 'rgba(120,80,85,.3)', color: on ? '#fff' : 'var(--t2)' }} onClick={() => setPm({ ...pm, days: on ? pm.days.filter(x => x !== i) : [...pm.days, i] })}>{d}</button>; })}</div>
          <div className="lbl mb-1">Duração mínima e máxima de uma sessão de estudos (disciplina)</div>
          <div className="flex items-center gap-3"><select className="inp !w-32" value={pm.min} onChange={e => setPm({ ...pm, min: +e.target.value })}>{opts.map(o => <option key={o} value={o}>{fmtMin(o)}</option>)}</select><span className="t2">a</span><select className="inp !w-32" value={pm.max} onChange={e => setPm({ ...pm, max: +e.target.value })}>{opts.map(o => <option key={o} value={o}>{fmtMin(o)}</option>)}</select></div>
          <div className="flex justify-end gap-2 mt-6"><button className="btn-o !py-2 !px-6" onClick={() => setPm({ ...pm, step: 1 })}>Voltar</button><button className="btn !py-2 !px-6" onClick={concluirPlan}>Concluir</button></div></>}
      </div></div>
    );
  };

  const NAV = [['home', Home, 'Home'], ['estatisticas', BarChart3, 'Estatísticas'], ['planejamento', CalendarDays, 'Planejamento'], ['edital', BookMarked, 'Edital'], ['historico', History, 'Histórico']];
  const go = id => { setTab(id); setSide(false); };
  return (
    <div className="h-full flex flex-col">
      <div className="bg-scene" />
      <header className="safe glass !rounded-none !border-x-0 !border-t-0 z-20 shrink-0">
        <div className="h-14 flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSide(!side)} className="rounded-full px-4 py-1.5" style={{ background: 'var(--p)', color: '#fff' }}><Menu size={20} /></button>
            <span className="text-2xl font-extrabold italic" style={{ color: 'var(--p2)', fontFamily: "'Segoe Script','Brush Script MT',cursive" }}>estudei</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn hidden sm:block" onClick={() => openRec()}>Adicionar Estudo</button>
            <button className="btn-o flex items-center gap-1 !py-1" onClick={() => { const n = prompt('Nome do plano:', db.planName); if (n) upd(() => ({ planName: n })); }}><Globe size={14} />{db.planName}<ChevronDown size={12} /></button>
            <button className="relative" onClick={() => go('home')} style={{ color: 'var(--p)' }}><Bell size={20} />{dueRev.length > 0 && <span className="absolute -top-1 -right-2 badge" style={{ background: 'var(--bad)' }}>{dueRev.length}</span>}</button>
            <button onClick={() => setDark(!dark)} style={{ color: 'var(--p)' }}>{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center glass-in"><User size={18} className="t2" /></div>
          </div>
        </div>
      </header>
      {side && <div className="fixed inset-0 z-30" onClick={() => setSide(false)} />}
      {side && <nav className="safe glass fixed left-2 top-16 z-40 w-56 p-2 !rounded-2xl" style={{ marginTop: 'env(safe-area-inset-top,0px)' }}>{NAV.map(([id, I, l]) => <button key={id} onClick={() => go(id)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm t1" style={{ background: tab === id ? 'rgba(192,71,79,.28)' : '' }}><I size={18} />{l}</button>)}</nav>}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24">
        {tab === 'home' && renderHome()}{tab === 'estatisticas' && renderStats()}{tab === 'planejamento' && renderPlanejamento()}{tab === 'edital' && renderEdital()}{tab === 'historico' && renderHist()}
      </main>
      {tmOpen && <div className="glass fixed right-4 bottom-24 z-40 p-4 w-64 space-y-3">
        <div className="lbl flex justify-between">Cronômetro<button onClick={() => setTmOpen(false)}><X size={14} /></button></div>
        <div className="text-3xl font-extrabold text-center t1 tabular-nums">{hms(elapsed)}</div>
        <select className="inp" value={tm.subject} onChange={e => setTm({ ...tm, subject: e.target.value })}><option value="">Disciplina...</option>{EDITAL.map(s => <option key={s.id} value={s.id}>{SUBJ[s.id].name}</option>)}</select>
        <div className="flex gap-2 justify-center">{tm.at ? <button className="btn flex items-center gap-1" onClick={pauseTimer}><Pause size={14} />Pausar</button> : <button className="btn flex items-center gap-1" onClick={() => setTm(t => ({ ...t, at: Date.now() }))}><PlayCircle size={14} />Iniciar</button>}<button className="btn-o flex items-center gap-1" onClick={finishTimer} disabled={elapsed < 1}><Square size={13} />Finalizar</button></div>
      </div>}
      <button onClick={() => setTmOpen(!tmOpen)} className={'fixed right-4 bottom-6 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white ' + (tm.at ? 'pulse' : '')} style={{ background: 'var(--p)', boxShadow: '0 6px 18px rgba(80,10,20,.45)', marginBottom: 'env(safe-area-inset-bottom,0px)' }}><Timer size={26} /></button>
      {recModal()}{planModal()}
    </div>
  );
}
