# Trainee Pursuit – prototype

> ⚠️ AI-GENERERT – IKKE VERIFISERT. Verifiser alle faktapåstander (spørsmål og fasit) mot primærkilder før bruk.

**Status: prototype.** Testet lokalt med 110 simulerte publikummere, men ikke på Netlify og ikke på lokalets nett. Ha Kahoot klart som reserve på kvelden.

## Tre sider

| Adresse | Hvem | Hva |
|---|---|---|
| `/` | Publikum (mobil) | Bli med med kallenavn og gruppe, svar på spørsmål, se egne poeng |
| `/skjerm` | Projektor | QR-kode, kategori, spørsmål med nedtelling, fasit med statistikk per gruppe, kakestilling, toppliste, vinner |
| `/kontroll` | Teknisk ansvarlig (PIN) | Styrer alt som vises på skjermen, deler ut kakestykker, fjerner upassende kallenavn |

## Slik kjører du showet (én knapp)

Kontrollpanelet (`/kontroll`) følger manuset steg for steg. **Det eneste du gjør er å trykke NESTE, og å trykke på laget som fikk poeng.** Alt annet skjer automatisk: kategorier, spørsmål, klokke, «Snu tavlene!», fasit med statistikk, kakestykker, stillingen, finalen, vinnerkåring og musikk.

1. **Før gjestene kommer:** Åpne `/skjerm` i fullskjerm på projektoren. Åpne `/kontroll` på **teknisk-PC-en som er koblet til lydanlegget**, logg inn med PIN, og last inn de tre musikkfilene under «Lyd og musikk» (se under). Lyden spilles fra kontrollpanelet, ikke fra storskjermen.
2. **Under showet:** Trykk **NESTE**. Panelet viser hva som skjer på storskjermen og hva Agne skal si (replikkene er hentet fra manuset). En presentasjonsklikker fungerer også (pil høyre eller Page Down).
**Hvert spørsmål tar fire trykk:** kategori (står til lagene har valgt spiller) → spørsmålet vises (Agne leser) → klokka går (20 s) → fasit.
3. **Etter hver fasit:** Trykk på laget eller lagene som hadde riktig svar på tavla. Laget får kakestykket, storskjermen viser et banner, og det spilles en pling. I finalen trykker du på laget som var nærmest. Lag som allerede har stykket, er sperret.
4. **Får et lag full kake,** hopper neste trykk rett til vinnerkåringen. Er spørsmålene brukt opp, vinner laget med flest stykker. Ved uavgjort ber panelet deg velge vinner under «Avansert».

«Tilbake ett steg», «Stopp musikken», manuelle kakestykker, hopp i manuset, fjerning av kallenavn og nullstilling ligger under **Avansert**.

**Svaralternativene vises ikke på storskjermen mens klokka går,** bare på mobilene. Ellers ville lagene på scenen fått flervalg. Alternativene og fordelingen vises ved fasit.

## Musikk

| Spor | Brukes til |
|---|---|
| Intro og vinner (Game Show Theme) | Intro (dempes etter 14 s når Agne snakker), lagpresentasjon, stillingen, vinner, avslutning |
| Seriøs / dyster (Big Brother – Trust No One) | Reglene, under kategoriene, finaleintroen |
| Nedtelling (Jeopardy) | Nøyaktig de 20 sekundene klokka går. Stopper når tiden er ute, etterfulgt av en summer. |

Pling (kakestykke), summer (tiden er ute), «ta-da» (fasit) og «whoosh» (kategori) lages av nettleseren selv. Det trengs ingen filer til dem.

**Musikkfilene legges inn i kontrollpanelet på teknisk-PC-en, ikke i GitHub.** De lagres i nettleseren på den PC-en (IndexedDB) og blir der til nettleserdata slettes. Storskjermen viser aldri lydoppsett, så publikum ser det ikke. Låtene er opphavsrettsbeskyttet, og et Netlify-nettsted er offentlig, så ikke legg dem i repoet. `.gitignore` stopper `*.mp3`. Første klikk i panelet aktiverer lyden (nettleserne krever et brukertrykk).

## Publisere på Netlify

Netlify Drop (dra og slipp) virker **ikke**, fordi appen trenger en serverfunksjon. Velg ett av alternativene:

**A. Via GitHub (anbefalt)**
1. Legg mappen i et GitHub-repo.
2. Netlify: *Add new site → Import an existing project →* velg repoet. Innstillingene leses fra `netlify.toml`.
3. *Site configuration → Environment variables:* legg til `ADMIN_PIN` med en PIN-kode du velger. Ikke skriv den inn i koden.
4. Publiser på nytt (*Deploys → Trigger deploy*) slik at PIN-en blir tatt i bruk.
5. Gi nettstedet et kort navn (*Site configuration → Change site name*), for eksempel `traineepursuit`. Navnet blir adressen som står under QR-koden.

**B. Via Netlify CLI**
```
npm install
npx netlify-cli login
npx netlify-cli init
npx netlify-cli env:set ADMIN_PIN <​DIN_PIN>
npx netlify-cli deploy --prod
```

Lagring skjer i Netlify Blobs (innebygd, ingen database å sette opp).

## Teste lokalt
```
node dev-server.mjs
```
Åpne http://localhost:8888/kontroll (PIN `1234`), http://localhost:8888/skjerm og http://localhost:8888 i hver sin fane. Lokalt lagres alt i minnet og forsvinner når serveren stoppes.

## Endre spørsmål, lag og grupper
Alt ligger i `netlify/lib/questions.mjs`. Filen ligger på serveren, så publikum kan ikke lese fasiten. Lagre, så publiserer Netlify automatisk på nytt (GitHub-varianten).

## Må sjekkes før kvelden

- [ ] **Fasit** `[verifiser]`. Spesielt antall ESC-seire etter 2026, Agders kommunetall og 1030/2030-formuleringen. Feilsvarene i flervalg er utkast.
- [ ] **Netlify-plan og kvoter** `[verifiser]`. Spørsmålstilstanden caches i 1 sekund på Netlifys CDN (`Netlify-CDN-Cache-Control`), slik at 110 telefoner gir omtrent ett funksjonskall i sekundet, ikke 110. Sjekk at kontoen deres tåler et kvarters trafikk, og at cachingen virker etter publisering (svartall og nedtelling skal oppdateres jevnt).
- [ ] **Generalprøve** med 10–20 telefoner på lokalets nett/4G, og storskjermen på projektoren.
- [ ] **Reserve:** Kahoot med de samme spørsmålene, klart på teknisk-PC-en.
- [ ] **Kallenavn:** Den tekniske ansvarlige sjekker topp 10 i panelet og fjerner upassende navn *før* «Vis topp 5».
- [ ] **Etter arrangementet:** Trykk «Slett alt» i panelet. Det sletter kallenavn, svar og poeng.

## Personvern og sikkerhet
- Appen lagrer kun kallenavn og gruppe (trainee/alumni/medlemsbedrift). Ingen innlogging, e-post eller navn.
- Kontrollpanelet er beskyttet av en enkel PIN-kode (`ADMIN_PIN`). Det holder for et kveldsarrangement, men ikke for noe som skal leve videre.
- Statistikk vises per gruppe. Det er ingen nedre grense, så med svært få svar i én gruppe kan enkeltpersoners svar bli synlige. Det er uproblematisk for quizsvar, men verdt å vite.

## Filer
```
netlify.toml                 Netlify-oppsett
package.json                 Avhengighet: @netlify/blobs
netlify/functions/api.mjs    Serverfunksjonen (/api/*)
netlify/lib/game.mjs         Spillogikk: tilstand, svar, fasit, poeng, kontrollpanel
netlify/lib/questions.mjs    Spørsmål, lag, grupper, farger
netlify/lib/store.mjs        Lagring (Netlify Blobs / minne lokalt)
public/index.html            Mobil
public/skjerm.html           Storskjerm
public/kontroll.html         Kontrollpanel
public/shared.js|css         Felles kode og stil
public/vendor/qr.js          QR-motor (MIT, fra qrcode-terminal), uten CDN
public/fonts/                Lokale webfonter (TeX Gyre Adventor, Inter) med lisenser
dev-server.mjs               Lokal testserver
```
