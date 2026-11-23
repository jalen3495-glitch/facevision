# Making FaceVision ready for ads

Ad slots are built into the pages, but they stay hidden until you paste a publisher code into `js/ads-config.js`. No ad script loads while those fields are empty.

Google AdSense does **not** accept `*.github.io` addresses. Until a custom domain such as facevision.js.org or facevision.eu.org is live, use a network that will review a GitHub Pages site.

Pop-under, click-under and redirect ads are not enabled, even if you paste those tags. Use banner units only.

## 1. Sign up — start with Adsterra

Adsterra is free to join, has no published traffic minimum, and does not state a ban on GitHub Pages. Approval is often quick. Payouts can start at $5 depending on the method (Paxum is commonly the lowest).

1. Open **https://profit.adsterra.com/sign-up** and choose **Publisher** / "Start earning".
2. Create the account with an email you check, accept the terms, and confirm the email they send.
3. In the dashboard, add a website. Use the full live URL, including `https://`:
   `https://jalen3495-glitch.github.io/facevision/`
4. Pick the closest category (for example technology, software or education).
5. Create **Banner** units only, in these sizes:
   - 300×250 (medium rectangle)
   - 728×90 (desktop leaderboard)
   - 320×50 (mobile banner)
6. Do **not** enable Popunder, Social Bar, or Smartlink for this site.
7. Wait until the website status is Approved, then open **Get code** and copy the banner key (a 32-character hex string) or the official snippet for each size.
8. Paste the keys into `js/ads-config.js` (`adsterra.key300x250`, `key728x90`, `key320x50`) and leave `network` set to `"adsterra"`.
9. If Adsterra gives you an `ads.txt` line, replace the commented example in `ads.txt` with that exact line. They do not always require this file.

Once the keys are in `js/ads-config.js` and the change is on the `gh-pages` branch, banners will appear in the reserved slots, each labelled "Advertisement".

## 2. Other free networks

### Monetag

Sign up at **https://publishers.monetag.com/signUp**. Monetag is also free and has no published traffic minimum, but its FAQ says free hosted platforms are not supported and a self-hosted domain is required. A `github.io` site may be rejected. Try Monetag after a custom domain is live, or apply and be prepared to wait for a custom domain if they refuse.

If they approve the site, they may ask you to add a `sw.js` file or a verification meta tag. Send that to the site maintainer rather than pasting a popunder tag. Then put a banner/in-page zone script URL in `js/ads-config.js` (`monetag.zoneScriptSrc`) and set `network` to `"monetag"`.

### HilltopAds

A backup option: **https://hilltopads.com/signup** (choose Publisher). They verify the site with a file or a meta tag. If they approve it, create banner units only, and paste the official snippet into the `custom` slots in `js/ads-config.js` with `network` set to `"custom"`.

### Google AdSense (later, on a custom domain)

Apply at **https://www.google.com/adsense/** only after the site is served on a registrable domain AdSense will accept (not `github.io` or, typically, `js.org`). Keep the banner-only approach. Put their `ads.txt` line in `ads.txt` when they give you one.

## 3. After approval, what to send

You do not need to edit the HTML. Send one of the following and it can be pasted for you:

- the three Adsterra banner keys, or
- the official Get Code snippet for each banner size, or
- an official `ads.txt` line, if the network provided one

## 4. Placeholders already filled

Legal and contact pages use **Kiana Cupit** and **kianajones3002-knt9hz@mail.grokbot.com**. The live canonical URL is `https://jalen3495-glitch.github.io/facevision/`.
