export const ds = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
export const todayStr = () => ds(new Date());
export const addD = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ds(d); };
export const dow = s => new Date(s + 'T12:00:00').getDay();
export const fmt = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${h}h${String(m).padStart(2, '0')}min`; };
export const fmtMin = m => fmt(m * 60);
export const hms = s => { s = Math.floor(s); return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(x => String(x).padStart(2, '0')).join(':'); };
export const parseT = t => { const p = String(t || '').split(':').map(x => parseInt(x) || 0); while (p.length < 3) p.unshift(0); return p[0] * 3600 + p[1] * 60 + p[2]; };
export const pc = (c, t) => (t > 0 ? Math.round((c / t) * 100) : 0);
export const MES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
export const DIA = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
export const COLORS = ['#e58f8f','#eab676','#8fb9dc','#b99be3','#80c7aa'];
export const catColor = c => ({ 'Teoria':'#6b4bb5','Questões':'#3f9d72','Leitura de Lei':'#e0922f','Revisão':'#b8323b' }[c] || '#888');
export const accColor = p => (p >= 75 ? '#3f9d72' : p >= 50 ? '#e0a82f' : '#c0474f');
export const genCycle = p => {
  const ids = Object.keys(p.w);
  const raw = ids.map(i => p.w[i].imp * (6 - p.w[i].kn));
  const sum = raw.reduce((a, b) => a + b, 0);
  const total = p.hours * 60;
  const lists = ids.map((id, i) => {
    const m = Math.max(15, Math.round((total * raw[i]) / sum / 15) * 15);
    const n = Math.max(1, Math.ceil(m / p.max));
    const each = Math.max(15, Math.round(m / n / 15) * 15);
    return Array.from({ length: n }, () => ({ id, min: each }));
  });
  const out = []; let more = true;
  for (let k = 0; more; k++) { more = false; lists.forEach(l => { if (l[k]) { out.push(l[k]); more = true; } }); }
  return out;
};
