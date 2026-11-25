// Customer avatar drawn as SVG (an illustration, never a photo of a real person).
// Three mouth frames (closed / half / open) drive the fake lip sync; eyes blink every 3–5 s.
import { s } from './dom.js';
import { newId } from '../core/ids.js';

export const MOUTH_FRAMES = ['closed', 'half', 'open'];

function hair(look, layer) {
  const fill = look.hair;
  if (look.hairStyle === 'bob') {
    return layer === 'back'
      ? s('path', { fill, d: 'M52 120 C42 70 66 34 100 34 C134 34 158 70 148 120 C146 127 137 129 133 124 L133 92 L67 92 L67 124 C63 129 54 127 52 120 Z' })
      : s('path', { fill, d: 'M59 88 C60 56 80 41 100 41 C123 41 141 56 141 88 C130 72 113 64 96 66 C83 68 69 76 59 88 Z' });
  }
  if (layer === 'back') return null;
  if (look.hairStyle === 'receding') {
    return s(
      'g',
      { fill },
      s('path', { d: 'M60 100 C57 80 61 66 71 58 C68 72 68 86 70 100 Z' }),
      s('path', { d: 'M140 100 C143 80 139 66 129 58 C132 72 132 86 130 100 Z' }),
      s('path', { d: 'M78 52 C90 45 110 45 122 52 C110 49 90 49 78 52 Z' }),
    );
  }
  return s('path', { fill, d: 'M58 94 C53 56 74 37 100 37 C128 37 149 56 142 94 C140 79 134 69 126 63 C111 71 88 71 66 66 C61 74 59 84 58 94 Z' });
}

function build(persona) {
  const look = persona.look;
  const clipId = newId('clip-');
  const brow = look.hairStyle === 'receding' ? '#6f6a66' : look.hair;

  const mouths = {
    closed: s('path', { d: 'M90 121 Q100 126 110 121', fill: 'none', stroke: '#8a3b33', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    half: s(
      'g',
      {},
      s('path', { d: 'M89 119 Q100 116 111 119 Q100 129 89 119 Z', fill: '#7a2a24' }),
      s('path', { d: 'M92 119.2 Q100 117.6 108 119.2 L107.4 120.6 Q100 119.6 92.6 120.6 Z', fill: '#ffffff' }),
    ),
    open: s(
      'g',
      {},
      s('path', { d: 'M88 116 Q100 112.5 112 116 Q110 135 100 135 Q90 135 88 116 Z', fill: '#6b221d' }),
      s('path', { d: 'M91 116.6 Q100 114.6 109 116.6 L108.2 119.6 Q100 118.4 91.8 119.6 Z', fill: '#ffffff' }),
      s('ellipse', { cx: 100, cy: 130, rx: 6.5, ry: 3.6, fill: '#e0736b' }),
    ),
  };

  const eyesOpen = s(
    'g',
    {},
    s('ellipse', { cx: 82, cy: 88, rx: 4.6, ry: 5.6, fill: '#2a2522' }),
    s('ellipse', { cx: 118, cy: 88, rx: 4.6, ry: 5.6, fill: '#2a2522' }),
    s('circle', { cx: 83.6, cy: 86.4, r: 1.4, fill: '#ffffff' }),
    s('circle', { cx: 119.6, cy: 86.4, r: 1.4, fill: '#ffffff' }),
  );
  const eyesClosed = s(
    'g',
    { display: 'none', fill: 'none', stroke: '#2a2522', 'stroke-width': 2.6, 'stroke-linecap': 'round' },
    s('path', { d: 'M77 89 Q82 92.5 87 89' }),
    s('path', { d: 'M113 89 Q118 92.5 123 89' }),
  );

  const el = s(
    'svg',
    { class: 'avatar', viewBox: '0 0 200 200', role: 'img', 'aria-label': `${persona.name} (${persona.label}) 일러스트` },
    s('defs', {}, s('clipPath', { id: clipId }, s('circle', { cx: 100, cy: 100, r: 100 }))),
    s(
      'g',
      { 'clip-path': `url(#${clipId})` },
      s('rect', { width: 200, height: 200, fill: look.bg }),
      hair(look, 'back'),
      s('path', { d: 'M24 204 C26 168 58 150 100 150 C142 150 174 168 176 204 Z', fill: look.outfit }),
      s('path', { d: 'M82 151 L100 184 L118 151 Z', fill: look.shirt }),
      look.tie && s('path', { d: 'M95.5 158 L104.5 158 L108 190 L100 199 L92 190 Z', fill: look.tie }),
      look.tie && s('path', { d: 'M94.5 151 L105.5 151 L103.5 160 L96.5 160 Z', fill: look.tie }),
      s('path', { d: 'M86 126 L86 152 Q100 161 114 152 L114 126 Z', fill: look.skinShade }),
      s('ellipse', { cx: 60, cy: 96, rx: 7, ry: 11, fill: look.skinShade }),
      s('ellipse', { cx: 140, cy: 96, rx: 7, ry: 11, fill: look.skinShade }),
      s('ellipse', { cx: 100, cy: 92, rx: 40, ry: 46, fill: look.skin }),
      hair(look, 'front'),
      look.hairStyle === 'receding' &&
        s(
          'g',
          { fill: 'none', stroke: look.skinShade, 'stroke-width': 1.6, 'stroke-linecap': 'round' },
          s('path', { d: 'M84 62 Q100 58 116 62' }),
          s('path', { d: 'M88 68 Q100 65 112 68' }),
        ),
      s(
        'g',
        { fill: 'none', stroke: brow, 'stroke-width': 3.2, 'stroke-linecap': 'round' },
        s('path', { d: 'M73 76 Q81 71.5 90 75' }),
        s('path', { d: 'M110 75 Q119 71.5 127 76' }),
      ),
      eyesOpen,
      eyesClosed,
      look.glasses &&
        s(
          'g',
          { fill: 'none', stroke: '#3b3633', 'stroke-width': 2.4 },
          s('circle', { cx: 82, cy: 88, r: 11 }),
          s('circle', { cx: 118, cy: 88, r: 11 }),
          s('path', { d: 'M93 88 Q100 84 107 88' }),
        ),
      s('path', { d: 'M100 93 Q96 104 99.5 106 Q102.5 107.2 105 105.4', fill: 'none', stroke: look.skinShade, 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
      s('ellipse', { cx: 72, cy: 107, rx: 7, ry: 4, fill: '#ff8f7a', opacity: 0.3 }),
      s('ellipse', { cx: 128, cy: 107, rx: 7, ry: 4, fill: '#ff8f7a', opacity: 0.3 }),
      mouths.closed,
      mouths.half,
      mouths.open,
    ),
  );
  return { el, mouths, eyesOpen, eyesClosed };
}

/** A static avatar for thumbnails. */
export function avatarImage(persona) {
  const { el, mouths } = build(persona);
  mouths.half.setAttribute('display', 'none');
  mouths.open.setAttribute('display', 'none');
  el.setAttribute('class', 'avatar-thumb');
  return el;
}

/** The animated avatar on the practice screen. */
export function createAvatar(persona, { random = Math.random } = {}) {
  const { el, mouths, eyesOpen, eyesClosed } = build(persona);
  let mouth = 'closed';
  let talkTimer = 0;
  let blinkTimer = 0;
  let blinkEnd = 0;
  let destroyed = false;

  function setMouth(name) {
    mouth = name;
    for (const [key, node] of Object.entries(mouths)) node.setAttribute('display', key === name ? 'inline' : 'none');
    el.dataset.mouth = name;
  }

  function stopTalking() {
    clearInterval(talkTimer);
    talkTimer = 0;
    el.dataset.talking = 'false';
    setMouth('closed');
  }

  // Random frame every ~120 ms while the voice is speaking.
  function startTalking() {
    clearInterval(talkTimer);
    el.dataset.talking = 'true';
    talkTimer = setInterval(() => {
      const options = MOUTH_FRAMES.filter((f) => f !== mouth);
      setMouth(options[Math.floor(random() * options.length)]);
    }, 120);
  }

  // A word boundary from the speech engine: open the mouth right now.
  const pulseOpen = () => setMouth('open');

  function scheduleBlink() {
    if (destroyed) return;
    blinkTimer = setTimeout(() => {
      eyesOpen.setAttribute('display', 'none');
      eyesClosed.setAttribute('display', 'inline');
      blinkEnd = setTimeout(() => {
        eyesOpen.setAttribute('display', 'inline');
        eyesClosed.setAttribute('display', 'none');
        scheduleBlink();
      }, 140);
    }, 3000 + random() * 2000);
  }

  setMouth('closed');
  scheduleBlink();

  return {
    el,
    startTalking,
    stopTalking,
    pulseOpen,
    get mouth() {
      return mouth;
    },
    destroy() {
      destroyed = true;
      clearInterval(talkTimer);
      clearTimeout(blinkTimer);
      clearTimeout(blinkEnd);
    },
  };
}
