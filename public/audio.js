// Musikkregissør for storskjermen.
// Musikkfilene legges inn én gang på storskjerm-PC-en (dra og slipp) og lagres lokalt i nettleseren
// (IndexedDB). De lastes altså IKKE opp til Netlify eller GitHub. Alternativt leses /audio/<slot>.mp3
// hvis filene finnes der (kun for privat bruk – musikken er opphavsrettsbeskyttet).
// Små effekter (pling, summer, tromme) lages syntetisk med Web Audio, uten filer.

export const SLOTS = {
  theme: { label: 'Intro og vinner', hint: 'Game Show Theme', gain: 0.9, offset: 0 },
  tension: { label: 'Seriøs / dyster', hint: 'Big Brother – Trust No One', gain: 0.9, offset: 0.55 },
  clock: { label: 'Nedtelling (20 s)', hint: 'Jeopardy Theme', gain: 2.6, offset: 1.2 }, // sporet er ca. 10 dB svakere
};

const DB = 'tp-audio';
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(key) {
  try { const d = await db(); return await new Promise((res) => { const t = d.transaction('files').objectStore('files').get(key); t.onsuccess = () => res(t.result ?? null); t.onerror = () => res(null); }); } catch { return null; }
}
async function idbSet(key, val) {
  try { const d = await db(); await new Promise((res, rej) => { const t = d.transaction('files', 'readwrite'); t.objectStore('files').put(val, key); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; } catch { return false; }
}

export class Director {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.names = {};
    this.playing = null; // { slot, src, gain, level }
    this.timers = new Set();
    this.master = null;
    this.enabled = false;
  }

  async unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.enabled = this.ctx.state === 'running';
    if (!this.loadedOnce) { this.loadedOnce = true; await this.loadAll(); }
    else this.decodeMissing();
    return this.enabled;
  }

  async loadAll() {
    this.tried ??= new Set();
    for (const slot of Object.keys(SLOTS)) {
      if (this.buffers[slot]) continue;
      if (this.tried.has(slot) && !this.pending?.[slot]) continue; // allerede forsøkt; ikke gjenta nettverkskall
      this.tried.add(slot);
      let data = await idbGet(slot);
      if (data) this.names[slot] = data.name;
      else {
        try { const r = await fetch(`/audio/${slot}.mp3`); if (r.ok && (r.headers.get('content-type') || '').includes('audio')) data = { name: `${slot}.mp3`, buf: await r.arrayBuffer() }; } catch { /* ingen fil */ }
        if (data) this.names[slot] = data.name + ' (fra nettstedet)';
      }
      if (data && this.ctx) {
        try { this.buffers[slot] = await this.ctx.decodeAudioData(data.buf.slice(0)); } catch { delete this.buffers[slot]; }
      }
    }
  }

  // Filer som ble lest før lydkonteksten fantes, dekodes nå (uten nettverk).
  async decodeMissing() {
    for (const slot of Object.keys(SLOTS)) {
      if (this.buffers[slot] || !this.ctx) continue;
      const data = await idbGet(slot);
      if (data) { try { this.buffers[slot] = await this.ctx.decodeAudioData(data.buf.slice(0)); this.names[slot] = data.name; } catch { /* ugyldig fil */ } }
    }
  }

  async setFile(slot, file) {
    const buf = await file.arrayBuffer();
    await idbSet(slot, { name: file.name, buf });
    this.names[slot] = file.name;
    if (this.ctx) this.buffers[slot] = await this.ctx.decodeAudioData(buf.slice(0));
  }

  has(slot) { return !!this.buffers[slot]; }

  // Logg for feilsøking (window.__tpAudio) – viser hva som faktisk ble spilt.
  log(event, extra = {}) {
    try { (window.__tpAudio ??= []).push({ t: Math.round(performance.now()), event, ...extra }); if (window.__tpAudio.length > 200) window.__tpAudio.shift(); } catch { /* ignorer */ }
  }

  // Tidsstyrte justeringer (f.eks. «demp introen etter 14 s»). Alle annulleres ved neste fase,
  // slik at gamle tidsur aldri kan endre volumet midt i en ny scene.
  later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms); this.timers.add(id); }
  cancelLater() { for (const id of this.timers) clearTimeout(id); this.timers.clear(); }

  // Spill et spor. level = 0–1 relativt til sporets normalnivå. fadeIn i sekunder.
  // restart: start sporet på nytt selv om det allerede spiller. stopAfter: stopp etter n sekunder (med uttoning).
  play(slot, { level = 1, fadeIn = 0.2, from = 0, stopAfter = null, restart = false } = {}) {
    if (!this.enabled || !this.buffers[slot]) { this.log('play-skipped', { slot, enabled: this.enabled, loaded: !!this.buffers[slot] }); return; }
    if (this.playing?.slot === slot && !restart && !stopAfter) { this.level(level, 0.8); return; }
    from = Number.isFinite(from) ? Math.max(0, from) : 0;
    if (stopAfter != null && !(Number.isFinite(stopAfter) && stopAfter > 0)) stopAfter = null;
    this.stop(0.35);
    const buf = this.buffers[slot];
    const startAt = Math.min(SLOTS[slot].offset + from, Math.max(0, buf.duration - 0.5));
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    const target = SLOTS[slot].gain * level;
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(target, t + Math.max(0.02, fadeIn));
    src.connect(gain).connect(this.master);
    src.start(t, startAt);
    if (stopAfter) {
      const fade = Math.min(0.6, stopAfter / 3);
      gain.gain.setValueAtTime(target, t + stopAfter - fade);
      gain.gain.linearRampToValueAtTime(0.0001, t + stopAfter);
      src.stop(t + stopAfter + 0.05);
    }
    const p = { slot, src, gain, level };
    src.onended = () => { if (this.playing === p) this.playing = null; };
    this.playing = p;
    this.log('play', { slot, level, from: +startAt.toFixed(2), stopAfter: stopAfter && +stopAfter.toFixed(2) });
  }

  level(level, seconds = 1) {
    if (!this.playing || !this.ctx) return;
    const g = this.playing.gain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(SLOTS[this.playing.slot].gain * level, t + seconds);
    this.playing.level = level;
    this.log('level', { slot: this.playing.slot, level });
  }

  stop(seconds = 0.8) {
    if (!this.playing || !this.ctx) return;
    const { src, gain, slot } = this.playing, t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + seconds);
    try { src.stop(t + seconds + 0.05); } catch { /* allerede stoppet */ }
    this.playing = null;
    this.log('stop', { slot });
  }

  // ---- Syntetiske effekter ----
  tone(freq, start, dur, { type = 'sine', vol = 0.25 } = {}) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start); o.stop(start + dur + 0.05);
  }
  ding() { // kakestykke!
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    [[1046.5, 0], [1318.5, 0.09], [1568, 0.18], [2093, 0.27]].forEach(([f, d]) => this.tone(f, t + d, 0.9, { type: 'triangle', vol: 0.22 }));
  }
  buzzer() { // tiden er ute
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    this.tone(110, t, 0.75, { type: 'sawtooth', vol: 0.16 });
    this.tone(116, t, 0.75, { type: 'square', vol: 0.08 });
  }
  reveal() { // fasit
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    [[523.3, 0], [659.3, 0.12], [784, 0.24], [1046.5, 0.36]].forEach(([f, d]) => this.tone(f, t + d, d === 0.36 ? 1.2 : 0.3, { type: 'triangle', vol: 0.2 }));
  }
  fanfare() { // lag presenteres: kort «ta-da» i messing, uten å endre musikkvolumet
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const note = (f, d, len, vol) => {
      const o = this.ctx.createOscillator(), lp = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 2200;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(vol, t + d + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
      o.connect(lp).connect(g).connect(this.master); o.start(t + d); o.stop(t + d + len + 0.05);
    };
    note(392, 0, 0.18, 0.12); note(523.3, 0.16, 0.18, 0.12);
    [523.3, 659.3, 784].forEach((f) => note(f, 0.34, 1.1, 0.1));
    this.log('fanfare');
  }
  whoosh() { // kategori
    if (!this.enabled) return;
    const t = this.ctx.currentTime, len = 0.6;
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / d.length) * Math.PI);
    const src = this.ctx.createBufferSource(); src.buffer = b;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + len);
    const g = this.ctx.createGain(); g.gain.value = 0.35;
    src.connect(f).connect(g).connect(this.master); src.start(t);
  }
}

// Musikk per fase. Kalles én gang per nytt steg (fra kontrollpanelet, umiddelbart ved trykk).
// ctx: { left: sekunder igjen på klokka, duration: klokkas lengde }.
// Grunnregel: musikken ligger som et jevnt teppe under det Agne sier. Volumet hopper ikke opp av seg selv.
export const BED = 0.3; // «teppe»-nivå under tale

export function cue(dir, phase, prev, ctx = {}) {
  dir.cancelLater();
  dir.log('cue', { phase, prev });
  switch (phase) {
    case 'curtain': // tilbake til start: teppet lukkes, musikken tones ut
      dir.stop(1.2);
      break;
    case 'intro':
      dir.play('theme', { level: 1, fadeIn: 0.3, restart: true });
      dir.later(() => { if (dir.playing?.slot === 'theme') dir.level(BED, 3); }, 14000); // «skrus litt ned» når Agne snakker
      break;
    case 'categories':
      // Samme volum som introen: musikken fortsetter uendret.
      if (dir.playing?.slot !== 'theme') dir.play('theme', { level: 1, fadeIn: 1.5, from: 20 });
      break;
    case 'teams': // musikken ligger stødig under, uten egne effektlyder
      if (dir.playing?.slot === 'theme') dir.level(BED, 0.8); else dir.play('theme', { level: BED, fadeIn: 1, from: 20 });
      break;
    case 'prize': // premien: temaet ligger som teppe under, uten egne effektlyder
      if (dir.playing?.slot === 'theme') dir.level(BED, 0.8); else dir.play('theme', { level: BED, fadeIn: 1, from: 20 });
      break;
    case 'rules':
      dir.play('tension', { level: 0.5, fadeIn: 1.2 });
      break;
    case 'finale':
      dir.play('tension', { level: 0.75, fadeIn: 1.2, restart: true });
      break;
    case 'lobby':
      if (dir.playing) dir.level(BED, 1.5);
      break;
    case 'category': // kategorien vises og står til NESTE: «whoosh», musikken dempes under Agne
      dir.whoosh();
      if (dir.playing?.slot === 'tension') dir.level(0.18, 1.5); else dir.stop(1.2);
      break;
    case 'ask':
      if (dir.playing?.slot === 'tension') dir.level(0.18, 1.5); else dir.stop(1.2);
      break;
    case 'question': {
      const duration = Number(ctx.duration) || 20;
      const left = Math.min(duration, Math.max(0.5, Number(ctx.left) || duration));
      dir.play('clock', { level: 1, fadeIn: 0.05, from: duration - left, stopAfter: left, restart: true });
      break;
    }
    case 'reveal':
      dir.stop(0.4);
      dir.reveal();
      break;
    case 'board':
      dir.play('theme', { level: 0.4, fadeIn: 1, from: 30, restart: prev !== 'board' && dir.playing?.slot !== 'theme' });
      break;
    case 'winner':
      dir.play('theme', { level: 1, fadeIn: 0.1, from: 0, restart: true });
      break;
    case 'leaderboard':
      if (dir.playing?.slot === 'theme') dir.level(0.45, 1.5); else dir.play('theme', { level: 0.45, fadeIn: 1, from: 30 });
      break;
    case 'outro':
      if (dir.playing) dir.level(BED, 2); else dir.play('theme', { level: BED, fadeIn: 2, from: 40 });
      break;
    default:
      break;
  }
}
