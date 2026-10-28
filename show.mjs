// Showmanuset: kjørerekkefølgen for kvelden, bygd ut fra spørsmålene.
// Kontrollpanelet trykker bare «Neste». Hvert steg har en tittel (hva skjer på skjermen)
// og en replikk (hva Agne sier), hentet fra manuset.
import { game, questions } from './questions.mjs';

const catName = (id) => game.categories.find((c) => c.id === id)?.name ?? id;

const teamCues = [
  'Det første laget har så vidt blitt varme i trøya i arbeidslivet. Ønsk laget med nåværende traineer hjertelig velkommen opp på scenen! … Velkommen opp hit [navn], [navn] og [navn].',
  'Det neste laget har been there, done that og fullført traineeprogrammet. Men ingen kommer seg helt ut av Trainee Sør. Velkommen til Alumnilaget! … Applaus for [navn], [navn] og [navn].',
  'Til slutt de som tar imot oss traineer, gir oss en pult og et adgangskort. Gi en enorm applaus til Medlemsbedriftene! … Takk for at dere takket ja i kveld, [navn, bedrift], [navn, bedrift] og [navn, bedrift].',
];

export function buildPlan() {
  const steps = [];
  steps.push({ type: 'intro', title: 'Intro: teppet går opp', cue: 'GOD KVELD HØSTBORD 2026! [Vent på applausen] Dette er spillet dere har spilt på hytta, krangla om i juleferien og kanskje aldri helt fullført. Men i kveld skal det fullføres. Velkommen til TRAINEE PURSUIT!' });
  steps.push({ type: 'categories', title: 'De seks kategoriene', cue: 'I kveld skal tre lag kjempe om ære, berømmelse og det aller viktigste: SEIER. Akkurat som i Trivial Pursuit har vi seks kategorier: Sport og fritid, Geografi, Historie, Underholdning, Kunst og litteratur og Naturfag. Riktig svar gir et kakestykke, og laget som først får full kake, vinner. Sammen med meg har jeg min nydelige assistent [navn]!' });
  game.teams.forEach((t, i) => steps.push({ type: 'teams', n: i + 1, title: `Lagene: ${t.name} kommer opp`, cue: teamCues[i] ?? `Velkommen, ${t.name}!` }));
  steps.push({ type: 'rules', title: 'Reglene', cue: 'I hver runde annonserer jeg en kategori, og hvert lag velger hvem som skal svare. Hver person må svare på to kategorier, så tenk strategisk! Dere har 20 sekunder på å skrive svaret på tavla. Når tida er ute, viser dere tavlene, og [assistent] kommer med mikrofonen.' });
  steps.push({ type: 'lobby', title: 'QR-koden: salen blir med', cue: 'Og dere i salen, ikke len dere tilbake! Skann QR-koden og svar på spørsmålene sammen med lagene. Legg inn et kallenavn, og den raskeste med riktig svar vinner en premie! … Er dere klare?' });

  const round1 = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.round !== 'Finale');
  const finale = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.round === 'Finale');
  const addQuestion = ({ q, i }, n, isFinale) => {
    const cat = catName(q.cat);
    steps.push({ type: 'ask', qIndex: i, title: `${isFinale ? 'Finale' : 'Runde 1'} ${n}: ${cat}, spørsmålet vises`, cue: `${n === 1 && !isFinale ? 'Vi starter med kveldens første kategori: ' : ''}${cat}! ${isFinale ? '' : 'Lagene sender frem deltakeren som skal svare. '}${q.lead ?? ''} … ${q.host ?? q.text}` });
    steps.push({ type: 'question', qIndex: i, title: `${cat}: klokka går (${game.duration} s)`, cue: isFinale ? 'Dere kan diskutere i laget. 20 sekunder, nå!' : 'Dere har 20 sekunder, nå! [Jeopardy spiller] … Snu tavlene!' });
    steps.push({ type: 'reveal', qIndex: i, title: `${cat}: fasit og poeng`, cue: isFinale ? 'Hva har lagene svart? [Assistenten går rundt] … Riktig svar er [fasit], som betyr at [lag] var nærmest og får stykket!' : 'Hva har lagene svart? [Assistenten går rundt med mikrofonen] … Riktig svar er [fasit]. Raskest i salen var [kallenavn]!' });
  };
  round1.forEach((x, k) => addQuestion(x, k + 1, false));
  steps.push({ type: 'board', title: 'Stillingen etter første runde', cue: `${round1.length} runder er spilt, la oss se på kakene! … Ingen har full kake ennå, og det betyr bare én ting: vi går inn i FINALERUNDEN!` });
  steps.push({ type: 'finale', title: 'Finalerunden: nærmest vinner', cue: 'I finalerunden er det laget som er nærmest svaret som vinner kakestykket. Dere trenger ikke vite svaret, bare gjette best. Lagene kan diskutere og har fortsatt 20 sekunder. Vi fortsetter til et lag har full kake!' });
  finale.forEach((x, k) => addQuestion(x, k + 1, true));
  steps.push({ type: 'winner', title: 'Vinneren kåres', cue: 'Mine damer og herrer, vi har en vinner! Med full kake og evig ære er vinneren av Trainee Pursuit 2026 … [LAG]! Og til de to andre lagene: dere var fantastiske! Gi en stor applaus til alle tre lagene!' });
  steps.push({ type: 'leaderboard', title: 'Topp 5 i salen', cue: 'Og i salen: her er de skarpeste av dere! [Del ut premie]' });
  steps.push({ type: 'outro', title: 'Takk for i kveld', cue: 'Takk til min kjære assistent, og takk for meg! Nå gir jeg ordet tilbake til konferansierene, som byr på noe jeg tror dere har ventet på hele kvelden …' });
  return steps;
}

export const plan = buildPlan();
export const stepIndex = (type) => plan.findIndex((s) => s.type === type);
