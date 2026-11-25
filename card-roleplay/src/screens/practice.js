import { h, fill, topbar, notice } from '../ui/dom.js';
import { navigate } from '../nav.js';
import { loadSettings } from '../core/store.js';
import { formatSec } from '../core/stats.js';
import { createOnsetDetector } from '../core/onset.js';
import { resolvePersona } from '../data/personas.js';
import { createAvatar, avatarImage } from '../ui/avatar.js';
import { createRingTimer } from '../ui/ring-timer.js';
import { speak, waitForVoices, koreanVoices, hasTTS } from '../media/tts.js';
import { hasSTT, createRecognizer, sttErrorMessage } from '../media/stt.js';
import { hasMic, openMic, stopStream, createLevelMonitor, micErrorMessage } from '../media/mic.js';
import { createStaticProvider } from '../providers/question-provider.js';

// Phases of one question:
//   asking    → the customer speaks (TTS + lip sync)
//   reaction  → ① 반응 타이머 runs until the voice starts (or the limit passes)
//   answering → ② 답변 타이머 runs until [답변 끝] or the limit
//   saving    → stopping recorder/recognizer
//   result    → result card for this question

export function practiceScreen(route) {
  const mode = route.query.get('mode') === 'retry' ? 'retry' : 'normal';
  const settings = loadSettings();
  const provider = createStaticProvider();
  const reactionLimitMs = settings.reactionLimitSec * 1000;
  const answerLimitMs = settings.answerLimitSec * 1000;

  const counter = h('span', {}, '');
  const body = h('div', { class: 'practice-body' });
  const el = h('main', { class: 'screen practice' }, topbar(mode === 'retry' ? '오답만 풀기' : '연습', { right: counter }), body);

  let items = [];
  let index = 0;
  let phase = 'idle';
  let runId = 0;
  let disposed = false;

  let stream = null;
  let monitor = null;
  let sttProblem = !hasSTT() ? 'unsupported' : !settings.transcribe ? 'off' : null;

  let avatar = null;
  let view = null;
  let speech = null;
  let listen = null; // state of the current reaction/answer window
  let item = null; // { question, persona, replays }

  // ---------- setup ----------

  function supportNotices() {
    const list = [];
    if (!hasTTS()) list.push(notice('이 브라우저는 음성 읽기를 지원하지 않아 자막으로만 진행합니다.', 'warn'));
    else if (koreanVoices().length === 0)
      list.push(notice('한국어 음성이 없어 자막으로 진행합니다. 안드로이드 설정 › 텍스트 음성 변환에서 Google 음성 엔진의 한국어 데이터를 설치하세요.', 'warn'));
    if (sttProblem === 'off') list.push(notice('전사가 꺼져 있습니다(설정). 말 시작은 음량으로 잡습니다.'));
    else if (sttProblem) list.push(notice(sttErrorMessage(sttProblem), 'warn'));
    return list;
  }

  function showIntro(error) {
    fill(
      body,
      h(
        'section',
        { class: 'card' },
        h('h2', {}, '손님 응대 준비'),
        h(
          'ul',
          { class: 'facts' },
          h('li', {}, h('span', {}, '문항'), h('b', {}, `${items.length}개`)),
          h('li', {}, h('span', {}, '① 반응 제한'), h('b', {}, `${settings.reactionLimitSec}초 안에 말 시작`)),
          h('li', {}, h('span', {}, '② 답변 제한'), h('b', {}, `${settings.answerLimitSec}초 안에 끝내기`)),
        ),
      ),
      error && notice(error, 'error'),
      !hasMic() && notice('이 브라우저는 마이크를 쓸 수 없습니다. 크롬에서 열어 주세요.', 'error'),
      h(
        'button',
        { class: 'btn btn-primary btn-big btn-block', disabled: !hasMic(), onclick: start },
        h('span', {}, '응대 시작'),
        h('small', {}, '손님이 먼저 말합니다'),
      ),
    );
  }

  async function start() {
    fill(body, h('p', { class: 'muted' }, '마이크 준비 중…'));
    try {
      stream = await openMic();
    } catch (err) {
      if (!disposed) showIntro(micErrorMessage(err));
      return;
    }
    if (disposed) return stopStream(stream);
    monitor = createLevelMonitor(stream);
    await monitor?.resume();
    await waitForVoices();
    if (!disposed) showItem(0);
  }

  // ---------- question view ----------

  function buildView(question, persona) {
    avatar?.destroy();
    avatar = createAvatar(persona);
    const ring = createRingTimer();
    const refs = {
      ring,
      subtitle: h('p', { class: 'bubble', 'aria-live': 'polite' }, question.question),
      reaction: h('div', { class: 'reaction-out wait', 'aria-live': 'polite' }, '손님 말이 끝나면 시작'),
      transcript: h('div', { class: 'transcript', dataset: { placeholder: sttProblem ? '(전사 없음)' : '말하면 여기에 받아 적습니다' } }),
      replayBtn: h('button', { class: 'btn', onclick: replay }, '다시 듣기'),
      doneBtn: h('button', { class: 'btn btn-primary', onclick: () => finish('done') }, '답변 끝'),
      skipBtn: h('button', { class: 'btn', onclick: skip }, '건너뛰기'),
    };
    refs.notices = h('div', { class: 'stack' }, supportNotices());
    fill(
      body,
      h(
        'section',
        { class: 'card customer' },
        h('div', { class: 'customer-thumb' }, avatarImage(persona)),
        h(
          'div',
          {},
          h('div', { class: 'customer-name' }, persona.name, h('small', {}, persona.label)),
          h('div', { class: 'customer-situation' }, persona.situation),
        ),
      ),
      refs.notices,
      h('div', { class: 'stage' }, avatar.el, refs.subtitle),
      h('div', { class: 'gauges' }, ring.el, h('div', { class: 'readout' }, refs.reaction)),
      refs.transcript,
      h('div', { class: 'controls row' }, refs.replayBtn, refs.doneBtn, refs.skipBtn),
    );
    return refs;
  }

  function setPhase(next) {
    phase = next;
    el.dataset.phase = next;
    if (!view) return;
    const listening = next === 'reaction' || next === 'answering';
    view.doneBtn.disabled = !listening;
    view.replayBtn.disabled = next === 'saving';
    view.skipBtn.disabled = next === 'saving';
  }

  function showItem(i) {
    index = i;
    const question = items[i];
    item = { question, persona: resolvePersona(question), replays: 0 };
    counter.textContent = `${i + 1} / ${items.length}`;
    view = buildView(question, item.persona);
    ask();
  }

  function ask() {
    const my = ++runId;
    stopListening();
    speech?.cancel();
    setPhase('asking');
    view.ring.idle('듣는 중');
    view.reaction.className = 'reaction-out wait';
    view.reaction.textContent = '손님 말이 끝나면 시작';
    view.transcript.textContent = '';
    speech = speak(item.question.question, {
      voiceURI: settings.voiceURI,
      rate: settings.rate,
      pitch: item.persona.pitch,
      onStart: () => my === runId && avatar.startTalking(),
      onBoundary: () => my === runId && avatar.pulseOpen(),
      onEnd: () => {
        if (my !== runId) return;
        avatar.stopTalking();
        startListening(my);
      },
    });
  }

  // ---------- listening: reaction → answer ----------

  function startListening(my) {
    setPhase('reaction');
    const t0 = performance.now();
    listen = { t0, speechAt: null, source: null, late: false, transcript: '', recognizer: null, unsubscribe: null };
    view.reaction.textContent = '지금 말하세요';

    if (!sttProblem) {
      listen.recognizer = createRecognizer({
        onText: (text) => {
          if (my !== runId) return;
          listen.transcript = text;
          view.transcript.textContent = text;
        },
        onFirstResult: (t) => my === runId && speechDetected(my, 'stt', t),
        onFatal: (code) => {
          if (my !== runId) return;
          sttProblem = code;
          fill(view.notices, supportNotices());
        },
      });
      listen.recognizer?.start();
    }

    const onset = createOnsetDetector({ threshold: settings.speechLevel });
    listen.unsubscribe = monitor?.subscribe((level, t) => {
      if (my !== runId) return;
      const at = onset.push(level, t);
      if (at != null) speechDetected(my, 'volume', Math.max(at, listen.t0));
    });

    view.ring.start(reactionLimitMs, {
      label: '① 반응',
      tone: 'reaction',
      startedAt: t0,
      onExpire: () => {
        if (my !== runId || phase !== 'reaction') return;
        listen.late = true;
        view.reaction.className = 'reaction-out late';
        view.reaction.textContent = `${settings.reactionLimitSec}초 초과 — 지금이라도 말하세요`;
        startAnswer(my, performance.now());
      },
    });
  }

  function speechDetected(my, source, at) {
    if (!listen || listen.speechAt != null) return;
    listen.speechAt = at;
    listen.source = source;
    const ms = at - listen.t0;
    const late = ms > reactionLimitMs;
    listen.late = late;
    view.reaction.className = `reaction-out ${late ? 'late' : 'ok'}`;
    view.reaction.textContent = `반응 ${formatSec(ms)}${late ? ' (초과)' : ''}`;
    if (phase === 'reaction') startAnswer(my, at);
  }

  function startAnswer(my, at) {
    setPhase('answering');
    listen.answerStart = at;
    view.ring.start(answerLimitMs, {
      label: '② 답변',
      tone: 'answer',
      startedAt: at,
      onExpire: () => my === runId && finish('timeout'),
    });
  }

  function stopListening() {
    if (!listen) return;
    listen.unsubscribe?.();
    listen.recognizer?.abort();
    listen = null;
  }

  async function finish(reason) {
    if (phase !== 'reaction' && phase !== 'answering') return;
    const my = runId;
    setPhase('saving');
    view.ring.stop();
    const endAt = performance.now();
    const current = listen;
    current.unsubscribe?.();
    const transcript = current.recognizer ? await current.recognizer.stop() : current.transcript;
    listen = null;
    if (my !== runId || disposed) return;

    const reactionMs = current.speechAt != null ? current.speechAt - current.t0 : null;
    showResult({
      reason,
      reactionMs,
      late: reactionMs == null || reactionMs > reactionLimitMs,
      answerMs: current.speechAt != null ? endAt - current.speechAt : 0,
      transcript,
      speechSource: current.source,
    });
  }

  // ---------- result (step 3: minimal) ----------

  function showResult(result) {
    setPhase('result');
    fill(
      body,
      h(
        'section',
        { class: 'card' },
        h('h2', {}, item.question.question),
        h(
          'ul',
          { class: 'facts' },
          h('li', {}, h('span', {}, '반응 시간'), h('b', { class: result.late ? 'v late' : 'v ok' }, result.reactionMs == null ? '감지 안 됨' : formatSec(result.reactionMs))),
          h('li', {}, h('span', {}, '답변 길이'), h('b', {}, formatSec(result.answerMs))),
        ),
        h('p', { class: 'transcript' }, result.transcript || '(전사 없음)'),
      ),
      h('button', { class: 'btn btn-primary btn-block', onclick: next }, index + 1 < items.length ? '다음 문제' : '끝내기'),
    );
  }

  function replay() {
    item.replays++;
    ask();
  }

  function skip() {
    runId++;
    speech?.cancel();
    stopListening();
    next();
  }

  function next() {
    runId++;
    if (index + 1 < items.length) showItem(index + 1);
    else navigate('');
  }

  // ---------- lifecycle ----------

  provider.nextSession({ mode, size: settings.sessionSize }).then((list) => {
    if (disposed) return;
    items = list;
    if (items.length === 0) {
      fill(
        body,
        notice(mode === 'retry' ? '다시 풀 문항이 없습니다.' : '질문 은행이 비어 있습니다. 질문을 먼저 추가하세요.'),
        h('a', { class: 'btn btn-block', href: mode === 'retry' ? '#/' : '#/bank' }, mode === 'retry' ? '홈으로' : '질문 은행으로'),
      );
      return;
    }
    counter.textContent = `0 / ${items.length}`;
    showIntro();
  });

  return {
    el,
    title: '연습',
    destroy() {
      disposed = true;
      runId++;
      speech?.cancel();
      stopListening();
      view?.ring.stop();
      avatar?.destroy();
      monitor?.close();
      stopStream(stream);
    },
  };
}
