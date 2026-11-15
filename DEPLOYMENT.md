# Deployment

## Frontend on GitHub Pages

1. Push the repository contents to GitHub.
2. Enable Pages from the repository's `main` branch/root.
3. If using the API, edit `config.js` and set `window.FACEVISION_API_URL` to the HTTPS API origin.
4. Set the API's `ALLOWED_ORIGIN` to the exact GitHub Pages origin.

## Node API

Run on a Node 22+ host:

```bash
npm ci
npm start
```

Set `ADMIN_TOKEN` as an environment variable. Do not put it in `config.js` or any frontend file.

The API stores only analytics event metadata in SQLite. It never accepts image uploads.
