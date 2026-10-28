// Felles hjelpefunksjoner for storskjerm, kontrollpanel og mobil.
import { QRCode, Level } from '/vendor/qr.js';

export async function api(path, { method = 'GET', body, pin } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (pin) headers['x-admin-pin'] = pin;
  const res = await fetch(`/api/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Feil ${res.status}`), { status: res.status });
  return data;
}

// ---------- Klokke ----------
// Alle nedtellinger regnes mot serverens tid. Tilstanden (/api/state) kan være opptil 1 s gammel
// pga. CDN-cache, så den brukes IKKE til klokkesynk (bortsett fra som nødløsning før første synk).
// Egen ukachet synk mot /api/time: flere målinger, vi beholder den med kortest rundtur (NTP-prinsippet).
let offset = 0;
let synced = false;
let bestRtt = Infinity;
async function sample() {
  const t0 = performance.now();
  const r = await fetch('/api/time', { cache: 'no-store' });
  const { now: server } = await r.json();
  const t1 = performance.now();
  const rtt = t1 - t0;
  if (rtt <= bestRtt) { bestRtt = rtt; offset = server + rtt / 2 - Date.now(); synced = true; }
}
export async function syncTime(n = 5) {
  for (let i = 0; i < n; i++) { try { await sample(); } catch { /* prøv igjen senere */ } }
}
// Start synk ved sidelast, og finjuster hvert 2. minutt (litt slakk slik at drift kan rettes).
syncTime(5);
setInterval(() => { bestRtt *= 1.5; syncTime(3); }, 120000);

export const syncClock = (serverNow) => { if (!synced && serverNow) offset = serverNow - Date.now(); };
export const now = () => Date.now() + offset;

// Nedtelling som aldri går oppover for samme frist (en klokkekorrigering kan bare gjøre den raskere).
const shown = new Map();
export function secondsLeft(deadline) {
  if (!deadline) return 0;
  const raw = Math.max(0, Math.ceil((deadline - now()) / 1000));
  const prev = shown.get(deadline);
  const v = prev == null ? raw : Math.min(prev, raw);
  if (shown.size > 50) shown.clear();
  shown.set(deadline, v);
  return v;
}

// Liten elementbygger. Tekst settes alltid som tekst, aldri som HTML (kallenavn fra publikum).
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) p.startsWith('--') ? el.style.setProperty(p, val) : (el.style[p] = val);
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

const SVG = 'http://www.w3.org/2000/svg';
const s = (tag, attrs) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

// Felles SVG-gradienter (lyspære, glorie, plastglans). Legges inn én gang per side.
function ensureDefs() {
  if (document.getElementById('tp-defs')) return;
  const svg = s('svg', { id: 'tp-defs', width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0' });
  svg.innerHTML = `<defs>
    <radialGradient id="tp-bulb" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#fffdf3"/><stop offset=".45" stop-color="#ffeab4"/><stop offset=".85" stop-color="#f2b54a"/><stop offset="1" stop-color="#b9761c"/></radialGradient>
    <radialGradient id="tp-halo"><stop offset="0" stop-color="#ffd98c" stop-opacity=".55"/><stop offset=".5" stop-color="#ffc56a" stop-opacity=".16"/><stop offset="1" stop-color="#ffc56a" stop-opacity="0"/></radialGradient>
    <linearGradient id="clock-bezel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08f"/><stop offset=".5" stop-color="#f4b942"/><stop offset="1" stop-color="#b98317"/></linearGradient>
    <radialGradient id="tp-shine" cx="34%" cy="26%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".35" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>`;
  document.body.append(svg);
}

// Punkter jevnt fordelt langs et avrundet rektangel (w×h, hjørneradius r).
function roundRectPoints(w, h, r, n) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const sw = w - 2 * r, sh = h - 2 * r, arc = (Math.PI / 2) * r;
  const segs = [
    { len: sw, at: (t) => [r + t, 0] },
    { len: arc, at: (t) => { const a = -Math.PI / 2 + t / r; return [w - r + r * Math.cos(a), r + r * Math.sin(a)]; } },
    { len: sh, at: (t) => [w, r + t] },
    { len: arc, at: (t) => { const a = t / r; return [w - r + r * Math.cos(a), h - r + r * Math.sin(a)]; } },
    { len: sw, at: (t) => [w - r - t, h] },
    { len: arc, at: (t) => { const a = Math.PI / 2 + t / r; return [r + r * Math.cos(a), h - r + r * Math.sin(a)]; } },
    { len: sh, at: (t) => [0, h - r - t] },
    { len: arc, at: (t) => { const a = Math.PI + t / r; return [r + r * Math.cos(a), r + r * Math.sin(a)]; } },
  ];
  const total = segs.reduce((a, b) => a + b.len, 0);
  const pts = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * total;
    for (const sg of segs) { if (d <= sg.len || sg === segs[segs.length - 1]) { pts.push(sg.at(Math.min(d, sg.len))); break; } d -= sg.len; }
  }
  return pts;
}

// Ramme av varme lyspærer rundt et element. Tegnes på nytt hvis størrelsen endres.
// opts: spacing (px mellom pærer), r (pæreradius), inset (avstand fra ytterkant til pærelinjen),
// radius (hjørneradius for pærelinjen), chase (tennes i sekvens), lit (andel pærer som lyser, 0–1).
export function bulbFrame(host, opts = {}) {
  ensureDefs();
  const { spacing = 40, r = 6, inset = 0, outset = 0, radius = null, chase = false, chaseDelay = 0, step = null, flicker = 0.12 } = opts;
  const svg = s('svg', { class: 'bulbs' + (chase ? ' chase' : ''), 'aria-hidden': 'true' });
  if (chaseDelay) svg.style.setProperty('--chase-delay', `${chaseDelay}ms`);
  // Eksplisitt størrelse: en SVG får ellers høyden fra viewBox-forholdet.
  if (outset) Object.assign(svg.style, { left: `-${outset}px`, top: `-${outset}px`, width: `calc(100% + ${2 * outset}px)`, height: `calc(100% + ${2 * outset}px)` });
  host.append(svg);
  let last = '';
  const draw = () => {
    // clientWidth gir layoutstørrelsen, uavhengig av skaleringen på storskjermen.
    const w = svg.clientWidth, hgt = svg.clientHeight;
    if (!w || !hgt) return;
    const key = `${Math.round(w)}x${Math.round(hgt)}`;
    if (key === last) return;
    last = key;
    const cs = getComputedStyle(host);
    const R = radius ?? (parseFloat(cs.borderTopLeftRadius) || 0);
    const iw = w - 2 * inset, ih = hgt - 2 * inset;
    const per = 2 * (iw + ih);
    const n = Math.max(8, Math.round(per / spacing));
    const pts = roundRectPoints(iw, ih, Math.max(0, R - inset), n);
    svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
    if (step != null) svg.style.setProperty('--step', `${step}ms`);
    else svg.style.setProperty('--step', `${Math.max(6, Math.round(1400 / n))}ms`);
    svg.replaceChildren(...pts.map(([x, y], i) => {
      const g = s('g', { class: 'bulb' + (Math.random() < flicker ? ' flicker' : ''), style: `--i:${i};--b:${(0.82 + Math.random() * 0.18).toFixed(2)};--fd:${(3 + Math.random() * 4).toFixed(1)}s` });
      g.append(
        s('circle', { cx: x + inset, cy: y + inset, r: r * 2.6, class: 'bulb-halo' }),
        s('circle', { cx: x + inset, cy: y + inset, r: r + 1.4, fill: '#3a2a0c' }),
        s('circle', { cx: x + inset, cy: y + inset, r, class: 'bulb-core' }));
      return g;
    }));
  };
  new ResizeObserver(draw).observe(svg);
  requestAnimationFrame(draw);
  return svg;
}

// Pursuit-skiltet: signaturelementet. scale 1 ≈ 1100 px bredt.
export function pursuitSign({ scale = 1, bulbs = true, chase = false, chaseDelay = 0, className = '' } = {}) {
  const el = h('div', { class: 'sign ' + className, style: { '--s': scale }, role: 'img', 'aria-label': 'Trainee Pursuit' },
    h('div', { class: 'lettering', 'aria-hidden': 'true' }, h('span', {}, 'Trainee'), h('span', {}, 'Pursuit')));
  if (bulbs) {
    const band = 30 * scale;
    bulbFrame(el, { spacing: Math.max(22, 46 * scale), r: Math.max(3, 7.5 * scale), inset: band / 2, outset: band, radius: 80 * scale, chase, chaseDelay });
  }
  return el;
}

// Mekaniske tavlesifre. Tall og bokstaver får egne «flipp»-brikker; tegn som % og / står fritt.
export function flap(text, cls = '') {
  return h('span', { class: 'flap ' + cls, 'aria-label': String(text) },
    [...String(text)].map((c) => h('span', { class: 'ch' + (/[0-9A-Za-zÆØÅæøå]/.test(c) ? '' : ' sym'), 'aria-hidden': 'true' }, c === ' ' ? ' ' : c)));
}

// Kake med seks stykker, tegnet som en spillbrikke i plast. earned = kategori-id-er laget har vunnet.
// opts.hub: tekst i midten. opts.fresh: stykker som nettopp er vunnet (animeres). opts.glow beholdes for kompatibilitet.
export function cakeSVG(categories, earned = [], label = '', opts = {}) {
  ensureDefs();
  const svg = s('svg', { viewBox: '-6 -6 112 112', class: 'cake', role: 'img', 'aria-label': label });
  svg.append(s('circle', { cx: 51, cy: 53.5, r: 50, fill: 'rgba(0,0,0,.35)' }));
  svg.append(s('circle', { cx: 50, cy: 50, r: 50, class: 'rim', 'stroke-width': 1.6 }));
  svg.append(s('circle', { cx: 50, cy: 50, r: 44, class: 'rim-inner' }));
  const n = categories.length;
  categories.forEach((c, i) => {
    const gap = 0.045;
    const a0 = ((i / n) * 2 * Math.PI) - Math.PI / 2 + gap;
    const a1 = (((i + 1) / n) * 2 * Math.PI) - Math.PI / 2 - gap;
    const r = 41.5, ri = 4;
    const cx = (a) => 50 + Math.cos((a0 + a1) / 2) * ri;
    const cy = (a) => 50 + Math.sin((a0 + a1) / 2) * ri;
    const d = `M${cx()} ${cy()} L${50 + r * Math.cos(a0)} ${50 + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${50 + r * Math.cos(a1)} ${50 + r * Math.sin(a1)} Z`;
    const has = earned.includes(c.id);
    const fresh = has && opts.fresh?.includes(c.id);
    const p = s('path', { d, class: has ? 'wedge' + (fresh ? ' fresh' : '') : 'slot', fill: has ? c.color : '', stroke: has ? 'rgba(0,0,0,.35)' : 'rgba(255,241,210,.08)', 'stroke-width': 0.8, 'stroke-linejoin': 'round' });
    if (has) p.setAttribute('data-cat', c.id);
    if (fresh) p.style.animationDelay = `${0.35 + 0.25 * opts.fresh.indexOf(c.id)}s`;
    svg.append(p);
  });
  svg.append(s('circle', { cx: 50, cy: 50, r: 50, class: 'shine' }));
  const hubR = opts.hub != null ? 15 : 6.5;
  svg.append(s('circle', { cx: 50, cy: 50, r: hubR, class: 'hub', 'stroke-width': 1.4 }));
  if (opts.hub != null) {
    const t = s('text', { x: 50, y: 51, class: 'hub-text', 'font-size': 18 });
    t.textContent = String(opts.hub);
    svg.append(t);
  }
  return svg;
}

// QR-kode tegnet lokalt (ingen CDN), slik at den virker selv om eksterne tjenester svikter.
export function qrSVG(text) {
  try {
    const qr = new QRCode(-1, Level.M);
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    const svg = s('svg', { viewBox: `-2 -2 ${n + 4} ${n + 4}`, 'shape-rendering': 'crispEdges', role: 'img', 'aria-label': `QR-kode til ${text}` });
    svg.append(s('rect', { x: -2, y: -2, width: n + 4, height: n + 4, fill: '#ffffff' }), s('path', { d, fill: '#021b1c' }));
    const wrap = h('div', { class: 'qr' });
    wrap.append(svg);
    return wrap;
  } catch {
    return h('div', { class: 'qr-fallback' }, text);
  }
}

export const catOf = (game, id) => game.categories.find((c) => c.id === id);
export const groupName = (game, id) => game.groups.find((g) => g.id === id)?.name ?? id;
export const teamName = (game, id) => game.teams.find((t) => t.id === id)?.name ?? id;
// Tall med komma og tusenskille, men ikke for årstall og små tall (1905, ikke 1 905).
export const fmt = (n) => (Math.abs(n) >= 10000 ? n.toLocaleString('nb-NO') : String(n).replace('.', ','));
export const LETTERS = ['A', 'B', 'C', 'D'];

export function store(kind) {
  const st = kind === 'session' ? 'sessionStorage' : 'localStorage';
  return {
    get(k) { try { return JSON.parse(window[st].getItem(k)); } catch { return null; } },
    set(k, v) { try { window[st].setItem(k, JSON.stringify(v)); } catch { /* privat modus */ } },
    del(k) { try { window[st].removeItem(k); } catch { /* ignorer */ } },
  };
}

// Enkel polling som pauser når fanen er skjult.
export function poll(fn, ms) {
  let timer;
  const tick = async () => {
    clearTimeout(timer);
    if (!document.hidden) { try { await fn(); } catch (e) { console.warn(e); } }
    timer = setTimeout(tick, ms);
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  tick();
  return () => clearTimeout(timer);
}
