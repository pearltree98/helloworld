import { h, fill, topbar, notice, formatDateTime } from '../ui/dom.js';
import { loadHistory, saveHistory, loadSettings } from '../core/store.js';
import { summarize, formatSec } from '../core/stats.js';
import { getRecording, clearRecordings, hasIDB } from '../core/recordings.js';
import { getPersona } from '../data/personas.js';
import { audioPlayer } from '../ui/audio.js';
import { SELF_CHECKS } from './practice.js';

export function historyScreen() {
  const settings = loadSettings();
  const urls = new Set();
  const content = h('div', { class: 'stack' });

  function recordingSlot(attempt) {
    const slot = h('div', {});
    if (!attempt.hasRecording || !hasIDB()) {
      fill(slot, h('p', { class: 'muted small' }, '녹음 없음'));
      return slot;
    }
    fill(
      slot,
      h(
        'button',
        {
          class: 'btn',
          onclick: async () => {
            fill(slot, h('p', { class: 'muted small' }, '불러오는 중…'));
            try {
              const rec = await getRecording(attempt.id);
              if (!rec?.blob) {
                fill(slot, h('p', { class: 'muted small' }, `녹음이 지워졌습니다 (최근 ${settings.recordingCap}개만 보관).`));
                return;
              }
              const url = URL.createObjectURL(rec.blob);
              urls.add(url);
              fill(slot, audioPlayer(url));
            } catch (err) {
              fill(slot, notice(`녹음을 불러오지 못했습니다: ${err.message}`, 'error'));
            }
          },
        },
        '▶ 녹음 듣기',
      ),
    );
    return slot;
  }

  function attemptView(a) {
    const persona = getPersona(a.personaId);
    return h(
      'div',
      { class: 'attempt' },
      h('strong', {}, a.question),
      h(
        'div',
        { class: 'kv' },
        persona && h('span', {}, persona.name),
        h('span', {}, '반응 ', h('b', { class: a.skipped || a.late ? 'v late' : 'v ok' }, a.skipped ? '건너뜀' : a.reactionMs == null ? '감지 안 됨' : formatSec(a.reactionMs))),
        !a.skipped && h('span', {}, '답변 ', h('b', {}, formatSec(a.answerMs))),
        a.avgLevel != null && h('span', {}, '음량 ', h('b', {}, String(Math.round(a.avgLevel)))),
        a.replays > 0 && h('span', {}, '다시 듣기 ', h('b', {}, `${a.replays}회`)),
        a.retry && h('span', { class: 'badge' }, '다시 풀기'),
      ),
      a.transcript && h('p', { class: 'transcript' }, a.transcript),
      !a.skipped &&
        h(
          'div',
          { class: 'kv' },
          SELF_CHECKS.map(({ key, label }) => h('span', {}, `${a.selfEval?.[key] ? '✓' : '·'} ${label}`)),
        ),
      !a.skipped && recordingSlot(a),
    );
  }

  function render() {
    const history = loadHistory();
    if (history.length === 0) {
      fill(content, notice('아직 기록이 없습니다. 연습을 한 번 해 보세요.'), h('a', { class: 'btn btn-primary btn-block', href: '#/practice' }, '연습 시작'));
      return;
    }
    const recent = history
      .slice(0, 7)
      .map((s) => ({ s, sum: summarize(s.items || []) }))
      .filter((x) => x.sum.avgReactionMs != null);
    fill(
      content,
      recent.length > 1 &&
        h(
          'section',
          { class: 'card' },
          h('h2', {}, '평균 반응 시간 (최근 순)'),
          h('p', { class: 'reaction-out' }, recent.map((x) => formatSec(x.sum.avgReactionMs)).join(' ← ')),
        ),
      history.map((s) => {
        const sum = summarize(s.items || []);
        return h(
          'details',
          { class: 'session' },
          h(
            'summary',
            {},
            h('strong', {}, `${formatDateTime(s.startedAt)}${s.mode === 'retry' ? ' · 오답만' : ''}`),
            h('span', { class: 'muted small' }, `${sum.count}문항 · 평균 반응 ${formatSec(sum.avgReactionMs)} · 다시 풀기 ${sum.retryCount}`),
          ),
          (s.items || []).map(attemptView),
        );
      }),
      h('button', { class: 'btn btn-danger btn-block', onclick: clearAll }, '기록·녹음 전체 삭제'),
    );
  }

  async function clearAll() {
    if (!window.confirm('모든 연습 기록과 녹음을 지울까요? 되돌릴 수 없습니다. (질문 은행과 상자 상태는 그대로입니다)')) return;
    saveHistory([]);
    if (hasIDB()) await clearRecordings().catch(() => {});
    render();
  }

  render();

  return {
    el: h('main', { class: 'screen history' }, topbar('기록'), content),
    title: '기록',
    destroy() {
      urls.forEach((url) => URL.revokeObjectURL(url));
    },
  };
}
