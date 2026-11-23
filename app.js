import { analyticsConsent, setAnalyticsConsent, track } from "./analytics.js";

const file = document.querySelector("#file");
const preview = document.querySelector("#preview");
const video = document.querySelector("#video");
const canvas = document.querySelector("#overlay");
const stage = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const status = document.querySelector("#status");
const count = document.querySelector("#count");
const faceCount = document.querySelector("#faceCount");
const confidence = document.querySelector("#confidence");
const mode = document.querySelector("#mode");
const cameraBtn = document.querySelector("#cameraBtn");
const fileLabel = document.querySelector("#fileLabel");
const placeholder = document.querySelector("#placeholder");
const analyticsToggle = document.querySelector("#analyticsToggle");
const cameraPrompt = document.querySelector("#cameraPrompt");
const cameraAllow = document.querySelector("#cameraAllow");
const cameraCancel = document.querySelector("#cameraCancel");
const errorCard = document.querySelector("#errorCard");
const errorTitle = document.querySelector("#errorTitle");
const errorBody = document.querySelector("#errorBody");
const errorRetry = document.querySelector("#errorRetry");
const errorDismiss = document.querySelector("#errorDismiss");

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

let FaceDetector;
let FilesetResolver;
let detector = null;
let stream = null;
let raf = 0;
let lastVideoTime = -1;
let objectUrl = null;
let currentSource = null;
let lastDetections = [];
let retryAction = null;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.classList.toggle("is-error", kind === "error");
  status.classList.toggle("is-ok", kind === "ok");
}

function setControlsEnabled(enabled) {
  cameraBtn.disabled = !enabled;
  if (file) file.disabled = !enabled;
  if (fileLabel) fileLabel.classList.toggle("is-disabled", !enabled);
}

function faceBucket(n) { return n === 0 ? "0" : n === 1 ? "1" : n <= 3 ? "2-3" : "4+"; }

function hideOverlays() {
  if (cameraPrompt) cameraPrompt.hidden = true;
  if (errorCard) errorCard.hidden = true;
}

function showError(title, body, retry) {
  if (!errorCard) return;
  hideOverlays();
  errorTitle.textContent = title;
  errorBody.textContent = body;
  retryAction = retry || null;
  if (errorRetry) errorRetry.hidden = !retryAction;
  errorCard.hidden = false;
  placeholder.hidden = true;
}

function update(detections) {
  lastDetections = detections || [];
  const n = lastDetections.length;
  count.textContent = `${n} face${n === 1 ? "" : "s"}`;
  faceCount.textContent = n;
  confidence.textContent = n ? `${Math.round((lastDetections[0].categories?.[0]?.score || 0) * 100)}%` : "—";
}

function intrinsicSize(el) {
  if (el instanceof HTMLImageElement) return { width: el.naturalWidth, height: el.naturalHeight };
  if (el instanceof HTMLVideoElement) return { width: el.videoWidth, height: el.videoHeight };
  return { width: 0, height: 0 };
}

function sourceBox(el) {
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const { width, height } = intrinsicSize(el);
  if (!width || !height || !r.width || !r.height) return null;
  return {
    x: r.left - s.left,
    y: r.top - s.top,
    width: r.width,
    height: r.height,
    scaleX: r.width / width,
    scaleY: r.height / height
  };
}

function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function draw(detections = [], el = currentSource) {
  resizeCanvas();
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  ctx.clearRect(0, 0, width, height);
  if (!el) return;
  const b = sourceBox(el);
  if (!b) return;

  for (const detection of detections) {
    const bb = detection.boundingBox;
    const x = b.x + bb.originX * b.scaleX;
    const y = b.y + bb.originY * b.scaleY;
    const w = bb.width * b.scaleX;
    const h = bb.height * b.scaleY;
    ctx.strokeStyle = "#3ee0b4";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    for (const p of detection.keypoints || []) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(b.x + p.x * b.width, b.y + p.y * b.height, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

async function createDetector(delegate) {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return FaceDetector.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "IMAGE",
    minDetectionConfidence: 0.5
  });
}

async function init() {
  try {
    setStatus("Loading face detector…");
    setControlsEnabled(false);
    const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1");
    FaceDetector = vision.FaceDetector;
    FilesetResolver = vision.FilesetResolver;
    try {
      detector = await createDetector("GPU");
    } catch (gpuError) {
      console.warn("GPU initialization failed; falling back to CPU.", gpuError);
      detector = await createDetector("CPU");
    }
    setControlsEnabled(true);
    setStatus("Ready — face detection runs in your browser.", "ok");
    track("detector_ready");
  } catch (error) {
    console.error(error);
    setControlsEnabled(false);
    setStatus("Could not load the face detector. Check your internet connection and try again.", "error");
    showError(
      "The face detector did not load",
      "FaceVision needs to download a small model and library. Check your connection, then try again.",
      init
    );
    track("detector_error", { errorType: "initialization" });
  }
}

function stopCamera() {
  cancelAnimationFrame(raf);
  raf = 0;
  if (stream) {
    for (const trackItem of stream.getTracks()) trackItem.stop();
    stream = null;
  }
  video.srcObject = null;
  video.style.display = "none";
  cameraBtn.textContent = "Use camera";
  cameraBtn.setAttribute("aria-pressed", "false");
  if (!preview.src) {
    placeholder.hidden = false;
    placeholder.style.display = "block";
  }
  mode.textContent = "Idle";
  currentSource = preview.src ? preview : null;
  if (currentSource) draw(lastDetections, currentSource); else draw([]);
  track("camera_stopped");
}

function releaseObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function cameraErrorMessage(error) {
  const name = error?.name || "";
  if (!window.isSecureContext) {
    return {
      title: "Camera needs a secure page",
      body: "Browsers only share the camera on HTTPS (or localhost). Open the official FaceVision site and try again."
    };
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      title: "Camera permission is blocked",
      body: "Your browser blocked the camera for this site. In the address-bar site settings, allow the camera, then try again. You can still detect faces in a photo."
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      title: "No camera was found",
      body: "This device does not appear to have a usable camera. You can still choose a photo to detect faces."
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      title: "The camera is busy",
      body: "Another app or browser tab may be using the camera. Close those, then try again."
    };
  }
  if (name === "OverconstrainedError") {
    return {
      title: "This camera could not start",
      body: "The requested camera settings are not supported. Try again, or use a photo instead."
    };
  }
  if (name === "SecurityError") {
    return {
      title: "The browser blocked the camera",
      body: "This page is not allowed to use the camera. Try another browser, or choose a photo instead."
    };
  }
  if (name === "AbortError") {
    return {
      title: "The camera request was interrupted",
      body: "Please try again. If this keeps happening, reload the page."
    };
  }
  return {
    title: "Camera access was not available",
    body: "The camera could not be started. You can still choose a photo to detect faces."
  };
}

async function startCamera() {
  hideOverlays();
  if (stream) return stopCamera();
  if (!detector) return setStatus("The face detector is still loading.", "error");
  if (!navigator.mediaDevices?.getUserMedia) {
    const message = cameraErrorMessage({ name: "SecurityError" });
    setStatus(message.body, "error");
    showError(message.title, message.body, null);
    return;
  }
  if (!window.isSecureContext) {
    const message = cameraErrorMessage({ name: "SecurityError" });
    setStatus(message.body, "error");
    showError(message.title, message.body, null);
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    video.srcObject = stream;
    video.style.display = "block";
    preview.style.display = "none";
    placeholder.hidden = true;
    placeholder.style.display = "none";
    currentSource = video;
    cameraBtn.textContent = "Stop camera";
    cameraBtn.setAttribute("aria-pressed", "true");
    mode.textContent = "Camera";
    await video.play();
    detector.setOptions({ runningMode: "VIDEO" });
    lastVideoTime = -1;
    setStatus("Camera running — detecting locally.", "ok");
    track("camera_started", { mode: "camera" });
    loop();
  } catch (error) {
    console.error(error);
    if (stream) stopCamera();
    const message = cameraErrorMessage(error);
    setStatus(message.body, "error");
    showError(message.title, message.body, startCamera);
    track("camera_error", { errorType: error?.name || "permission_or_device" });
  }
}

function requestCamera() {
  if (stream) return stopCamera();
  if (!detector) return setStatus("The face detector is still loading.", "error");
  hideOverlays();
  placeholder.hidden = true;
  if (cameraPrompt) {
    cameraPrompt.hidden = false;
    cameraAllow?.focus();
    return;
  }
  return startCamera();
}

async function analyzeImageFile(selected) {
  if (!selected) return;
  if (!detector) return setStatus("The face detector is still loading.", "error");
  if (!selected.type.startsWith("image/")) {
    setStatus("Please choose an image file (for example JPG, PNG or WebP).", "error");
    showError("That file is not an image", "Choose a photo in a common format such as JPG, PNG or WebP.", null);
    return;
  }

  hideOverlays();
  stopCamera();
  releaseObjectUrl();
  objectUrl = URL.createObjectURL(selected);
  preview.src = objectUrl;
  preview.style.display = "block";
  video.style.display = "none";
  placeholder.hidden = true;
  placeholder.style.display = "none";
  currentSource = preview;
  mode.textContent = "Image";
  setStatus("Analyzing…");

  preview.onload = () => {
    try {
      detector.setOptions({ runningMode: "IMAGE" });
      const result = detector.detect(preview);
      update(result.detections);
      draw(result.detections, preview);
      setStatus(`Detected ${result.detections.length} face${result.detections.length === 1 ? "" : "s"}.`, "ok");
      track("image_analyzed", { mode: "image", faceCountBucket: faceBucket(result.detections.length) });
    } catch (error) {
      console.error(error);
      setStatus("Could not analyze that image.", "error");
      showError("The image could not be analyzed", "Try another photo, or reload the page and try again.", null);
      track("detector_error", { errorType: "image_analysis" });
    }
  };
}

file.addEventListener("change", (event) => {
  analyzeImageFile(event.target.files?.[0]);
});

cameraBtn.addEventListener("click", requestCamera);
cameraAllow?.addEventListener("click", startCamera);
cameraCancel?.addEventListener("click", () => {
  hideOverlays();
  if (!preview.src) {
    placeholder.hidden = false;
    placeholder.style.display = "block";
  }
  setStatus("Camera cancelled. You can still choose a photo.");
});
errorRetry?.addEventListener("click", () => {
  hideOverlays();
  if (typeof retryAction === "function") retryAction();
});
errorDismiss?.addEventListener("click", () => {
  hideOverlays();
  if (!preview.src && !stream) {
    placeholder.hidden = false;
    placeholder.style.display = "block";
  }
});

["dragenter", "dragover"].forEach((type) => {
  stage.addEventListener(type, (event) => {
    event.preventDefault();
    stage.classList.add("is-drop");
  });
});
["dragleave", "drop"].forEach((type) => {
  stage.addEventListener(type, (event) => {
    event.preventDefault();
    stage.classList.remove("is-drop");
  });
});
stage.addEventListener("drop", (event) => {
  const dropped = event.dataTransfer?.files?.[0];
  if (dropped) analyzeImageFile(dropped);
});

function loop() {
  if (!stream || !detector) return;
  if (video.currentTime !== lastVideoTime && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const result = detector.detectForVideo(video, performance.now());
    update(result.detections);
    draw(result.detections, video);
    lastVideoTime = video.currentTime;
  }
  raf = requestAnimationFrame(loop);
}

if (analyticsToggle) {
  analyticsToggle.checked = analyticsConsent();
  analyticsToggle.addEventListener("change", () => {
    setAnalyticsConsent(analyticsToggle.checked);
    track(analyticsToggle.checked ? "analytics_consent_granted" : "analytics_consent_denied");
  });
}

window.addEventListener("resize", () => draw(lastDetections, currentSource));
window.addEventListener("beforeunload", () => {
  stopCamera();
  releaseObjectUrl();
  if (detector?.close) detector.close();
});

setControlsEnabled(false);
requestAnimationFrame(() => { init(); });
