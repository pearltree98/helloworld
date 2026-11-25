// Horizontal loudness bar (0–100) with two marks: where speech counts as
// started, and the "너무 작음" line the answer's average should clear.
import { h } from './dom.js';

export function createMeter({ quietLevel, speechLevel, caption = '음량' }) {
  const fill = h('div', { class: 'meter-fill' });
  const quietMark = h('div', { class: 'meter-mark', title: '너무 작음 기준선' });
  const speechMark = h('div', { class: 'meter-mark speech', title: '말 시작 감지' });
  const bar = h(
    'div',
    { class: 'meter', role: 'meter', 'aria-label': caption, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 },
    fill,
    speechMark,
    quietMark,
  );
  const quietText = h('span', {});
  const el = h('div', { class: 'meter-wrap' }, bar, h('div', { class: 'meter-caption' }, h('span', {}, caption), quietText));
  let quiet = quietLevel;

  function setMarks(nextQuiet, nextSpeech) {
    quiet = nextQuiet;
    quietMark.style.left = `${nextQuiet}%`;
    speechMark.style.left = `${nextSpeech}%`;
    quietText.textContent = `기준선 ${nextQuiet}`;
  }

  setMarks(quietLevel, speechLevel);

  return {
    el,
    setMarks,
    set(level) {
      fill.style.transform = `scaleX(${Math.max(0, Math.min(100, level)) / 100})`;
      bar.classList.toggle('loud', level >= quiet);
      bar.setAttribute('aria-valuenow', String(Math.round(level)));
    },
  };
}
