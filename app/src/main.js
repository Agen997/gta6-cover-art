// Neon Poster Studio — editor state and UI wiring.
// Holds the photo pool and per-panel crop settings, renders the live preview
// with the composer, and exports full-size PNGs on download.

import {
  drawCover,
  exportPNG,
  panelCount,
  EXPORT_SIZES,
  LAYOUT_NAMES,
  GRADE_NAMES,
} from './composer.js';

const $ = (id) => document.getElementById(id);

const state = {
  layout: 'grid',
  grade: 'vice',
  frame: 'poster',
  vignette: true,
  grain: false,
  size: '1920x1080',
  selectedPanel: 0,
  caption: {
    text: 'NEON SHORES',
    subtitle: 'vice city nights',
    font: 'black',
    color: 'sunset',
    sizePct: 12,
    position: 'bottom',
    outline: true,
    shadow: true,
    upper: true,
  },
  panels: [
    { photo: 0, panX: 0, panY: 0.2, zoom: 1 },
    { photo: 1, panX: 0, panY: 0.14, zoom: 1.15 },
    { photo: 1, panX: 0, panY: 0.14, zoom: 1.05 },
    { photo: 0, panX: 0, panY: 0.2, zoom: 1.2 },
  ],
};

// Photo pool: [{ img, url, name }]
const photos = [];
let lastRects = [];

const canvas = $('stage');
const ctx = canvas.getContext('2d');

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });
}

async function addPhotoFromSrc(src, name) {
  const img = await loadImage(src);
  photos.push({ img, url: src, name });
  renderPool();
  updateInfo();
  return photos.length - 1;
}

async function addPhotoFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      await addPhotoFromSrc(url, file.name);
    } catch (e) {
      URL.revokeObjectURL(url);
    }
  }
  if (files.length) fillAllPanels(false);
  render();
}

function photoImages() {
  return photos.map((p) => p.img);
}

// Preview canvas follows the export aspect, fitted into the stage box.
function previewSize() {
  const { w, h } = EXPORT_SIZES[state.size];
  const scale = Math.min(980 / w, 600 / h);
  return { w: Math.max(320, Math.round(w * scale)), h: Math.max(240, Math.round(h * scale)) };
}

function render() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  lastRects = drawCover(ctx, w, h, state, photoImages(), { showSelection: true });
  updateInfo();
}

function updateInfo() {
  const size = EXPORT_SIZES[state.size];
  $('coverInfo').textContent =
    `${size.w} × ${size.h} · ${LAYOUT_NAMES[state.layout]} · ${GRADE_NAMES[state.grade]}`;
  $('photoCount').textContent =
    photos.length === 1 ? '1 photo loaded' : `${photos.length} photos loaded`;
}

function renderPool() {
  const pool = $('pool');
  pool.innerHTML = '';
  photos.forEach((p, i) => {
    const el = document.createElement('img');
    el.className = 'thumb' + (state.panels.some((c) => c.photo === i) ? ' assigned' : '');
    el.src = p.url;
    el.alt = p.name;
    el.title = p.name;
    el.addEventListener('click', () => assignPhotoToSelected(i));
    pool.appendChild(el);
  });
}

function assignPhotoToSelected(photoIndex) {
  const cfg = state.panels[state.selectedPanel];
  if (!cfg) return;
  cfg.photo = photoIndex;
  cfg.panX = 0;
  cfg.panY = 0;
  cfg.zoom = 1;
  syncZoomControl();
  renderPool();
  render();
}

function fillAllPanels(announce = true) {
  if (!photos.length) return;
  const n = panelCount(state.layout);
  for (let i = 0; i < n; i++) {
    state.panels[i].photo = i % photos.length;
  }
  renderPool();
  if (announce) render();
}

function shufflePanels() {
  if (!photos.length) return;
  const n = panelCount(state.layout);
  for (let i = 0; i < n; i++) {
    state.panels[i].photo = Math.floor(Math.random() * photos.length);
    state.panels[i].zoom = 1 + Math.random() * 0.35;
    state.panels[i].panX = (Math.random() - 0.5) * 0.2;
    state.panels[i].panY = (Math.random() - 0.5) * 0.2;
  }
  syncZoomControl();
  renderPool();
  render();
}

function setLayout(layout) {
  state.layout = layout;
  if (state.selectedPanel >= panelCount(layout)) state.selectedPanel = 0;
  // Make sure every visible panel has a photo when the pool is non-empty.
  const n = panelCount(layout);
  for (let i = 0; i < n; i++) {
    if (photos.length && (state.panels[i].photo < 0 || state.panels[i].photo >= photos.length)) {
      state.panels[i].photo = i % photos.length;
    }
  }
  markSegmented('layoutRow', 'layout', layout);
  syncZoomControl();
  renderPool();
  render();
}

function setGrade(grade) {
  state.grade = grade;
  markSegmented('gradeRow', 'grade', grade);
  render();
}

function setFrame(frame) {
  state.frame = frame;
  markSegmented('frameRow', 'frame', frame);
  render();
}

function setSize(size) {
  state.size = size;
  markSegmented('sizeRow', 'size', size);
  render();
}

function setCaptionPosition(pos) {
  state.caption.position = pos;
  markSegmented('captionPosRow', 'pos', pos);
  render();
}

function markSegmented(rowId, attr, value) {
  document.querySelectorAll(`#${rowId} button`).forEach((b) => {
    b.classList.toggle('on', b.dataset[attr] === value);
  });
}

function syncZoomControl() {
  const cfg = state.panels[state.selectedPanel];
  const pct = Math.round((cfg ? cfg.zoom : 1) * 100);
  $('zoomRange').value = String(pct);
  $('zoomVal').textContent = pct + '%';
}

// --- Pointer interaction on the preview canvas -----------------------------
let drag = null;

function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * canvas.width,
    y: ((ev.clientY - r.top) / r.height) * canvas.height,
  };
}

function panelAt(pt) {
  for (let i = 0; i < lastRects.length; i++) {
    const r = lastRects[i];
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return i;
  }
  return -1;
}

canvas.addEventListener('pointerdown', (ev) => {
  const pt = canvasPoint(ev);
  const idx = panelAt(pt);
  if (idx >= 0) {
    state.selectedPanel = idx;
    syncZoomControl();
    drag = { x: pt.x, y: pt.y };
    canvas.setPointerCapture(ev.pointerId);
    canvas.classList.add('dragging');
    render();
  }
});

canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const pt = canvasPoint(ev);
  const cfg = state.panels[state.selectedPanel];
  const rect = lastRects[state.selectedPanel];
  if (cfg && rect) {
    cfg.panX += (pt.x - drag.x) / rect.w;
    cfg.panY += (pt.y - drag.y) / rect.h;
  }
  drag = { x: pt.x, y: pt.y };
  render();
});

function endDrag() {
  drag = null;
  canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const pt = canvasPoint(ev);
  const idx = panelAt(pt);
  if (idx >= 0) state.selectedPanel = idx;
  const cfg = state.panels[state.selectedPanel];
  if (!cfg) return;
  cfg.zoom = Math.min(3, Math.max(1, cfg.zoom * (ev.deltaY < 0 ? 1.08 : 0.92)));
  syncZoomControl();
  render();
}, { passive: false });

// --- Drag & drop photos -----------------------------------------------------
const stageFrame = $('stageFrame');
['dragenter', 'dragover'].forEach((name) =>
  stageFrame.addEventListener(name, (ev) => {
    ev.preventDefault();
    stageFrame.classList.add('dragover');
  }),
);
['dragleave', 'drop'].forEach((name) =>
  stageFrame.addEventListener(name, (ev) => {
    ev.preventDefault();
    stageFrame.classList.remove('dragover');
  }),
);
stageFrame.addEventListener('drop', (ev) => {
  if (ev.dataTransfer && ev.dataTransfer.files.length) addPhotoFiles(ev.dataTransfer.files);
});

// --- Controls ---------------------------------------------------------------
$('addPhotos').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', (ev) => {
  addPhotoFiles(ev.target.files);
  ev.target.value = '';
});
$('useSamples').addEventListener('click', async () => {
  await loadSamples();
  fillAllPanels();
});
$('fillAll').addEventListener('click', () => fillAllPanels());
$('shufflePanels').addEventListener('click', shufflePanels);

document.querySelectorAll('#layoutRow button').forEach((b) =>
  b.addEventListener('click', () => setLayout(b.dataset.layout)));
document.querySelectorAll('#gradeRow button').forEach((b) =>
  b.addEventListener('click', () => setGrade(b.dataset.grade)));
document.querySelectorAll('#frameRow button').forEach((b) =>
  b.addEventListener('click', () => setFrame(b.dataset.frame)));
document.querySelectorAll('#sizeRow button').forEach((b) =>
  b.addEventListener('click', () => setSize(b.dataset.size)));
document.querySelectorAll('#captionPosRow button').forEach((b) =>
  b.addEventListener('click', () => setCaptionPosition(b.dataset.pos)));

$('zoomRange').addEventListener('input', (ev) => {
  const cfg = state.panels[state.selectedPanel];
  if (!cfg) return;
  cfg.zoom = Number(ev.target.value) / 100;
  $('zoomVal').textContent = ev.target.value + '%';
  render();
});
$('centerPanel').addEventListener('click', () => {
  const cfg = state.panels[state.selectedPanel];
  if (!cfg) return;
  cfg.panX = 0; cfg.panY = 0;
  render();
});
$('fitPanel').addEventListener('click', () => {
  const cfg = state.panels[state.selectedPanel];
  if (!cfg) return;
  cfg.panX = 0; cfg.panY = 0; cfg.zoom = 1;
  syncZoomControl();
  render();
});

$('captionText').addEventListener('input', (ev) => { state.caption.text = ev.target.value; render(); });
$('subtitleText').addEventListener('input', (ev) => { state.caption.subtitle = ev.target.value; render(); });
$('fontSelect').addEventListener('change', (ev) => { state.caption.font = ev.target.value; render(); });
$('captionColor').addEventListener('change', (ev) => { state.caption.color = ev.target.value; render(); });
$('captionSize').addEventListener('input', (ev) => {
  state.caption.sizePct = Number(ev.target.value);
  $('captionSizeVal').textContent = ev.target.value + '%';
  render();
});
$('capOutline').addEventListener('change', (ev) => { state.caption.outline = ev.target.checked; render(); });
$('capShadow').addEventListener('change', (ev) => { state.caption.shadow = ev.target.checked; render(); });
$('capUpper').addEventListener('change', (ev) => { state.caption.upper = ev.target.checked; render(); });
$('fxVignette').addEventListener('change', (ev) => { state.vignette = ev.target.checked; render(); });
$('fxGrain').addEventListener('change', (ev) => { state.grain = ev.target.checked; render(); });

async function downloadCover() {
  const { w, h } = EXPORT_SIZES[state.size];
  const blob = await exportPNG(state, photoImages(), w, h);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neon-poster-${w}x${h}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return blob;
}
$('downloadBtn').addEventListener('click', downloadCover);
$('downloadTop').addEventListener('click', downloadCover);

// --- Boot -------------------------------------------------------------------
async function loadSamples() {
  const have = new Set(photos.map((p) => p.name));
  if (!have.has('boulevard.jpg')) await addPhotoFromSrc('samples/boulevard.jpg', 'boulevard.jpg');
  if (!have.has('pier.jpg')) await addPhotoFromSrc('samples/pier.jpg', 'pier.jpg');
}

const ready = (async () => {
  await loadSamples();
  renderPool();
  syncZoomControl();
  render();
})();

// Handle for automated checks and screenshot scenes.
window.__studio = {
  state,
  photos,
  ready,
  render,
  setLayout,
  setGrade,
  setFrame,
  setSize,
  setCaptionPosition,
  assignPhotoToSelected,
  fillAllPanels,
  downloadCover,
  exportPNG: (w, h) => exportPNG(state, photoImages(), w, h),
  photoImages,
};
