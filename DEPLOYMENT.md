# Deployment

## Live site

The public site is served from the `gh-pages` branch:

https://jalen3495-glitch.github.io/facevision/

Do **not** add a `CNAME` file on `gh-pages` until facevision.js.org (or another custom domain) is actually approved and DNS is ready. A CNAME pointing at an unapproved domain will redirect the live github.io site away.

The `main` branch may keep a `CNAME` file for later. The GitHub Actions workflow on `main` must not copy that file into the Pages deploy until the custom domain is live.

## Frontend on GitHub Pages

1. Push frontend changes to the `gh-pages` branch to update the live site.
2. Mirror the same files on `main`, leaving `CNAME` only on `main`.
3. If using the optional API, set `window.FACEVISION_API_URL` in `config.js` to the HTTPS API origin, and set the API's `ALLOWED_ORIGIN` to `https://jalen3495-glitch.github.io`.

## Node API

Run on a Node 22+ host:

```bash
npm ci
npm start
```

Set `ADMIN_TOKEN` as an environment variable. Do not put it in `config.js` or any frontend file.

The API stores only analytics event metadata in SQLite. It never accepts image uploads.
