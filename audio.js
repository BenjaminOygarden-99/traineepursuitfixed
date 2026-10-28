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
    this.playing = null; // { slot, src, gain }
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
    await this.loadAll();
    return this.enabled;
  }

  async loadAll() {
    for (const slot of Object.keys(SLOTS)) {
      if (this.buffers[slot]) continue;
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

  async setFile(slot, file) {
    const buf = await file.arrayBuffer();
    await idbSet(slot, { name: file.name, buf });
    this.names[slot] = file.name;
    if (this.ctx) this.buffers[slot] = await this.ctx.decodeAudioData(buf.slice(0));
  }

  has(slot) { return !!this.buffers[slot]; }

  // Spill et spor. level = 0–1 relativt til sporets normalnivå. fadeIn i sekunder.
  play(slot, { level = 1, fadeIn = 0.2, from = 0, stopAfter = null } = {}) {
    if (!this.enabled || !this.buffers[slot]) return;
    if (this.playing?.slot === slot && !stopAfter) { this.level(level, 0.8); return; }
    this.stop(0.6);
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers[slot];
    const gain = this.ctx.createGain();
    const target = SLOTS[slot].gain * level;
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(target, t + Math.max(0.02, fadeIn));
    src.connect(gain).connect(this.master);
    src.start(t, SLOTS[slot].offset + from);
    if (stopAfter) {
      gain.gain.setValueAtTime(target, t + stopAfter - 0.8);
      gain.gain.linearRampToValueAtTime(0.0001, t + stopAfter);
      src.stop(t + stopAfter + 0.05);
    }
    const p = { slot, src, gain };
    src.onended = () => { if (this.playing === p) this.playing = null; };
    this.playing = p;
  }

  level(level, seconds = 1) {
    if (!this.playing || !this.ctx) return;
    const g = this.playing.gain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(SLOTS[this.playing.slot].gain * level, t + seconds);
  }

  stop(seconds = 0.8) {
    if (!this.playing || !this.ctx) return;
    const { src, gain } = this.playing, t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + seconds);
    try { src.stop(t + seconds + 0.05); } catch { /* allerede stoppet */ }
    this.playing = null;
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

// Musikk per fase. prev = forrige fase. Kalles bare når fasen (eller steget) endres.
export function cue(dir, phase, prev, st) {
  switch (phase) {
    case 'intro':
      dir.play('theme', { level: 1, fadeIn: 0.3 });
      setTimeout(() => { if (dir.playing?.slot === 'theme') dir.level(0.35, 3); }, 14000); // «skrus litt ned» når Agne snakker
      break;
    case 'categories':
      if (dir.playing?.slot === 'theme') dir.level(0.3, 1.5); else dir.play('theme', { level: 0.3, fadeIn: 1.5, from: 20 });
      break;
    case 'teams': // [Musikk] [Applaus] for hvert lag
      if (dir.playing?.slot === 'theme') { dir.level(1, 0.3); setTimeout(() => dir.level(0.3, 2), 5000); }
      else { dir.play('theme', { level: 1, fadeIn: 0.2, from: 4 }); setTimeout(() => dir.level(0.3, 2), 5000); }
      break;
    case 'rules':
    case 'finale':
      dir.play('tension', { level: phase === 'finale' ? 0.75 : 0.5, fadeIn: 1.2 });
      break;
    case 'lobby':
      if (dir.playing) dir.level(0.3, 1.5);
      break;
    case 'ask':
      dir.whoosh();
      if (dir.playing?.slot === 'tension') dir.level(0.18, 1.5); else dir.stop(1.2);
      break;
    case 'question': {
      const left = Math.max(1, st._left ?? (st.deadline - Date.now()) / 1000);
      dir.play('clock', { level: 1, fadeIn: 0.05, from: Math.max(0, st.duration - left), stopAfter: left });
      break;
    }
    case 'reveal':
      dir.stop(0.4);
      dir.reveal();
      break;
    case 'board':
      dir.play('theme', { level: 0.4, fadeIn: 1, from: 30 });
      break;
    case 'winner':
      dir.play('theme', { level: 1, fadeIn: 0.1, from: 0 });
      break;
    case 'leaderboard':
      if (dir.playing?.slot === 'theme') dir.level(0.45, 1.5); else dir.play('theme', { level: 0.45, fadeIn: 1, from: 30 });
      break;
    case 'outro':
      if (dir.playing) dir.level(0.3, 2); else dir.play('theme', { level: 0.3, fadeIn: 2, from: 40 });
      break;
    default:
      break;
  }
}
