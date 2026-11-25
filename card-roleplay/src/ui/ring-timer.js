// Circular countdown used for both stages: ① 반응 (reaction) and ② 답변 (answer).
import { h, s } from './dom.js';

const R = 44;
const C = 2 * Math.PI * R;

export function createRingTimer() {
  const bar = s('circle', {
    class: 'ring-bar',
    cx: 50,
    cy: 50,
    r: R,
    'stroke-dasharray': C.toFixed(2),
    'stroke-dashoffset': 0,
    transform: 'rotate(-90 50 50)',
  });
  const value = h('div', { class: 'ring-value' });
  const label = h('div', { class: 'ring-label' });
  const el = h(
    'div',
    { class: 'ring', dataset: { tone: 'idle' }, role: 'timer' },
    s('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' }, s('circle', { class: 'ring-track', cx: 50, cy: 50, r: R }), bar),
    h('div', { class: 'ring-center' }, value, label),
  );

  let raf = 0;
  let timeout = 0;

  const draw = (fraction, leftMs) => {
    bar.setAttribute('stroke-dashoffset', (C * (1 - fraction)).toFixed(2));
    value.textContent = leftMs >= 10000 ? String(Math.ceil(leftMs / 1000)) : (leftMs / 1000).toFixed(1);
  };

  function stop() {
    cancelAnimationFrame(raf);
    clearTimeout(timeout);
  }

  return {
    el,
    /** Counts down `durationMs` from `startedAt` (performance.now() time) and calls onExpire once. */
    start(durationMs, { label: text, tone, startedAt = performance.now(), onExpire }) {
      stop();
      el.dataset.tone = tone;
      label.textContent = text;
      const end = startedAt + durationMs;
      const frame = () => {
        const left = Math.max(0, end - performance.now());
        draw(left / durationMs, left);
        if (left > 0) raf = requestAnimationFrame(frame);
      };
      frame();
      timeout = setTimeout(() => {
        cancelAnimationFrame(raf);
        draw(0, 0);
        onExpire?.();
      }, Math.max(0, end - performance.now()));
    },
    idle(text, tone = 'idle') {
      stop();
      el.dataset.tone = tone;
      label.textContent = text;
      value.textContent = '';
      bar.setAttribute('stroke-dashoffset', '0');
    },
    stop,
  };
}
