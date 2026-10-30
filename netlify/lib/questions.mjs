// Spillinnhold. Ligger på serveren (ikke i /public), slik at fasiten ikke kan leses av publikum.
// ⚠️ AI-GENERERT – IKKE VERIFISERT. Spørsmål og fasit er hentet fra manuset til Agne,
// men svaralternativene (feilsvarene) er laget som utkast. Verifiser alle fasiter før kvelden.

export const game = {
  title: 'Trainee Pursuit',
  event: 'Høstbord 2026',
  categories: [
    { id: 'sport', name: 'Sport og fritid', color: '#E96F3A' },
    { id: 'geo', name: 'Geografi', color: '#65BFC1' },
    { id: 'hist', name: 'Historie', color: '#F4B942' },
    { id: 'und', name: 'Underholdning', color: '#D978A1' },
    { id: 'kunst', name: 'Kunst og litteratur', color: '#9A83BD' },
    { id: 'natur', name: 'Naturfag', color: '#83C994' },
  ],
  // Lagene på scenen (kakene)
  teams: [
    { id: 'trainee', name: 'Traineene' },
    { id: 'alumni', name: 'Alumni' },
    { id: 'bedrift', name: 'Medlemsbedriftene' },
  ],
  // Gruppene publikum velger mellom (statistikk per gruppe)
  groups: [
    { id: 'trainee', name: 'Trainee' },
    { id: 'alumni', name: 'Alumni' },
    { id: 'bedrift', name: 'Medlemsbedrift' },
  ],
  duration: 20, // sekunder per spørsmål
  prize: '1 000 000', // lagene spiller om MULIGHETEN til å vinne dette beløpet (kr)
  audienceInFinale: true, // false = bare lagene svarer i finalen (mobilene viser «Nå svarer bare lagene»)
};

// type 'mc' = fire alternativer (answer = indeks 0–3)
// type 'number' = tallsvar, nærmest vinner (finalen)
export const questions = [
  {
    id: 'r1-sport', round: 'Runde 1', cat: 'sport', type: 'mc',
    lead: 'Kveldens første spørsmål handler om løping.', host: 'I OL har lengden på en maraton variert fra 40 km til 42,75 km. Men hva bestemte det internasjonale friidrettsforbundet (IAAF) i 1921 at standardlengden på en maraton skal være? Her vil jeg ha nøyaktig lengde. Dere har 20 sekunder!',
    text: 'Hva bestemte det internasjonale friidrettsforbundet (IAAF) i 1921 at standardlengden på en maraton skal være?',
    options: ['40,000 km', '42,000 km', '42,195 km', '42,750 km'],
    answer: 2,
  },
  {
    id: 'r1-geo', round: 'Runde 1', cat: 'geo', type: 'mc',
    lead: 'Dette spørsmålet handler om vårt fylke.', host: 'I 2020 ble Aust- og Vest-Agder slått sammen til Agder fylke. Hvor mange kommuner har vi i Agder i dag?',
    text: 'Hvor mange kommuner har vi i Agder i dag?',
    options: ['18', '21', '25', '30'],
    answer: 2,
  },
  {
    id: 'r1-hist', round: 'Runde 1', cat: 'hist', type: 'mc',
    lead: 'Vi skrur tiden både tilbake og fremover!', host: 'Et kjent historisk slag regnes som en milepæl for samlingen av Norge. I hvilket år skal Norge feire 1000 år på grunn av dette slaget?',
    text: 'I hvilket år skal Norge feire 1000 år for slaget som regnes som en milepæl for samlingen av Norge?',
    options: ['2028', '2030', '2032', '2036'],
    answer: 1,
  },
  {
    id: 'r1-und', round: 'Runde 1', cat: 'und', type: 'mc',
    lead: 'Vi er nå halvveis i spørsmålene, og vi skal videre til glitter og glam.', host: 'Norge har vunnet Eurovision Song Contest tre ganger. Hvilken sang vant Norge med den første gangen?',
    text: 'Hvilken sang vant Norge Eurovision Song Contest med den første gangen?',
    options: ['«Nocturne» – Secret Garden', '«La det swinge» – Bobbysocks', '«Fairytale» – Alexander Rybak', '«Voi Voi» – Nora Brockstedt'],
    answer: 1,
  },
  {
    id: 'r1-kunst', round: 'Runde 1', cat: 'kunst', type: 'mc',
    lead: 'Nest siste runde!', host: 'Denne norske forfatteren er mest kjent for sine dikt og skuespill, men han var også apotekerlærling i Grimstad. Hva het han?',
    text: 'Denne norske forfatteren er mest kjent for sine dikt og skuespill, men han var også apotekerlærling i Grimstad. Hva het han?',
    options: ['Bjørnstjerne Bjørnson', 'Knut Hamsun', 'Henrik Wergeland', 'Henrik Ibsen'],
    answer: 3,
  },
  {
    id: 'r1-natur', round: 'Runde 1', cat: 'natur', type: 'mc',
    lead: 'Siste spørsmål i første runde handler om kroppen.', host: 'Vi kan få det fra tran, men kroppen kan også produsere det selv når huden får sollys. Hvilket vitamin snakker vi om?',
    text: 'Vi kan få det fra tran, men kroppen kan også produsere det selv når huden får sollys. Hvilket vitamin snakker vi om?',
    options: ['A-vitamin', 'B12-vitamin', 'C-vitamin', 'D-vitamin'],
    answer: 3,
  },
  {
    id: 'f-sport', round: 'Finale', cat: 'sport', type: 'number',
    lead: 'Vi starter med Sport og fritid.', host: 'Idrettsklubben Start har ikke hatt noen særlig gode prestasjoner i Eliteserien denne sesongen. I hvilket år ble klubben stiftet?',
    text: 'I hvilket år ble IK Start stiftet?',
    unit: 'årstall', answer: 1905,
  },
  {
    id: 'f-geo', round: 'Finale', cat: 'geo', type: 'number',
    lead: 'Vi fortsetter til Geografi.', host: 'Ved Lindesnes fyr står et skilt som viser avstanden til Nordkapp. Hvor mange kilometer står det på skiltet?',
    text: 'Ved Lindesnes fyr står et skilt som viser avstanden til Nordkapp. Hvor mange kilometer står det på skiltet?',
    unit: 'km', answer: 2518,
  },
  {
    id: 'f-hist', round: 'Finale', cat: 'hist', type: 'number',
    lead: 'Vi fortsetter til Historie.', host: 'Våren 1814 samlet menn fra hele landet seg på Eidsvoll for å skrive Norges grunnlov. Hvor mange eidsvollsmenn var det?',
    text: 'Hvor mange eidsvollsmenn var det i 1814?',
    unit: 'personer', answer: 112,
  },
  {
    id: 'f-und', round: 'Finale', cat: 'und', type: 'number',
    lead: 'Vi fortsetter med Underholdning.', host: 'Bandet Queen brøt alle regler for hvor lang en radiolåt skulle være. Hvor lang er «Bohemian Rhapsody»? Svar i sekunder.',
    text: 'Hvor lang er «Bohemian Rhapsody»? Svar i sekunder.',
    unit: 'sekunder', answer: 355, answerLabel: '5:55 (355 sekunder)',
  },
  {
    id: 'f-kunst', round: 'Finale', cat: 'kunst', type: 'number',
    lead: 'Nest siste kategori, Kunst og litteratur.', host: 'Han komponerte over 600 verk og regnes som et geni i musikkverdenen. Hvor gammel var Mozart da han døde?',
    text: 'Hvor gammel var Mozart da han døde?',
    unit: 'år', answer: 35,
  },
  {
    id: 'f-natur', round: 'Finale', cat: 'natur', type: 'number',
    lead: 'Vi går til siste spørsmål.', host: 'Det periodiske systemet henger på veggen i alle klasserom for naturfag. Hvor mange grunnstoffer er offisielt godkjent i dag?',
    text: 'Hvor mange grunnstoffer er offisielt godkjent i det periodiske systemet i dag?',
    unit: 'grunnstoffer', answer: 118,
  },
];
