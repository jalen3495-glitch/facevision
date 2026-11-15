const API_BASE = (window.FACEVISION_API_URL || "").replace(/\/$/, "");
const CONSENT_KEY = "facevision.analytics.consent";
const SESSION_KEY = "facevision.analytics.session";

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function analyticsConsent() {
  return localStorage.getItem(CONSENT_KEY) === "granted";
}

export function setAnalyticsConsent(granted) {
  localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
}

export function track(name, properties = {}) {
  if (!analyticsConsent() || !API_BASE) return;
  const allowed = {};
  for (const key of ["mode", "faceCountBucket", "errorType"]) {
    if (Object.hasOwn(properties, key)) allowed[key] = properties[key];
  }
  const payload = {
    name,
    sessionId: getSessionId(),
    page: location.pathname,
    properties: allowed,
    ts: new Date().toISOString()
  };
  fetch(`${API_BASE}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {});
}
