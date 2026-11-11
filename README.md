# Floorplan

Planritningar för foto- och filminspelningar: rita upp rummet, placera kamera, ljus, grip, personer och props, se synfält och ljuskäglor, och exportera en skalenlig PDF med utrustningslista.

Samma app finns i två former:

- **Mac-app** (Apple Silicon och Intel). Ritningarna är riktiga filer (`.floorplan`) som sparas automatiskt efter varje ändring och öppnas med dubbelklick i Finder.
- **Webbapp för iPhone och iPad** (och alla webbläsare). Installeras på hemskärmen och fungerar utan nät. Ritningen sparas på enheten; projektfiler och PDF:er sparas via dela-menyn (Spara i Filer, AirDrop, Mejl, Skriv ut).

En `.floorplan`-fil fungerar i båda, så du kan börja på iPaden på plats och fortsätta på Macen.

## Utomhus: plats, sol och skuggor

Under fliken **Sol** väljer du var ni ska plåta: med GPS, genom att söka på en adress eller genom att klistra in koordinater (till exempel från Google Maps). Då visas kartan under ritningen och byggnaderna runt platsen hämtas med sina höjder. Med reglaget över ritningen väljer du klockslag. Solens läge räknas ut för projektets datum, och skuggorna från byggnader, personer, träd, ramar och annan utrustning ritas ut. Fliken visar också gryning, soluppgång, gyllene timmen, solnedgång och vem som står i sol eller skugga.

- Solens läge räknas i appen och fungerar utan nät. Kartan, adressökningen och byggnaderna kommer från OpenStreetMap (gratis, ingen nyckel). Flygfoto kommer från Esri.
- Byggnadshöjder kommer från OpenStreetMap. Saknas de uppskattas de från antalet våningar eller sätts till 10 m. Klicka på en byggnad för att skriva in rätt höjd.
- Varje objekt har en höjd under *Sol och skugga* som styr dess skugga, till exempel en butterfly som hänger på 2,4 m.
- Kartan går att flytta och vrida så att ritningen hamnar rätt mot gator och hus.

## Installera

**Mac:** ladda ned `Floorplan.dmg` från senaste [release](../../releases/latest), öppna den och dra Floorplan till Program. Appen är inte notariserad hos Apple, så första gången: Systeminställningar › Integritet och säkerhet › *Öppna ändå*.

**iPhone / iPad:** öppna webbappens adress i Safari (visas under *Actions* › senaste körningen › *Publish the web app*), tryck på dela-knappen och välj *Lägg till på hemskärmen*. Öppna sedan alltid Floorplan från ikonen på hemskärmen.

## Utveckling

```sh
npm install
npm run dev            # webbappen på http://127.0.0.1:5174/
npm test               # end-to-end-tester i Chromium (BROWSER=webkit för Safari-motorn)
npx tauri dev          # Mac-appen lokalt (kräver Rust)
npm run build:mac      # universal .app + .dmg
```

- `web/` – appen (HTML, CSS, JS). `web/js/geo.js` räknar solens läge, tidszoner och kartprojektionen och hämtar karta, adresser och byggnader. `web/js/host.js` är det enda som skiljer Mac-appen från webbappen: filer, dialoger, dela-meny.
- `src-tauri/` – Mac-appens inbyggda del (öppna/spara, filassociation för `.floorplan`, säker skrivning via temporärfil).
- `scripts/vendor.mjs` lägger jsPDF och typsnitten i `web/vendor` så att allt fungerar offline.
- `scripts/build-web.mjs` bygger `dist/` med service worker för offline och hemskärmsinstallation.
- Varje push till `main` kör testerna (Chromium, WebKit och den riktiga appen), bygger `.dmg` som en release och publicerar webbappen på GitHub Pages.
