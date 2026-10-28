# Changelog

## 0.4.1: Feilrettinger

- **Mobil:** Personverntekst og plassholder i kallenavnfeltet er fjernet. Teksten havnet bak Netlify-merket og var uleselig.
- **Kontrollpanel:** Manuslisten («Hopp til steg») beholder nå rulleposisjonen når panelet oppdateres hvert andre sekund. Før hoppet den til toppen.
- **Lyd:** Lydoppsett og avspilling er flyttet fra storskjermen til kontrollpanelet («Lyd og musikk»). Storskjermen viser aldri lydoppsett. Lyden spilles fra enheten som kjører kontrollpanelet. NESTE-trykket aktiverer lyden, og summer og pling spilles også derfra.
- **Innlogging:** PIN-feltet kunne bli tømt mens man skrev, hvis lydfilene ble lastet inn samtidig. Det ga «Feil PIN». Innloggingen tegnes ikke lenger på nytt mens man skriver.
- **Klokke:** Ny klokkesynk mot et ukachet endepunkt (`GET /api/time`, flere målinger, kortest rundtur vinner), i stedet for tiden i den CDN-cachede tilstanden. Den kunne være opptil 1 s gammel og fikk klokka til å hoppe og gå opp. Nedtellingen kan aldri gå oppover for samme frist. Storskjermen oppdaterer klokka per skjermbilde (requestAnimationFrame), og mobilen og panelet hver 100–200 ms. Testet: 20 sekundskift med 956–1030 ms mellomrom og ingen hopp oppover, også med simulert 0–1 s gammel servertid.


## 0.4.0: Showkjøring med én knapp + musikk

### Ny funksjon
- **Showmanus** (`netlify/lib/show.mjs`): hele kvelden som en steg-liste (48 steg) bygd ut fra spørsmålene og Agnes manus: intro, kategoriene, de tre lagene, regler, QR, 6 × (spørsmål vises, klokke, fasit), stillingen, finaleintro, 6 × finale, vinner, topp 5 og avslutning.
- **Kontrollpanel med én NESTE-knapp.** Panelet viser hva som står på storskjermen, Agnes replikk (med fasit og kallenavn fylt inn), fasiten og hva som kommer. Etter hver fasit trykker du bare på laget som fikk poeng. Presentasjonsklikker støttes.
- **Automatikk:** Kakestykket gis for riktig kategori. Med full kake hopper showet til vinneren, og etter siste spørsmål kåres laget med flest stykker. Uavgjort blir varslet. Dobbelttrykk på NESTE ignoreres.
- **Nye scener på storskjermen:** seks kategorier, kveldens lag (avsløres ett og ett), «Slik spiller vi», kategori-innslag før hvert spørsmål, «Snu tavlene!» når tiden er ute, kakestykke-banner, «Finalen», «Uavgjort!» og «Takk for i kveld».
- **Musikkregissør** (`public/audio.js`): tre spor lastes inn lokalt på storskjerm-PC-en, med musikk tilpasset hver fase og syntetiske lydeffekter.
- Mobilen har fått egne tilstander for de nye fasene. Når spørsmålet vises, kommer svarknappene først når klokka starter.
- Valgfritt: `audienceInFinale: false` i `questions.mjs` gjør at bare lagene svarer i finalen.

### Endret
- Svaralternativene vises ikke lenger på storskjermen mens klokka går (lagene skal svare fritt). De vises ved fasit.
- Spilleklokka tegnes én gang og oppdaterer bare pærer og tall. Det fjerner flimringen under nedtellingen. De siste fem sekundene lyser pærene korallrødt.
- Oppbindingene på sceneteppet (de gule rektanglene) er fjernet.
- Introen har «Let the games begin!» under skiltet.

### API
Nye admin-handlinger: `next`, `prev`, `goto`, `award` og `musicStop`. Alle tidligere handlinger virker som før.


## 0.3.0: «Retro TV Game Show»

En visuell overhaling som erstatter neon- og glass-uttrykket fra 0.2.0 med et fysisk TV-studio fra 1988, forsiktig digitalisert. Spillflyt, API, lagring, poeng, `ADMIN_PIN`, `netlify.toml` og alle ID-er og hooks er uendret.

### Signaturelementet: Pursuit-skiltet
- Et fysisk skilt med tykt gullbånd, kremkant, mørk petrol innside med prikkraster og varme lyspærer langs hele kanten. Teksten er TRAINEE PURSUIT i chunky, skråstilt skiltskrift med kontur og ekstrudert gull- og oransjeskygge.
- Skiltet brukes stort på introen og velkomstskjermen, og i små versjoner på spørsmålsskjermen, mobilen og kontrollpanelet. Den samme byggeklossen rammer inn vinnerlaget.

### Storskjermen
- **Studio:** sceneteppe med folder og gullbånd, kappe med buet kant, en bakvegg av store lyspærer, varme spotlights og en lyspære-ramme rundt hele scenen. Pærene har litt ulik lysstyrke, og noen få «puster» svakt. Ingen konstant blinking.
- **Intro:** teppet går opp, skiltet faller ned på scenen, pærene tennes i sekvens rundt skiltet og deretter rammen, og til slutt kommer platen «Høstbord 2026».
- **Velkomst:** skiltet og antall påmeldte med mekaniske tavlesifre til venstre. Til høyre et fysisk panel med stor QR-kode (sort på hvitt) og adresse.
- **Kategori:** spillbrikke med det aktuelle stykket og et stort kategoriskilt.
- **Spørsmål:** spørsmålsbrett med nagler og gullramme. Spilleklokka er en gullring med én lyspære per sekund som slukker etter hvert. Svarene er fysiske knapper med «leppe» og bokstavmedaljong.
- **Fasit:** riktig svar blir en gul knapp med lyspærer rundt. Hver gruppe får en resultattavle med tavlesifre og ti lamper, og gruppen med høyest andel riktige får lyspærer.
- **Stillingen:** spillbrikker i plast med podieskilt (tavlesifre «3/6»), og lyspærer rundt lederlaget.
- **Toppliste og vinner:** resultattavle med medaljonger, og vinnerlaget i eget lyspæreskilt.

### Mobil og kontrollpanel
- Mobil: lite skilt i toppen, kremfarget innskrivingsfelt, fysiske valgknapper (gule når valgt), stor gul «BLI MED»-knapp, spørsmålsbrett med liten klokke, svarknapper med leppe og tilstanden «Sender …», og poeng med tavlesifre.
- Kontrollpanel («Kontrollrom»): rolig og tett. Gul primærknapp («2. Start»), rød «PÅ STORSKJERMEN»-lampe, røde destruktive knapper, og kakestykker som runde lamper i en resultattavle.

### Filer
| Fil | Endring |
|---|---|
| `public/shared.css` | Nytt designsystem: palett, skiltskrift, skilt, plater, nagle-paneler, tavlesifre, lyspærer, kategoriskilt og kakebrikke |
| `public/shared.js` | Nye `pursuitSign()`, `bulbFrame()` og `flap()`. `cakeSVG()` er tegnet om som en spillbrikke. Signaturene er bakoverkompatible. |
| `public/skjerm.html` | Studio og alle visninger tegnet om. Logikken er uendret. |
| `public/index.html` | Ny stil og små markup-endringer (skilt, medaljonger, tavlesifre). Logikken er uendret. |
| `public/kontroll.html` | Ny stil og små markup-endringer (skilt, tavlesifre). Logikken er uendret. |
| `netlify/lib/questions.mjs` | Kategorifarger i retro-paletten. Spørsmålene er uendret. |

### Kontrollert lokalt (110 simulerte publikummere)
Alle tre sidene laster uten JavaScript-feil. Innlogging med PIN, intro, kategori, start, svar, fasit, kakestykker, stilling, toppliste, vinner og nullstilling fungerer. Dobbeltsvar og sene svar avvises. Ingen horisontal overflyt på 320 px og 390 px (mobil) eller 390 px og 820 px (kontrollpanel). Storskjermen skaleres i 1920×1080 og 1440×900.


## 0.2.0: Visuell overhaling «Trainee Game Show» + intro

Samme app og samme spillflyt, med ny visuell identitet. API-kontrakter, spillogikk, lagring, poeng, `ADMIN_PIN`-flyten og `netlify.toml` er uendret, bortsett fra det som er nevnt under «Ny funksjon».

### Ny funksjon
- **Intro før showet.** Ny fase `intro`: Knappen «Spill intro» i kontrollpanelet tenner en neon-logo for Trainee Pursuit på storskjermen (stjernestøv, lyskjegler som sveiper inn, neonrør og lyspærer som slås på). Mobilene viser «Showet starter!». Musikken spilles separat fra teknisk-PC-en.
  - `netlify/lib/game.mjs`: ny admin-handling `intro` (setter `phase: 'intro'`). Ingen andre endringer i API-et.

### Endrede filer
| Fil | Hva |
|---|---|
| `public/shared.css` | Nytt designsystem: mørk petrol/mint-palett, lokale fonter, ordmerke med glød og lysfeie, kategorimerker (kakestykke-ikon i pille), ny kakestil, `prefers-reduced-motion`. |
| `public/shared.js` | `cakeSVG` har fått valgfrie `hub` (tall i midten), `glow` og `fresh` (animerer nyvunne stykker). Den gamle signaturen virker som før. QR tegnes nå sort på hvitt for maksimal kontrast. |
| `public/skjerm.html` | Storskjermen er tegnet om som et digitalt TV-studio: lyskjegler, prikkgitter, perspektivgulv, vignett og lyspære-ramme. Nye visninger for intro, velkomst/QR, kategori, spørsmål (stor sentrert timer, 2×2-svarkort), fasit (riktig svar lyser, andel riktige per gruppe), stilling (store kaker med spotlight, tall i midten og fargeforklaring), toppliste og vinner. Polling, nedtelling og ID-er (`#timer`, `#answers`, `#joined`) er bevart. |
| `public/index.html` | Mobil: liten logo-header, kategori-pille, store svarknapper med fargede bokstaver, tydelige tilstander for «valgt/sender», «registrert», «tiden er ute» og «fasit» med poengkort, pluss ventetilstand for intro. All logikk er uendret. |
| `public/kontroll.html` | Kontrollpanel som «backstage»: rolig petrol, mint primærknapp («2. Start 20 s»), tydelig «på skjermen nå»-markering, destruktive knapper i rosa/rødt, og kakestykker som scoreboard med sum per lag. Knappen «Spill intro» er ny. Fikset overflyt på smal skjerm. |
| `netlify/lib/questions.mjs` | Kategorifargene er justert til den nye paletten (Kunst og litteratur er nå lilla). Spørsmål og fasit er uendret. |
| `netlify/lib/game.mjs` | Handlingen `intro` (se over). |
| `README.md` | Avsnitt om introen og fontmappen. |

### Nye filer
- `public/fonts/*.woff`: TeX Gyre Adventor Bold (tittelfont) og Inter (tekst og tall), lagret lokalt. Ingen avhengighet til Google Fonts. Lisenser ligger ved: GUST Font License og SIL OFL 1.1.
- `CHANGELOG.md`

### Kontrollert før levering (lokalt, med 110 simulerte publikummere)
- Alle sider laster uten JavaScript-feil (storskjerm, mobil, kontrollpanel).
- PIN-innlogging, alle stegknapper (kategori → start → fasit), kakestykker, stilling, toppliste, vinner, intro og nullstilling.
- Svar registreres. Dobbeltsvar og sene svar avvises som før.
- QR-koden vises og er generert lokalt.
- Ingen horisontal overflyt på mobil i 320 px og 390 px bredde, eller på kontrollpanelet i 390 px og 820 px.
- Storskjermen skaleres riktig i 1920×1080 og 1440×900.

### Ikke testet
- Publisering på Netlify og ekte telefoner på lokalets nett. Kjør en generalprøve.
