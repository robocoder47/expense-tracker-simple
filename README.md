# expense tracker simple

Mobile-first PWA for tracking expenses with a black monospace UI. Data stays on your device (IndexedDB). Export JSON backups to Files / iCloud Drive.

## Develop

```bash
npm install
npm run dev
```

Open the local dev server URL in your browser.

## Build

```bash
npm run build
npm run preview
```

## Deploy (GitHub Pages)

1. Create a repo named `expense-tracker-simple` (or update `base` in `vite.config.ts` to match your repo name).
2. Push to `main`.
3. In GitHub repo **Settings → Pages**, set source to **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

Live URL: `https://<username>.github.io/expense-tracker-simple/`

## Install on iPhone

1. Open the live URL in **Safari**
2. Tap **Share** → **Add to Home Screen**

## Features

- Quick expense entry with category chips or custom categories
- Paste-import from Notes with preview before commit
- Stats: category pie chart, monthly bar chart, budget tracking
- Fixed costs from your monthly list
- EUR entries store CHF value at entry time (rate changes do not alter history)
- Backup nudge every 7 days + JSON export
- Offline-capable PWA with auto-update on deploy
