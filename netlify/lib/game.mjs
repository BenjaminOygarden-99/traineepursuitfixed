import { game, questions } from './questions.mjs';
import { getGameStore } from './store.mjs';
import { plan } from './show.mjs';

const STATE_KEY = 'state';
const SCORES_KEY = 'scores';
const NICK_MAX = 20;
const GRACE_MS = 1500; // slingringsmonn for nettverksforsinkelse etter at tiden er ute

// ---------- hjelpere ----------
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
const fail = (status, message) => json({ error: message }, status);

const cleanNick = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NICK_MAX);
const median = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round(((a[m - 1] + a[m]) / 2) * 10) / 10;
};
const answerLabel = (q) => q.answerLabel ?? (q.type === 'mc' ? q.options[q.answer] : String(q.answer));

function initialState() {
  return {
    phase: 'curtain', // curtain (teppet lukket, før showet) | intro | categories | teams | rules | lobby | ask | category | question | reveal | board | finale | winner | leaderboard | outro
    step: -1, // posisjon i showmanuset (show.mjs)
    teamsShown: 0,
    awards: {}, // qid -> lag som fikk kakestykke på akkurat dette spørsmålet
    tie: false,
    musicStop: 0,
    qIndex: -1,
    openedAt: null,
    deadline: null,
    cakes: Object.fromEntries(game.teams.map((t) => [t.id, []])),
    reveal: null,
    leaderboard: null,
    winner: null,
    rev: 0,
  };
}

async function loadState(store) {
  return (await store.get(STATE_KEY, { type: 'json' })) ?? initialState();
}
async function saveState(store, s) {
  s.rev = (s.rev || 0) + 1;
  await store.setJSON(STATE_KEY, s);
  return s;
}

async function countPlayers(store) {
  const { blobs } = await store.list({ prefix: 'p/' });
  const counts = Object.fromEntries(game.groups.map((g) => [g.id, 0]));
  for (const b of blobs) {
    const g = b.key.split('/')[1];
    if (g in counts) counts[g]++;
  }
  return counts;
}
async function countAnswers(store, qid) {
  const { blobs } = await store.list({ prefix: `a/${qid}/` });
  return blobs.length;
}

function publicQuestion(q, index, phase) {
  const base = { id: q.id, n: index + 1, round: q.round, cat: q.cat, inRound: questions.filter((x) => x.round === q.round).indexOf(q) + 1, roundSize: questions.filter((x) => x.round === q.round).length };
  if (phase === 'category') return base;
  return { ...base, type: q.type, text: q.text, options: q.options ?? null, unit: q.unit ?? null };
}

function fullCakes(cakes) {
  return game.teams.filter((t) => (cakes[t.id] ?? []).length >= game.categories.length).map((t) => t.id);
}

// ---------- offentlig tilstand ----------
async function publicState(store) {
  const s = await loadState(store);
  const q = questions[s.qIndex];
  const out = {
    phase: s.phase,
    rev: s.rev,
    serverNow: Date.now(),
    game,
    totalQuestions: questions.length,
    cakes: s.cakes,
    winner: s.winner,
    step: s.step ?? -1,
    totalSteps: plan.length,
    teamsShown: s.teamsShown ?? 0,
    tie: !!s.tie,
    musicStop: s.musicStop ?? 0,
    awards: q ? (s.awards?.[q.id] ?? []) : [],
    players: await countPlayers(store),
  };
  if (q && ['ask', 'category', 'question', 'reveal'].includes(s.phase)) {
    out.question = publicQuestion(q, s.qIndex, s.phase);
    out.audienceOpen = q.round !== 'Finale' || game.audienceInFinale !== false;
    if (s.phase === 'ask') out.duration = game.duration;
    if (s.phase !== 'category' && s.phase !== 'ask') {
      out.duration = game.duration;
      out.deadline = s.deadline;
      out.answers = await countAnswers(store, q.id);
    }
    if (s.phase === 'reveal') out.reveal = s.reveal;
  }
  if (s.phase === 'leaderboard') out.leaderboard = s.leaderboard;
  return out;
}

// ---------- publikum ----------
async function join(store, body) {
  const nick = cleanNick(body.nick);
  if (!nick) return fail(400, 'Skriv inn et kallenavn.');
  if (!game.groups.some((g) => g.id === body.group)) return fail(400, 'Velg hvilken gruppe du hører til.');
  const id = crypto.randomUUID();
  await store.setJSON(`p/${body.group}/${id}`, { nick, joinedAt: Date.now() });
  return json({ id, nick, group: body.group });
}

async function answer(store, body) {
  const s = await loadState(store);
  const q = questions[s.qIndex];
  if (s.phase !== 'question' || !q || q.id !== body.qid) return fail(409, 'Spørsmålet er ikke åpent lenger.');
  if (Date.now() > s.deadline + GRACE_MS) return fail(409, 'Tiden er ute.');
  if (q.round === 'Finale' && game.audienceInFinale === false) return fail(409, 'I finalen svarer bare lagene.');
  const { id, group } = body;
  if (typeof id !== 'string' || !game.groups.some((g) => g.id === group)) return fail(400, 'Ugyldig spiller.');
  const player = await store.get(`p/${group}/${id}`, { type: 'json' });
  if (!player) return fail(403, 'Fant deg ikke. Bli med på nytt.');
  const key = `a/${q.id}/${group}/${id}`;
  if (await store.get(key)) return fail(409, 'Du har allerede svart.');

  let payload;
  if (q.type === 'mc') {
    const c = Number(body.choice);
    if (!Number.isInteger(c) || c < 0 || c >= q.options.length) return fail(400, 'Ugyldig svar.');
    payload = { choice: c };
  } else {
    const v = Number(String(body.value ?? '').replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(v)) return fail(400, 'Skriv inn et tall.');
    payload = { value: v };
  }
  await store.setJSON(key, { ...payload, t: Date.now(), nick: player.nick });
  return json({ ok: true });
}

async function me(store, url) {
  const id = url.searchParams.get('id');
  const scores = (await store.get(SCORES_KEY, { type: 'json' })) ?? {};
  const s = await loadState(store);
  const q = questions[s.qIndex];
  const p = scores[id];
  const ranked = Object.entries(scores).sort((a, b) => b[1].total - a[1].total);
  const rank = p ? ranked.findIndex(([k]) => k === id) + 1 : null;
  return json({
    total: p?.total ?? 0,
    rank,
    of: ranked.length,
    last: q && p?.results?.[q.id] ? p.results[q.id] : null,
  });
}

// ---------- fasit og poeng ----------
async function computeReveal(store, s) {
  const q = questions[s.qIndex];
  const { blobs } = await store.list({ prefix: `a/${q.id}/` });
  const answers = (
    await Promise.all(
      blobs.map(async (b) => {
        const [, , group, id] = b.key.split('/');
        const v = await store.get(b.key, { type: 'json' });
        return v && { ...v, group, id };
      }),
    )
  ).filter(Boolean);

  const scores = (await store.get(SCORES_KEY, { type: 'json' })) ?? {};
  const stats = Object.fromEntries(game.groups.map((g) => [g.id, { n: 0, correct: 0, values: [] }]));
  const dist = q.type === 'mc' ? q.options.map(() => 0) : null;
  const span = Math.max(1, s.deadline - s.openedAt);
  let fastest = null;
  let closest = null;

  for (const a of answers) {
    const st = stats[a.group];
    if (!st) continue;
    st.n++;
    let correct = false;
    let points = 0;
    if (q.type === 'mc') {
      dist[a.choice]++;
      correct = a.choice === q.answer;
      if (correct) {
        const frac = Math.min(1, Math.max(0, (a.t - s.openedAt) / span));
        points = Math.round(500 + 500 * (1 - frac)); // raskere = flere poeng
        if (!fastest || a.t < fastest.t) fastest = { nick: a.nick, t: a.t };
      }
    } else {
      const diff = Math.abs(a.value - q.answer);
      const rel = diff / Math.abs(q.answer || 1);
      correct = rel <= 0.05;
      points = rel <= 0.01 ? 1000 : rel <= 0.05 ? 700 : rel <= 0.15 ? 300 : 0;
      st.values.push(a.value);
      if (!closest || diff < closest.diff || (diff === closest.diff && a.t < closest.t)) {
        closest = { nick: a.nick, value: a.value, diff, t: a.t };
      }
    }
    if (correct) st.correct++;
    const p = (scores[a.id] ??= { nick: a.nick, group: a.group, results: {}, total: 0 });
    p.results[q.id] = { points, correct };
    p.total = Object.values(p.results).reduce((sum, r) => sum + r.points, 0);
  }
  await store.setJSON(SCORES_KEY, scores);

  return {
    qid: q.id,
    answer: q.answer,
    answerLabel: answerLabel(q),
    unit: q.unit ?? null,
    total: answers.length,
    dist,
    stats: Object.fromEntries(
      Object.entries(stats).map(([g, st]) => [
        g,
        {
          n: st.n,
          correct: st.correct,
          pct: st.n ? Math.round((100 * st.correct) / st.n) : null,
          median: st.values.length ? median(st.values) : null,
        },
      ]),
    ),
    fastest: fastest && { nick: fastest.nick, seconds: Math.round(((fastest.t - s.openedAt) / 1000) * 10) / 10 },
    closest: closest && { nick: closest.nick, value: closest.value },
  };
}

async function topList(store, n) {
  const scores = (await store.get(SCORES_KEY, { type: 'json' })) ?? {};
  return Object.entries(scores)
    .map(([id, p]) => ({ id, nick: p.nick, group: p.group, total: p.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}


// ---------- showmanuset ----------
function leaders(cakes) {
  const counts = game.teams.map((t) => ({ id: t.id, n: (cakes[t.id] ?? []).length }));
  const top = Math.max(...counts.map((c) => c.n));
  return counts.filter((c) => c.n === top && top > 0).map((c) => c.id);
}

async function applyStep(store, s, index) {
  if (index === -1) { // tilbake til start: teppet lukket, ingenting kjører
    Object.assign(s, { step: -1, phase: 'curtain', tie: false, teamsShown: 0 });
    return true;
  }
  const step = plan[index];
  if (!step) return false;
  s.step = index;
  s.tie = false;
  switch (step.type) {
    case 'teams':
      s.phase = 'teams';
      s.teamsShown = step.n;
      break;
    case 'category':
      Object.assign(s, { phase: 'category', qIndex: step.qIndex, openedAt: null, deadline: null, reveal: null });
      break;
    case 'ask':
      Object.assign(s, { phase: 'ask', qIndex: step.qIndex, openedAt: null, deadline: null, reveal: null });
      break;
    case 'question': {
      const now = Date.now();
      Object.assign(s, { phase: 'question', qIndex: step.qIndex, openedAt: now, deadline: now + game.duration * 1000, reveal: null });
      break;
    }
    case 'reveal':
      s.qIndex = step.qIndex;
      if (!s.openedAt) { s.openedAt = Date.now(); s.deadline = s.openedAt; }
      s.reveal = await computeReveal(store, s);
      s.phase = 'reveal';
      break;
    case 'winner': {
      const l = leaders(s.cakes);
      if (l.length === 1) { s.winner = l[0]; s.phase = 'winner'; }
      else { s.winner = null; s.tie = true; s.phase = 'board'; }
      break;
    }
    case 'leaderboard':
      s.leaderboard = await topList(store, 5);
      s.phase = 'leaderboard';
      break;
    default:
      s.phase = step.type; // intro, categories, rules, lobby, board, finale, outro
  }
  return true;
}

// Neste steg. Har et lag full kake etter en fasit, hopper showet rett til vinnerkåringen.
function nextIndex(s) {
  const cur = plan[s.step];
  if (cur?.type === 'reveal' && fullCakes(s.cakes).length > 0) return plan.findIndex((x) => x.type === 'winner');
  if (cur?.type === 'winner' && s.tie) return s.step; // venter på at noen kårer vinneren manuelt
  return Math.min(plan.length - 1, (s.step ?? -1) + 1);
}

// ---------- kontrollpanel ----------
function checkPin(req) {
  const expected = process.env.ADMIN_PIN;
  if (!expected) return 'ADMIN_PIN er ikke satt på serveren. Legg den inn som miljøvariabel i Netlify.';
  if (req.headers.get('x-admin-pin') !== expected) return 'Feil PIN.';
  return null;
}

async function admin(store, req, body) {
  const pinError = checkPin(req);
  if (pinError) return fail(401, pinError);
  const s = await loadState(store);
  const q = questions[s.qIndex];

  switch (body.action) {
    case 'state':
      break;
    case 'next': {
      if (body.expectStep != null && body.expectStep !== (s.step ?? -1)) break; // dobbelttrykk: ignorer
      const to = nextIndex(s);
      if (to === s.step && plan[to]?.type === 'winner') return fail(409, 'Uavgjort: velg vinneren under «Avansert».');
      await applyStep(store, s, to);
      await saveState(store, s);
      break;
    }
    case 'prev':
      if ((s.step ?? -1) < 0) break; // fra introen går «tilbake» til lukket teppe
      await applyStep(store, s, s.step - 1);
      await saveState(store, s);
      break;
    case 'goto':
      if (!(await applyStep(store, s, Number(body.step)))) return fail(400, 'Ukjent steg.');
      await saveState(store, s);
      break;
    case 'award': {
      // Gi/ta bort kakestykket for spørsmålet som vises nå. Rører aldri stykker vunnet tidligere.
      if (!q) return fail(400, 'Ingen spørsmål er aktivt.');
      const team = body.team;
      if (!s.cakes[team]) return fail(400, 'Ukjent lag.');
      s.awards ??= {};
      const list = new Set(s.awards[q.id] ?? []);
      const has = s.cakes[team].includes(q.cat);
      if (body.on) {
        if (has && !list.has(team)) return fail(409, `${game.teams.find((t) => t.id === team).name} har allerede dette kakestykket.`);
        list.add(team);
        if (!has) s.cakes[team] = game.categories.map((c) => c.id).filter((id) => id === q.cat || s.cakes[team].includes(id));
      } else if (list.has(team)) {
        list.delete(team);
        s.cakes[team] = s.cakes[team].filter((id) => id !== q.cat);
      }
      s.awards[q.id] = [...list];
      await saveState(store, s);
      break;
    }
    case 'musicStop':
      s.musicStop = (s.musicStop ?? 0) + 1;
      await saveState(store, s);
      break;
    case 'lobby':
      s.phase = 'lobby';
      await saveState(store, s);
      break;
    case 'intro':
      s.phase = 'intro';
      await saveState(store, s);
      break;
    case 'category': {
      const i = Number(body.qIndex);
      if (!questions[i]) return fail(400, 'Ukjent spørsmål.');
      Object.assign(s, { phase: 'category', qIndex: i, openedAt: null, deadline: null, reveal: null });
      await saveState(store, s);
      break;
    }
    case 'open': {
      if (!q) return fail(400, 'Velg et spørsmål først.');
      const now = Date.now();
      Object.assign(s, { phase: 'question', openedAt: now, deadline: now + game.duration * 1000, reveal: null });
      await saveState(store, s);
      break;
    }
    case 'reveal':
      if (!q || !s.openedAt) return fail(400, 'Spørsmålet er ikke startet.');
      s.reveal = await computeReveal(store, s);
      s.phase = 'reveal';
      await saveState(store, s);
      break;
    case 'board':
      s.phase = 'board';
      await saveState(store, s);
      break;
    case 'leaderboard':
      s.leaderboard = await topList(store, 5);
      s.phase = 'leaderboard';
      await saveState(store, s);
      break;
    case 'wedge': {
      const { team, cat, on } = body;
      if (!s.cakes[team] || !game.categories.some((c) => c.id === cat)) return fail(400, 'Ukjent lag eller kategori.');
      const set = new Set(s.cakes[team]);
      on ? set.add(cat) : set.delete(cat);
      s.cakes[team] = game.categories.map((c) => c.id).filter((id) => set.has(id));
      await saveState(store, s);
      break;
    }
    case 'winner':
      if (!s.cakes[body.team]) return fail(400, 'Ukjent lag.');
      s.winner = body.team;
      s.tie = false;
      s.phase = 'winner';
      s.step = plan.findIndex((x) => x.type === 'winner');
      await saveState(store, s);
      break;
    case 'kick': {
      const scores = (await store.get(SCORES_KEY, { type: 'json' })) ?? {};
      delete scores[body.id];
      await store.setJSON(SCORES_KEY, scores);
      for (const g of game.groups) await store.delete(`p/${g.id}/${body.id}`);
      if (s.leaderboard) {
        s.leaderboard = s.leaderboard.filter((r) => r.id !== body.id);
        await saveState(store, s);
      }
      break;
    }
    case 'reset': {
      const { blobs } = await store.list();
      const keep = body.keepPlayers ? (k) => k.startsWith('p/') : () => false;
      await Promise.all(blobs.filter((b) => !keep(b.key)).map((b) => store.delete(b.key)));
      await saveState(store, { ...initialState(), rev: s.rev });
      break;
    }
    default:
      return fail(400, 'Ukjent handling.');
  }

  // Etter en endring er `s` allerede den nye tilstanden (nullstilling leses på nytt). Oppslagene kjøres samtidig.
  const fresh = body.action === 'reset' ? await loadState(store) : s;
  const cq = questions[fresh.qIndex];
  const [players, answers, top] = await Promise.all([
    countPlayers(store),
    cq ? countAnswers(store, cq.id) : 0,
    topList(store, 10),
  ]);
  return json({
    state: fresh,
    questions,
    game,
    plan,
    players,
    answers,
    top,
    fullCakes: fullCakes(fresh.cakes),
    serverNow: Date.now(),
  });
}

// ---------- ruter ----------
export async function handle(req) {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, '');
  const store = await getGameStore();
  try {
    if (req.method === 'GET' && route === 'state') {
      // Kort CDN-cache: 110 telefoner gir da ca. ett funksjonskall i sekundet, ikke 110.
      return json(await publicState(store), 200, {
        'cache-control': 'public, max-age=0, must-revalidate',
        'netlify-cdn-cache-control': 'public, s-maxage=1',
      });
    }
    if (req.method === 'GET' && route === 'time') return json({ now: Date.now() }); // ukachet, for klokkesynk
    // Storskjermen: samme tilstand, men uten CDN-cache, så skjermen skifter med en gang.
    if (req.method === 'GET' && route === 'live') return json(await publicState(store));
    if (req.method === 'GET' && route === 'me') return me(store, url);
    if (req.method !== 'POST') return fail(404, 'Ukjent adresse.');
    const body = await req.json().catch(() => ({}));
    if (route === 'join') return join(store, body);
    if (route === 'answer') return answer(store, body);
    if (route === 'admin') return admin(store, req, body);
    return fail(404, 'Ukjent adresse.');
  } catch (e) {
    console.error(e);
    return fail(500, 'Noe gikk galt på serveren. Prøv igjen.');
  }
}
