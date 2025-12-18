PWA Checklist for Wimpex

This document lists the remaining steps and commands to get https://wimpex.onrender.com to a high Lighthouse PWA score and be installable.

1) Verify current files (already present)
- `client/manifest.json` (start_url, display: standalone, icons)
- `client/sw.js` (service worker registered at `/sw.js`)
- `client/offline.html` (offline fallback)
- `client/index.html` (manifest linked and `installBtn` added)

2) Generate raster PNG icons (recommended) - run locally or in CI using ImageMagick
- Install ImageMagick if needed (`sudo apt install imagemagick` or equivalent)
- Commands:

```bash
# From repository root (client/assets)
convert assets/icon-192.svg -background none -resize 192x192 assets/icon-192.png
convert assets/icon-512.svg -background none -resize 512x512 assets/icon-512.png
```

Alternatively use `rsvg-convert` or any SVG -> PNG tool:

```bash
rsvg-convert -w 192 -h 192 assets/icon-192.svg -o assets/icon-192.png
rsvg-convert -w 512 -h 512 assets/icon-512.svg -o assets/icon-512.png
```

3) Update `client/manifest.json` to include the PNG files (example entry):

```json
{
  "src": "/assets/icon-192.png",
  "sizes": "192x192",
  "type": "image/png",
  "purpose": "any maskable"
}
```

4) Serve correct Content-Type for icons
- Ensure static file hosting serves `image/png` for `.png` and `image/svg+xml` for `.svg`.
- On Render, this is automatic for standard static files.

5) Test locally and on the deployed site
- Start local dev server and open Chrome DevTools > Application > Manifest to inspect icons and service worker.

6) Run Lighthouse PWA audit
- Requires Chrome/Chromium installed. Example command:

```bash
npx lighthouse https://wimpex.onrender.com --only-categories=pwa --chrome-flags="--headless"
```

7) Common Lighthouse fixes
- Add PNG icons (192 & 512) and mark `purpose: "any maskable"`.
- Ensure `start_url` responds with 200.
- Ensure `service-worker` is registered at root scope and handles navigation fallback.
- Provide an offline fallback page and cache it (done: `offline.html`).
- Ensure manifest is served with correct MIME type and accessible at `/manifest.json`.

8) Optional improvements
- Add a dedicated `icons/` folder with multiple densities.
- Add an automated CI check that runs Lighthouse and fails CI on regressions.

9) Security reminder
- Rotate any secrets that were present in `.env.backup` and avoid committing secrets to git. Use Render/GitHub Secrets for deployment.

If you want, I can:
- Generate PNG icons for you (requires ImageMagick or similar available here).
- Attempt a synthetic Lighthouse check (validate manifest fields, files present, SW registration). 
- Add a tiny GitHub Action to run Lighthouse on deploy.
