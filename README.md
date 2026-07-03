# Globert Works

Globert Works is a small factory automation game about building a Widget line, clearing work orders, and chasing Shift Skirmish grades.

## Play

Open `index.html` or `Globert.html` to start from the home screen, or `Globert Factory.html` to jump straight to the floor.

## Controls

- `E` extractor
- `B` conveyor
- `A` assembler
- `S` storage
- `D` shipping dock
- `X` demolish
- `R` rotate
- `Space` pause
- `Tab` switch between Shop Floor and Office

## Release Build

Install dependencies once:

```powershell
npm install
```

Build the PixiJS floor enhancement:

```powershell
npm run build
```

Run this from the project folder:

```powershell
npm run release
```

The script creates `release/globert-works` and `release/globert-works-release.zip`.

## Save Tools

Open the Office dashboard and use Release controls to export/import saves, replay training, or restart a run.

## Smoke Test

Serve the folder locally and open `tools/smoke.html`. It writes pass/fail results on the page and exposes `window.__SMOKE_RESULTS__`.

## Balance Check

Serve the folder locally and open `tools/balance.html`. It checks the Shift Skirmish deck, reward pacing, win paths, and the Lean sprint fail path, then exposes `window.__BALANCE_RESULTS__`.
