// Neon Poster Studio — deterministic screenshot scenes.
// Open the app with ?shot=<scene> to stage a fixed editor state or a bare
// full-frame cover, so screenshots are reproducible. Sets window.__shotReady
// when the scene has rendered.

import { drawCover } from './composer.js';

const params = new URLSearchParams(location.search);
const scene = params.get('shot');

function setCaption(studio, patch) {
  Object.assign(studio.state.caption, patch);
  const cap = studio.state.caption;
  document.getElementById('captionText').value = cap.text;
  document.getElementById('subtitleText').value = cap.subtitle;
  document.getElementById('fontSelect').value = cap.font;
  document.getElementById('captionColor').value = cap.color;
  document.getElementById('captionSize').value = String(cap.sizePct);
  document.getElementById('captionSizeVal').textContent = cap.sizePct + '%';
  document.getElementById('capOutline').checked = cap.outline;
  document.getElementById('capShadow').checked = cap.shadow;
  document.getElementById('capUpper').checked = cap.upper;
  studio.setCaptionPosition(cap.position);
}

// Draw only the cover, filling the viewport at an exact pixel size: the app's
// own drawing of an exported cover, scaled to the screenshot limits.
function bareCover(studio, w, h) {
  document.body.classList.add('shot-cover');
  const canvas = document.getElementById('stage');
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  drawCover(canvas.getContext('2d'), w, h, studio.state, studio.photoImages(), { showSelection: false });
}

async function stageScene(name) {
  const studio = window.__studio;
  if (!studio) return;
  await studio.ready;
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  if (name === 'editor1') {
    studio.setLayout('grid');
    studio.setGrade('vice');
    studio.setFrame('poster');
    studio.setSize('1920x1080');
    setCaption(studio, { text: 'NEON SHORES', subtitle: 'vice city nights', font: 'black', color: 'sunset', sizePct: 12, position: 'bottom' });
    studio.state.panels[0].zoom = 1;
    studio.state.panels[1].zoom = 1.15;
    studio.state.panels[2].zoom = 1.05;
    studio.state.panels[3].zoom = 1.2;
    studio.state.selectedPanel = 0;
    studio.render();
  } else if (name === 'editor2') {
    studio.setLayout('trio');
    studio.setGrade('neon');
    studio.setFrame('neon');
    studio.setSize('1080x1350');
    studio.state.grain = true;
    document.getElementById('fxGrain').checked = true;
    setCaption(studio, { text: 'MIDNIGHT RUN', subtitle: 'neon district', font: 'impact', color: 'neon', sizePct: 13, position: 'bottom' });
    studio.state.panels[0].zoom = 1.1;
    studio.state.panels[0].panY = 0.18;
    studio.state.panels[1].panY = 0.1;
    studio.state.panels[2].panY = 0.1;
    studio.state.selectedPanel = 0;
    studio.render();
    // Show the caption and export groups in this shot (editor1 shows the top groups).
    const controls = document.getElementById('controls');
    controls.scrollTop = controls.scrollHeight;
  } else if (name === 'cover1') {
    studio.setLayout('grid');
    studio.setGrade('vice');
    studio.setFrame('poster');
    setCaption(studio, { text: 'NEON SHORES', subtitle: 'vice city nights', font: 'black', color: 'sunset', sizePct: 12, position: 'bottom' });
    studio.state.panels[0].zoom = 1;
    studio.state.panels[0].panY = 0.2;
    studio.state.panels[1].zoom = 1.15;
    studio.state.panels[1].panY = 0.14;
    studio.state.panels[2].zoom = 1.05;
    studio.state.panels[2].panY = 0.14;
    studio.state.panels[3].zoom = 1.2;
    studio.state.panels[3].panY = 0.2;
    bareCover(studio, 1280, 720);
  } else if (name === 'cover2') {
    studio.setLayout('strip');
    studio.setGrade('golden');
    studio.setFrame('poster');
    setCaption(studio, { text: 'GOLDEN HOUR', subtitle: 'last light on the pier', font: 'black', color: 'gold', sizePct: 11, position: 'top' });
    studio.state.panels[0].photo = 1;
    studio.state.panels[0].panY = 0.28;
    studio.state.panels[1].photo = 0;
    studio.state.panels[1].panY = 0.2;
    studio.state.panels[2].photo = 1;
    studio.state.panels[2].panY = 0.12;
    studio.state.panels[3].photo = 0;
    studio.state.panels[3].panY = 0.2;
    bareCover(studio, 1024, 1280);
  } else {
    return;
  }
  window.__shotReady = true;
}

if (scene) {
  stageScene(scene);
}
