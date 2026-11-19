// Neon Poster Studio — cover composer.
// Draws a multi-panel GTA-style poster cover onto any 2D canvas context:
// panel layouts, per-photo crop/pan/zoom, colour grades, poster frame,
// bold caption lettering, vignette and grain. Pure canvas, no libraries.

export const EXPORT_SIZES = {
  '1080x1350': { w: 1080, h: 1350, label: '1080×1350 Portrait' },
  '1080x1080': { w: 1080, h: 1080, label: '1080×1080 Square' },
  '1200x630': { w: 1200, h: 630, label: '1200×630 Wide' },
  '1920x1080': { w: 1920, h: 1080, label: '1920×1080 HD' },
};

export const LAYOUT_NAMES = {
  full: 'Full',
  split: 'Split',
  trio: 'Trio',
  grid: 'Grid 2×2',
  strip: 'Strip',
};

export const GRADE_NAMES = {
  vice: 'Vice Sunset',
  neon: 'Neon Night',
  golden: 'Golden Hour',
  vhs: 'Retro VHS',
  clean: 'Clean',
};

// Panel rectangles for each layout, inside the frame's inner area.
// Returns [{x, y, w, h}, ...] in cover pixels.
export function panelRects(layout, W, H, inner) {
  const g = inner.gutter;
  const x0 = inner.x, y0 = inner.y, w = inner.w, h = inner.h;
  switch (layout) {
    case 'full':
      return [{ x: x0, y: y0, w, h }];
    case 'split': {
      const pw = (w - g) / 2;
      return [
        { x: x0, y: y0, w: pw, h },
        { x: x0 + pw + g, y: y0, w: pw, h },
      ];
    }
    case 'trio': {
      const bigW = Math.round((w - g) * 0.56);
      const smallW = w - g - bigW;
      const smallH = (h - g) / 2;
      return [
        { x: x0, y: y0, w: bigW, h },
        { x: x0 + bigW + g, y: y0, w: smallW, h: smallH },
        { x: x0 + bigW + g, y: y0 + smallH + g, w: smallW, h: smallH },
      ];
    }
    case 'strip': {
      const heroH = Math.round((h - g) * 0.62);
      const stripH = h - g - heroH;
      const cellW = (w - 2 * g) / 3;
      return [
        { x: x0, y: y0, w, h: heroH },
        { x: x0, y: y0 + heroH + g, w: cellW, h: stripH },
        { x: x0 + cellW + g, y: y0 + heroH + g, w: cellW, h: stripH },
        { x: x0 + 2 * (cellW + g), y: y0 + heroH + g, w: cellW, h: stripH },
      ];
    }
    case 'grid':
    default: {
      const pw = (w - g) / 2;
      const ph = (h - g) / 2;
      return [
        { x: x0, y: y0, w: pw, h: ph },
        { x: x0 + pw + g, y: y0, w: pw, h: ph },
        { x: x0, y: y0 + ph + g, w: pw, h: ph },
        { x: x0 + pw + g, y: y0 + ph + g, w: pw, h: ph },
      ];
    }
  }
}

// How many panels each layout needs.
export function panelCount(layout) {
  return { full: 1, split: 2, trio: 3, grid: 4, strip: 4 }[layout] || 4;
}

// Cover-fit draw rectangle for a photo inside a panel, with zoom and pan.
// panX/panY are fractions of the panel size (-0.5..0.5-ish), clamped so the
// photo always covers the panel.
export function coverFit(imgW, imgH, panel, zoom, panX, panY) {
  const base = Math.max(panel.w / imgW, panel.h / imgH);
  const scale = base * Math.max(1, zoom || 1);
  const dw = imgW * scale;
  const dh = imgH * scale;
  const maxOffX = Math.max(0, (dw - panel.w) / 2);
  const maxOffY = Math.max(0, (dh - panel.h) / 2);
  const offX = clamp((panX || 0) * panel.w, -maxOffX, maxOffX);
  const offY = clamp((panY || 0) * panel.h, -maxOffY, maxOffY);
  return {
    x: panel.x + (panel.w - dw) / 2 + offX,
    y: panel.y + (panel.h - dh) / 2 + offY,
    w: dw,
    h: dh,
  };
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// Colour grade definitions: a canvas filter plus gradient overlays.
const GRADES = {
  vice: {
    filter: 'saturate(1.38) contrast(1.09) brightness(1.05) sepia(0.16) hue-rotate(-8deg)',
    overlays: [
      { kind: 'linear', blend: 'overlay', stops: [[0, 'rgba(255,138,61,0.55)'], [0.45, 'rgba(255,41,117,0.35)'], [1, 'rgba(80,16,140,0.55)']] },
      { kind: 'sun', blend: 'screen', cx: 0.78, cy: 0.16, r: 0.55, stops: [[0, 'rgba(255,214,120,0.5)'], [1, 'rgba(255,214,120,0)']] },
      { kind: 'linear', blend: 'soft-light', stops: [[0, 'rgba(255,180,90,0.35)'], [1, 'rgba(40,0,90,0.35)']] },
    ],
  },
  neon: {
    filter: 'saturate(1.55) contrast(1.2) brightness(0.99) hue-rotate(6deg)',
    overlays: [
      { kind: 'linear', blend: 'overlay', stops: [[0, 'rgba(34,211,238,0.4)'], [0.5, 'rgba(20,10,60,0.25)'], [1, 'rgba(255,41,117,0.45)']] },
      { kind: 'sun', blend: 'screen', cx: 0.15, cy: 0.85, r: 0.6, stops: [[0, 'rgba(255,41,117,0.35)'], [1, 'rgba(255,41,117,0)']] },
      { kind: 'sun', blend: 'screen', cx: 0.88, cy: 0.2, r: 0.55, stops: [[0, 'rgba(34,211,238,0.32)'], [1, 'rgba(34,211,238,0)']] },
    ],
  },
  golden: {
    filter: 'saturate(1.28) contrast(1.06) brightness(1.09) sepia(0.34)',
    overlays: [
      { kind: 'linear', blend: 'soft-light', stops: [[0, 'rgba(255,190,80,0.6)'], [1, 'rgba(150,60,10,0.45)']] },
      { kind: 'sun', blend: 'screen', cx: 0.5, cy: 0.12, r: 0.7, stops: [[0, 'rgba(255,226,150,0.55)'], [1, 'rgba(255,226,150,0)']] },
    ],
  },
  vhs: {
    filter: 'saturate(0.82) contrast(1.06) brightness(1.03)',
    ghost: true,
    scanlines: true,
    overlays: [
      { kind: 'linear', blend: 'soft-light', stops: [[0, 'rgba(120,90,255,0.3)'], [1, 'rgba(255,90,160,0.25)']] },
    ],
  },
  clean: { filter: 'none', overlays: [] },
};

function applyOverlay(ctx, rect, ov) {
  let grad;
  if (ov.kind === 'sun') {
    const cx = rect.x + ov.cx * rect.w;
    const cy = rect.y + ov.cy * rect.h;
    const r = ov.r * Math.max(rect.w, rect.h);
    grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  } else {
    grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  }
  for (const [at, color] of ov.stops) grad.addColorStop(at, color);
  ctx.save();
  ctx.globalCompositeOperation = ov.blend || 'source-over';
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

let scanlinePattern = null;
function getScanlines(ctx) {
  if (scanlinePattern) return scanlinePattern;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 4;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, 3, 4, 1);
  scanlinePattern = ctx.createPattern(c, 'repeat');
  return scanlinePattern;
}

let noiseCanvas = null;
function getNoiseCanvas() {
  if (noiseCanvas) return noiseCanvas;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseCanvas = c;
  return c;
}

// Draw one photo into a panel with the grade applied.
function drawPanelPhoto(ctx, img, panel, cfg, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  if (!img) {
    const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
    grad.addColorStop(0, '#2a1d55');
    grad.addColorStop(1, '#120a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${Math.max(14, panel.h * 0.07)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ PHOTO', panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.restore();
    return;
  }
  const fit = coverFit(img.naturalWidth || img.width, img.naturalHeight || img.height, panel, cfg.zoom, cfg.panX, cfg.panY);
  try { ctx.filter = grade.filter || 'none'; } catch (e) { /* older canvas: no filter */ }
  if (grade.ghost) {
    const off = Math.max(2, panel.w * 0.006);
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(img, fit.x - off, fit.y, fit.w, fit.h);
    ctx.drawImage(img, fit.x + off, fit.y, fit.w, fit.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
  try { ctx.filter = 'none'; } catch (e) { /* ignore */ }
  for (const ov of grade.overlays || []) applyOverlay(ctx, panel, ov);
  if (grade.scanlines) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = getScanlines(ctx);
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.restore();
  }
  ctx.restore();
}

const FONT_STACKS = {
  black: { weight: 900, family: '"Arial Black", "Archivo Black", "Liberation Sans", Arial, sans-serif', spacing: 0.01 },
  impact: { weight: 700, family: 'Impact, "Arial Narrow Bold", "Liberation Sans Narrow", "Arial Narrow", sans-serif', spacing: 0.03 },
  condensed: { weight: 700, family: '"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif', spacing: 0.05 },
  serif: { weight: 900, family: 'Georgia, "Liberation Serif", "Times New Roman", serif', spacing: 0.01 },
  mono: { weight: 700, family: '"Courier New", "Liberation Mono", monospace', spacing: 0.02 },
};

const CAPTION_COLORS = {
  sunset: { gradient: ['#ffd319', '#ff8a3d', '#ff2975', '#c724ff'] },
  white: { solid: '#ffffff' },
  neon: { solid: '#ff4d9d' },
  gold: { gradient: ['#fff3b0', '#ffd319', '#ff9f1c'] },
  cyan: { solid: '#4de8ff' },
};

function captionFill(ctx, colorKey, x, yTop, height) {
  const def = CAPTION_COLORS[colorKey] || CAPTION_COLORS.white;
  if (def.solid) return def.solid;
  const grad = ctx.createLinearGradient(0, yTop, 0, yTop + height);
  const stops = def.gradient;
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  return grad;
}

// Wrap the title into at most two lines that fit maxWidth at the given font.
function wrapTitle(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const trial = line + ' ' + words[i];
    if (ctx.measureText(trial).width <= maxWidth || !line) {
      line = trial;
    } else {
      lines.push(line);
      line = words[i];
      if (lines.length === 2) break;
    }
  }
  if (lines.length < 2 && line) lines.push(line);
  return lines.slice(0, 2);
}

// Draw the bold poster caption (title + subtitle) over the cover.
export function drawCaption(ctx, W, H, cap) {
  const title = (cap.upper ? (cap.text || '').toUpperCase() : (cap.text || '')).trim();
  const subtitle = (cap.subtitle || '').trim();
  if (!title && !subtitle) return;
  const fontDef = FONT_STACKS[cap.font] || FONT_STACKS.black;
  let size = Math.max(10, (H * (cap.sizePct || 12)) / 100);
  const maxWidth = W * 0.92;
  const setFont = (px) => {
    ctx.font = `${fontDef.weight} ${px}px ${fontDef.family}`;
    try { ctx.letterSpacing = `${Math.round(px * fontDef.spacing)}px`; } catch (e) { /* not everywhere */ }
  };
  setFont(size);
  let lines = wrapTitle(ctx, title, maxWidth);
  // Shrink until every line fits (single long word case).
  while (size > 10 && lines.some((l) => ctx.measureText(l).width > maxWidth)) {
    size *= 0.92;
    setFont(size);
    lines = wrapTitle(ctx, title, maxWidth);
  }
  const lineH = size * 1.04;
  const subSize = Math.max(10, size * 0.34);
  const blockH = lines.length * lineH + (subtitle ? subSize * 1.5 : 0);
  let yTop;
  if (cap.position === 'top') yTop = H * 0.045;
  else if (cap.position === 'center') yTop = (H - blockH) / 2;
  else yTop = H - blockH - H * 0.045;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (cap.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.06;
  }
  lines.forEach((line, i) => {
    const y = yTop + i * lineH;
    if (cap.outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.16;
      ctx.strokeStyle = 'rgba(10,4,24,0.92)';
      ctx.strokeText(line, W / 2, y);
    }
    ctx.fillStyle = captionFill(ctx, cap.color, 0, y, size);
    ctx.fillText(line, W / 2, y);
  });
  if (subtitle) {
    const sy = yTop + lines.length * lineH + subSize * 0.35;
    ctx.font = `italic 700 ${subSize}px Georgia, "Liberation Serif", serif`;
    try { ctx.letterSpacing = '1px'; } catch (e) { /* ignore */ }
    if (cap.outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = subSize * 0.18;
      ctx.strokeStyle = 'rgba(10,4,24,0.9)';
      ctx.strokeText(subtitle, W / 2, sy);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, W / 2, sy);
  }
  ctx.restore();
}

// The whole cover. state.panels[i] = {photo, panX, panY, zoom} where photo is
// an index into photos (HTMLImageElement|null). opts.showSelection draws the
// editor's selection outline (preview only, never in exports).
export function drawCover(ctx, W, H, state, photos, opts = {}) {
  const frame = state.frame || 'poster';
  const minSide = Math.min(W, H);
  const margin = frame === 'none' ? minSide * 0.008 : minSide * 0.032;
  const gutter = frame === 'poster' ? minSide * 0.016 : minSide * 0.01;

  // Poster backing.
  ctx.fillStyle = frame === 'poster' ? '#f7f3ea' : '#0b0714';
  ctx.fillRect(0, 0, W, H);

  const inner = { x: margin, y: margin, w: W - 2 * margin, h: H - 2 * margin, gutter };
  const rects = panelRects(state.layout, W, H, inner);
  const grade = GRADES[state.grade] || GRADES.clean;

  rects.forEach((rect, i) => {
    const cfg = state.panels[i] || { photo: -1, panX: 0, panY: 0, zoom: 1 };
    const img = cfg.photo >= 0 ? photos[cfg.photo] : null;
    drawPanelPhoto(ctx, img, rect, cfg, grade);
  });

  // Neon frame edge with a soft glow.
  if (frame === 'neon') {
    ctx.save();
    ctx.strokeStyle = '#ff2975';
    ctx.lineWidth = Math.max(2, minSide * 0.006);
    ctx.shadowColor = '#ff2975';
    ctx.shadowBlur = minSide * 0.02;
    ctx.strokeRect(margin / 2, margin / 2, W - margin, H - margin);
    ctx.restore();
  }

  // Vignette.
  if (state.vignette) {
    const r = Math.hypot(W, H) / 2;
    const grad = ctx.createRadialGradient(W / 2, H / 2, r * 0.55, W / 2, H / 2, r);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Film grain.
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(getNoiseCanvas(), 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawCaption(ctx, W, H, state.caption);

  // Editor-only selection outline.
  if (opts.showSelection && rects[state.selectedPanel]) {
    const r = rects[state.selectedPanel];
    ctx.save();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = Math.max(2, minSide * 0.005);
    ctx.setLineDash([minSide * 0.02, minSide * 0.012]);
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    ctx.restore();
  }
  return rects;
}

// Render the cover to a fresh canvas at the requested pixel size.
export function renderCoverCanvas(state, photos, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, state, photos, { showSelection: false });
  return canvas;
}

// Export the cover as a PNG Blob at full size.
export function exportPNG(state, photos, w, h) {
  return new Promise((resolve, reject) => {
    const canvas = renderCoverCanvas(state, photos, w, h);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
}
