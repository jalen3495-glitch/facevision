# Making FaceVision ad-network ready

Nothing ad-related is active yet. All AdSense code is commented out, and every owner-specific value is a bracketed placeholder.

## 1. Fill in the placeholders
Search the project for these and replace them (e.g. `grep -rn "\[Your Name\]\|\[contact email\]\|\[yourdomain.com\]\|ca-pub-XXXXXXXX\|pub-XXXXXXXXXXXXXXXX\|0000000000" .`):

| Placeholder | Where | Replace with |
|---|---|---|
| `[Your Name]` | privacy, about, terms, footer on every page | Your name or business name |
| `[contact email]` | privacy, contact (incl. `mailto:`), terms | A real inbox you check |
| `[yourdomain.com]` | privacy, robots.txt, sitemap.xml | Your custom domain, e.g. `facevision.example` |
| `ca-pub-XXXXXXXX` | `<head>` comment + ad-unit comments on every page | Your AdSense publisher ID (`ca-pub-…`) |
| `data-ad-slot="0000000000"` | ad-unit comments | Ad unit IDs created in AdSense |
| `pub-XXXXXXXXXXXXXXXX` | ads.txt.example | Your publisher ID (without `ca-`) |

## 2. Buy a domain and point GitHub Pages at it
AdSense does not accept `*.github.io` subdomains.
1. Buy a domain from any registrar (Cloudflare, Namecheap, Porkbun, etc.).
2. Add a file named `CNAME` in the repo root containing only your domain, e.g. `facevision.example` (or set it in **Settings → Pages → Custom domain**, which creates the file).
3. At your registrar, add DNS records: for an apex domain, `A` records to GitHub Pages' IPs (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153); for `www`, a `CNAME` to `<your-username>.github.io`. Check GitHub's current docs: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
4. Enable **Enforce HTTPS** in Settings → Pages once the certificate is issued (camera access needs HTTPS).

## 3. Update robots.txt and sitemap.xml
Replace `[yourdomain.com]` in both files. If you add pages/articles, add them to `sitemap.xml`. Submit the sitemap in Google Search Console (optional but helps indexing).

## 4. Get some content and traffic first
Publish the articles, add more over time, and share the site so it has real visitors before applying.

## 5. Apply to AdSense
1. Sign up at https://adsense.google.com with your domain.
2. AdSense gives you a verification snippet: uncomment the `<script async src="https://pagead2.googlesyndication.com/...">` block in the `<head>` of every page and put your real `ca-pub-` ID in it.
3. Rename `ads.txt.example` to `ads.txt`, put your publisher ID in it, and confirm it loads at `https://yourdomain/ads.txt`.
4. Wait for review (can take days to weeks).

## 6. Enable a consent message (CMP) for EU/EEA/UK/Switzerland
Google requires a Google-certified consent management platform for personalised ads to users in these regions. Easiest: AdSense → **Privacy & messaging → European regulations** → create and publish a GDPR consent message (Google's own CMP). Optionally also the US state regulations message. The privacy policy already describes this.

## 7. Turn on ad units after approval
Uncomment the `<!-- AdSense unit ... -->` blocks:
- `index.html`: the slot in `<section class="below-app">`, *below* the app. Never move an ad over or inside the camera/preview stage.
- `articles/*.html`: slot at the bottom of each article.
Replace `data-ad-slot` with unit IDs from AdSense, or skip units entirely and use Auto ads (just the head script).

## 8. Optional Node server
`server/server.js` whitelists the new public files (pages, articles, robots.txt, sitemap.xml, ads.txt). If you add new pages and serve them via Node, add them to `PUBLIC_FILES`. `.env`, `data/*.sqlite`, and server code are never served.
