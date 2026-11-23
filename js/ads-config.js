// FaceVision ad configuration — the only file you need to edit to turn ads on.
// Leave values as empty strings ("") to show nothing. Empty slots are hidden.
//
// Adsterra banner keys (approved for https://jalen3495-glitch.github.io/facevision/).
// Official invoke host: https://bauval.org/22/<key>
// Do not add Popunder, Social Bar, or redirect units.

window.FACEVISION_ADS = {
  // "adsterra", "monetag", or "custom"
  network: "adsterra",

  // Adsterra "key" values from Websites → Get Code. 32-character hex strings.
  // Standard banner sizes only. format: iframe.
  adsterra: {
    key300x250: "ba3838ad3cbaa10b47fbc6c5ac80e506", // mid-page / article slot
    key728x90: "e819416a3ecca3eef8481bd2ecb81faa",  // desktop leaderboard (top or bottom)
    key320x50: "959a36f8684892a27b0538c660234a19"   // mobile banner (top or bottom)
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
