# Floorplan

Planritningar för foto- och filminspelningar: rita upp rummet, placera kamera, ljus, grip, personer och props, se synfält och ljuskäglor, och exportera en skalenlig PDF med utrustningslista.

Samma app finns i två former:

- **Mac-app** (Apple Silicon och Intel). Ritningarna är riktiga filer (`.floorplan`) som sparas automatiskt efter varje ändring och öppnas med dubbelklick i Finder.
- **Webbapp för iPhone och iPad** (och alla webbläsare). Installeras på hemskärmen och fungerar utan nät. Ritningen sparas på enheten; projektfiler och PDF:er sparas via dela-menyn (Spara i Filer, AirDrop, Mejl, Skriv ut).

En `.floorplan`-fil fungerar i båda, så du kan börja på iPaden på plats och fortsätta på Macen.

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

- `web/` – appen (HTML, CSS, JS). `web/js/host.js` är det enda som skiljer Mac-appen från webbappen: filer, dialoger, dela-meny.
- `src-tauri/` – Mac-appens inbyggda del (öppna/spara, filassociation för `.floorplan`, säker skrivning via temporärfil).
- `scripts/vendor.mjs` lägger jsPDF och typsnitten i `web/vendor` så att allt fungerar offline.
- `scripts/build-web.mjs` bygger `dist/` med service worker för offline och hemskärmsinstallation.
- Varje push till `main` kör testerna (Chromium, WebKit och den riktiga appen), bygger `.dmg` som en release och publicerar webbappen på GitHub Pages.
