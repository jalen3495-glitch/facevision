// FaceVision ad configuration — the only file you need to edit to turn ads on.
// Leave values as empty strings ("") to show nothing. Empty slots are hidden.
//
// Recommended first network: Adsterra (often accepts github.io sites).
// Sign up at https://profit.adsterra.com/sign-up as a Publisher, add
// https://jalen3495-glitch.github.io/facevision/ and create Banner units only.
// Do not create Popunder, Social Bar, or redirect units — they are not loaded
// by this site even if you paste those codes here.
//
// Monetag (https://publishers.monetag.com/signUp) is free to join but currently
// says it does not support free hosted platforms, so github.io may be rejected
// until a custom domain is live.
//
// After approval, paste the banner key or official snippet below and tell
// whoever maintains the site so they can commit the change.

window.FACEVISION_ADS = {
  // "adsterra", "monetag", or "custom"
  network: "adsterra",

  // Adsterra "key" values from Websites → Get Code. 32-character hex strings.
  // Standard banner sizes only.
  adsterra: {
    key300x250: "", // mid-page / article slot
    key728x90: "",  // desktop leaderboard (top or bottom)
    key320x50: ""   // mobile banner (top or bottom)
  },

  // Monetag zone script URL, used only if network is "monetag" and this is set.
  // Paste a banner/in-page zone script src, never a popunder tag.
  monetag: {
    zoneScriptSrc: ""
  },

  // Optional official HTML snippets, used when network is "custom" or as a
  // fallback for a slot when the key/script above is empty.
  custom: {
    top: "",
    mid: "",
    bottom: ""
  }
};
