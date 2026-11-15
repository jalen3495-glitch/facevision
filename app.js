import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1";
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
const placeholder = document.querySelector("#placeholder");
const analyticsToggle = document.querySelector("#analyticsToggle");

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

let detector = null;
let stream = null;
let raf = 0;
let lastVideoTime = -1;
let objectUrl = null;
let currentSource = null;
let lastDetections = [];

function setStatus(message) { status.textContent = message; }
function faceBucket(n) { return n === 0 ? "0" : n === 1 ? "1" : n <= 3 ? "2-3" : "4+"; }

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
    ctx.strokeStyle = "#6ea8fe";
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
    try {
      detector = await createDetector("GPU");
    } catch (gpuError) {
      console.warn("GPU initialization failed; falling back to CPU.", gpuError);
      detector = await createDetector("CPU");
    }
    setStatus("Ready — face inference runs in your browser.");
    track("detector_ready");
  } catch (error) {
    console.error(error);
    setStatus("Could not load the face detector. Check your internet connection.");
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
  if (!preview.src) placeholder.style.display = "block";
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

file.addEventListener("change", async (event) => {
  const selected = event.target.files?.[0];
  if (!selected || !detector) return;
  if (!selected.type.startsWith("image/")) return;

  stopCamera();
  releaseObjectUrl();
  objectUrl = URL.createObjectURL(selected);
  preview.src = objectUrl;
  preview.style.display = "block";
  video.style.display = "none";
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
      setStatus(`Detected ${result.detections.length} face${result.detections.length === 1 ? "" : "s"}.`);
      track("image_analyzed", { mode: "image", faceCountBucket: faceBucket(result.detections.length) });
    } catch (error) {
      console.error(error);
      setStatus("Could not analyze that image.");
      track("detector_error", { errorType: "image_analysis" });
    }
  };
});

cameraBtn.addEventListener("click", async () => {
  if (stream) return stopCamera();
  if (!detector) return setStatus("The face detector is still loading.");
  if (!navigator.mediaDevices?.getUserMedia) return setStatus("Camera access is not supported by this browser.");

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    video.srcObject = stream;
    video.style.display = "block";
    preview.style.display = "none";
    placeholder.style.display = "none";
    currentSource = video;
    cameraBtn.textContent = "Stop camera";
    mode.textContent = "Camera";
    await video.play();
    detector.setOptions({ runningMode: "VIDEO" });
    lastVideoTime = -1;
    setStatus("Camera running — detecting locally.");
    track("camera_started", { mode: "camera" });
    loop();
  } catch (error) {
    console.error(error);
    if (stream) stopCamera();
    setStatus("Camera access was denied or unavailable.");
    track("camera_error", { errorType: "permission_or_device" });
  }
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

analyticsToggle.checked = analyticsConsent();
analyticsToggle.addEventListener("change", () => {
  setAnalyticsConsent(analyticsToggle.checked);
  track(analyticsToggle.checked ? "analytics_consent_granted" : "analytics_consent_denied");
});

window.addEventListener("resize", () => draw(lastDetections, currentSource));
window.addEventListener("beforeunload", () => {
  stopCamera();
  releaseObjectUrl();
  if (detector?.close) detector.close();
});

init();
