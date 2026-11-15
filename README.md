# FaceVision 2.0 — browser face detection + optional API

FaceVision is a browser-based **face detector**, not a facial-recognition or identity-search system. MediaPipe performs inference on the user's device. This project adds an explicit Node API, SQLite analytics database, opt-in analytics SDK, and a GitHub Pages-compatible frontend.

## Architecture

- `index.html`, `style.css`, `app.js`, `analytics.js`, `config.js`: static frontend; deployable to GitHub Pages.
- `server/server.js`: Node HTTP API and optional static-file server.
- `server/init-db.js`: SQLite schema initializer.
- `data/`: local SQLite database location; database files are ignored by Git.
- `package.json` / `package-lock.json`: npm project metadata and reproducible lockfile.

The API is **not hidden**: it is an explicit, separately deployable component. The frontend never sends images or camera frames to it.

## Run locally

Requires Node 22+ because the API uses Node's built-in `node:sqlite` module.

```bash
npm ci
cp .env.example .env
npm start
```

Open `http://127.0.0.1:8787`.

Health check: `GET /api/health`.

Admin event count: `GET /api/stats` with `Authorization: Bearer $ADMIN_TOKEN`.

## GitHub Pages

The frontend remains static. Deploy the repository root to GitHub Pages. Set `window.FACEVISION_API_URL` in `config.js` to your API origin if you want analytics enabled in the hosted site. If left empty, the analytics SDK performs no network requests.

## Analytics privacy boundary

Analytics is **opt-in**. The SDK sends only:

- event name
- random session identifier
- page path
- coarse face-count bucket for analysis events
- mode/error category
- timestamp

It does not send images, camera frames, face coordinates, landmarks, names, emails, IP addresses, or face embeddings. The API does not intentionally persist client IP addresses.

MediaPipe itself is an external dependency. Its current package privacy notice states that task input data is processed on-device, while MediaPipe APIs send performance/utilization metrics to Google. Review Google's current terms/privacy requirements before production use.

## Security notes

- API event input is allowlisted and size-limited.
- Basic in-memory rate limiting protects the public event endpoint.
- `/api/stats` requires an admin bearer token.
- The frontend uses a CPU fallback if GPU initialization fails.
- Uploaded object URLs are revoked when replaced/unloaded.
- Camera tracks are stopped during cleanup.
- Detection overlays use intrinsic media dimensions and displayed media dimensions separately, avoiding the original coordinate-transform bug.

## MediaPipe version

The frontend is pinned to `@mediapipe/tasks-vision@1.0.1`, currently published as the npm `latest` version. The model URL is the BlazeFace short-range model documented by MediaPipe.

## Important deployment note

GitHub Pages cannot run the Node API. Use GitHub Pages for the static frontend and deploy `server/server.js` to a Node-capable host if you want the optional analytics/database functionality. Do not put database credentials or `ADMIN_TOKEN` in frontend files.

## Site pages and ads

The static site also includes About, Privacy, Terms, Contact pages and an `articles/` section, plus `robots.txt`, `sitemap.xml`, and `ads.txt.example`. AdSense snippets are present but commented out. See `ADS.md` for domain, placeholder, consent, and AdSense steps.
