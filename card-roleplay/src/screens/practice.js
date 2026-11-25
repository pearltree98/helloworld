import { h, fill, topbar, notice } from '../ui/dom.js';
import { navigate } from '../nav.js';
import { loadSettings, loadBank, loadProgress, saveProgress, upsertSession } from '../core/store.js';
import { formatSec, activeLevel, summarize } from '../core/stats.js';
import { createOnsetDetector } from '../core/onset.js';
import { getEntry, applyOutcome, retryCount } from '../core/leitner.js';
import { splitCheckMarkers } from '../core/bank.js';
import { newId } from '../core/ids.js';
import { saveRecording, pruneRecordings, hasIDB } from '../core/recordings.js';
import { resolvePersona } from '../data/personas.js';
import { createAvatar, avatarImage } from '../ui/avatar.js';
import { createRingTimer } from '../ui/ring-timer.js';
import { createMeter } from '../ui/meter.js';
import { audioPlayer } from '../ui/audio.js';
import { speak, waitForVoices, koreanVoices, hasTTS } from '../media/tts.js';
import { hasSTT, createRecognizer, sttErrorMessage } from '../media/stt.js';
import { hasMic, openMic, stopStream, createLevelMonitor, createRecorder, micErrorMessage } from '../media/mic.js';
import { createStaticProvider } from '../providers/question-provider.js';

// Phases of one question:
//   asking    → the customer speaks (TTS + lip sync)
//   reaction  → ① 반응 타이머 runs until the voice starts (or the limit passes)
//   answering → ② 답변 타이머 runs until [답변 끝] or the limit
//   saving    → stopping recorder and recognizer
//   result    → this question's result card
//   summary   → the session summary

export const SELF_CHECKS = [
  { key: 'volume', label: '들리는 크기' },
  { key: 'pace', label: '말 속도' },
  { key: 'clarity', label: '첫 문장 또렷함' },
];

/** Model answer with every "[확인 필요 …]" part highlighted. */
export function modelAnswerText(text) {
  return h(
    'p',
    { class: 'model-answer' },
    splitCheckMarkers(text || '(모범답안 초안 없음)').map((part) => (part.marker ? h('mark', { class: 'check' }, part.text) : part.text)),
  );
}

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
  let recorder = null;
  let offMeter = null;
  let sttProblem = !hasSTT() ? 'unsupported' : !settings.transcribe ? 'off' : null;

  let session = null;
  let avatar = null;
  let view = null;
  let speech = null;
  let listen = null; // the current reaction/answer window
  let item = null; // { question, persona, replays }
  let pending = null; // result shown but not yet saved to progress/history
  const objectUrls = new Set();

  // ---------- setup ----------

  function supportNotices() {
    const list = [];
    if (!hasTTS()) list.push(notice('이 브라우저는 음성 읽기를 지원하지 않아 자막으로만 진행합니다.', 'warn'));
    else if (koreanVoices().length === 0)
      list.push(notice('한국어 음성이 없어 자막으로 진행합니다. 안드로이드 설정 › 텍스트 음성 변환에서 Google 음성 엔진의 한국어 데이터를 설치하세요.', 'warn'));
    if (sttProblem === 'off') list.push(notice('전사가 꺼져 있습니다(설정). 말 시작은 음량으로 잡습니다.'));
    else if (sttProblem) list.push(notice(sttErrorMessage(sttProblem), 'warn'));
    if (stream && !recorder) list.push(notice('이 브라우저는 녹음을 지원하지 않습니다. 반응 시간과 전사만 기록합니다.', 'warn'));
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
        h('p', { class: 'muted small' }, '과장 없이, 조건은 먼저. 거절은 깔끔하게 받고 물러납니다.'),
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
    recorder = createRecorder(stream);
    offMeter = monitor?.subscribe((level) => view?.meter?.set(level));
    session = { id: newId('s-'), startedAt: Date.now(), mode, items: [] };
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
      meter: monitor ? createMeter({ quietLevel: settings.quietLevel, speechLevel: settings.speechLevel }) : null,
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
      h('div', { class: 'gauges' }, ring.el, h('div', { class: 'readout' }, refs.reaction, refs.meter?.el)),
      refs.transcript,
      h('div', { class: 'controls row' }, refs.replayBtn, refs.doneBtn, refs.skipBtn),
    );
    return refs;
  }

  function setPhase(next) {
    phase = next;
    el.dataset.phase = next;
    if (!view || next === 'result' || next === 'summary') return;
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
    listen = { t0, speechAt: null, source: null, late: false, transcript: '', levels: [], recognizer: null, unsubscribe: null, recording: false };
    view.reaction.textContent = '지금 말하세요';

    // The recording covers the whole window, so you also hear your own hesitation.
    listen.recording = recorder?.start() ?? false;

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
      if (my !== runId || !listen) return;
      listen.levels.push({ t, level });
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

  /** Abandons the current window without saving anything. */
  function stopListening() {
    if (!listen) return;
    listen.unsubscribe?.();
    listen.recognizer?.abort();
    if (listen.recording) recorder?.discard();
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
    const [transcript, blob] = await Promise.all([
      current.recognizer ? current.recognizer.stop() : Promise.resolve(current.transcript),
      current.recording ? recorder.stop() : Promise.resolve(null),
    ]);
    listen = null;
    if (my !== runId || disposed) return;

    const reactionMs = current.speechAt != null ? current.speechAt - current.t0 : null;
    const from = current.speechAt ?? current.answerStart ?? current.t0;
    const levels = current.levels.filter((f) => f.t >= from).map((f) => f.level);
    const avgLevel = activeLevel(levels);
    const late = reactionMs == null || reactionMs > reactionLimitMs;

    const result = {
      id: newId('a-'),
      qid: item.question.id,
      question: item.question.question,
      personaId: item.persona.id,
      at: Date.now(),
      reactionMs,
      late,
      speechSource: current.source,
      answerMs: current.speechAt != null ? Math.max(0, endAt - current.speechAt) : 0,
      endReason: reason,
      avgLevel,
      peakLevel: current.levels.length ? Math.max(...current.levels.map((f) => f.level)) : null,
      quiet: avgLevel != null && avgLevel < settings.quietLevel,
      transcript: transcript || '',
      replays: item.replays,
      skipped: false,
      hasRecording: false,
      selfEval: { volume: false, pace: false, clarity: false },
      retry: late, // a late or missing start goes back to 다시 풀기 unless you untick it
    };

    let audioUrl = null;
    if (blob && blob.size > 0) {
      audioUrl = URL.createObjectURL(blob);
      objectUrls.add(audioUrl);
      result.hasRecording = hasIDB();
      if (hasIDB()) {
        saveRecording({ id: result.id, qid: result.qid, blob, mimeType: blob.type, createdAt: result.at })
          .then(() => pruneRecordings(settings.recordingCap))
          .catch((err) => {
            console.warn('녹음 저장 실패', err);
            result.hasRecording = false;
          });
      }
    }
    pending = result;
    showResult(result, audioUrl);
  }

  // ---------- result ----------

  function metric(label, value, tone) {
    return h('div', { class: `metric ${tone || ''}` }, h('span', {}, label), h('b', {}, value));
  }

  function showResult(result, audioUrl) {
    setPhase('result');
    const q = item.question;
    const answerBox = h('div', { hidden: true }, q.needsCheck && h('span', { class: 'badge badge-check' }, '지점 자료로 확인 필요'), modelAnswerText(q.modelAnswer));
    const answerToggle = h(
      'button',
      {
        class: 'btn btn-block',
        'aria-expanded': 'false',
        onclick: () => {
          answerBox.hidden = !answerBox.hidden;
          answerToggle.setAttribute('aria-expanded', String(!answerBox.hidden));
          answerToggle.textContent = answerBox.hidden ? '모범답안 초안 보기' : '모범답안 초안 접기';
        },
      },
      '모범답안 초안 보기',
    );
    const retryBtn = h(
      'button',
      {
        class: 'btn btn-block',
        'aria-pressed': String(result.retry),
        onclick: () => {
          result.retry = !result.retry;
          retryBtn.setAttribute('aria-pressed', String(result.retry));
          retryBtn.textContent = result.retry ? '✓ 다시 풀기에 넣음' : '다시 풀기에 넣기';
        },
      },
      result.retry ? '✓ 다시 풀기에 넣음' : '다시 풀기에 넣기',
    );
    const micConflict = result.transcript && result.peakLevel != null && result.peakLevel < 3;

    fill(
      body,
      h('section', { class: 'card' }, h('h2', {}, q.question), h('p', { class: 'muted small' }, `${item.persona.name} · ${item.persona.label}`)),
      h(
        'div',
        { class: 'metrics' },
        metric('반응 시간', result.reactionMs == null ? '감지 안 됨' : formatSec(result.reactionMs), result.late ? 'late' : 'ok'),
        metric('답변 길이', formatSec(result.answerMs), result.endReason === 'timeout' ? 'late' : ''),
        metric('평균 음량', result.avgLevel == null ? '—' : `${Math.round(result.avgLevel)} / ${settings.quietLevel}`, result.quiet ? 'late' : result.avgLevel == null ? '' : 'ok'),
        metric('다시 듣기', `${result.replays}회`),
      ),
      result.quiet && notice('조금 더 크게 — 평균 음량이 기준선보다 작습니다. 손님 귀에 닿는 크기로 첫 문장을 시작해 보세요.', 'warn'),
      result.endReason === 'timeout' && notice(`답변 제한 ${settings.answerLimitSec}초를 넘었습니다. 더 짧게 줄여 보세요.`, 'warn'),
      micConflict && notice('전사는 됐는데 녹음 음량이 거의 0입니다. 이 기기는 전사와 녹음을 동시에 못 할 수 있습니다. 설정에서 전사를 끄면 녹음과 음량이 정확해집니다.', 'warn'),
      h('section', { class: 'card' }, h('h2', {}, '전사'), h('p', { class: 'transcript' }, result.transcript || (sttProblem ? '(전사 없음 — 크롬에서 열면 전사가 됩니다)' : '(인식된 말이 없습니다)'))),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, '내 녹음'),
        audioUrl ? audioPlayer(audioUrl) : h('p', { class: 'muted small' }, '녹음이 없습니다.'),
      ),
      h('section', { class: 'card' }, h('h2', {}, '모범답안'), answerToggle, answerBox),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, '자기평가 (잘 됐으면 체크)'),
        h(
          'div',
          { class: 'checks' },
          SELF_CHECKS.map(({ key, label }) =>
            h(
              'label',
              { class: 'check' },
              h('input', {
                type: 'checkbox',
                checked: result.selfEval[key],
                onchange: (event) => {
                  result.selfEval[key] = event.target.checked;
                },
              }),
              label,
            ),
          ),
        ),
      ),
      retryBtn,
      h('div', { class: 'controls' }, h('button', { class: 'btn btn-primary btn-block', onclick: next }, index + 1 < items.length ? '다음 문제' : '세션 요약 보기')),
    );
    window.scrollTo(0, 0);
  }

  // ---------- saving ----------

  /** Saves a result to Leitner progress and session history. */
  function commit(result) {
    const progress = loadProgress();
    progress[result.qid] = applyOutcome(getEntry(progress, result.qid), { retry: result.retry, reactionMs: result.reactionMs });
    saveProgress(progress);
    session.items.push({ ...result, selfEval: { ...result.selfEval } });
    upsertSession(session);
  }

  function commitPending() {
    if (!pending) return;
    commit(pending);
    pending = null;
  }

  // ---------- navigation within the session ----------

  function replay() {
    item.replays++;
    ask();
  }

  function skip() {
    runId++;
    speech?.cancel();
    avatar?.stopTalking();
    stopListening();
    commit({
      id: newId('a-'),
      qid: item.question.id,
      question: item.question.question,
      personaId: item.persona.id,
      at: Date.now(),
      reactionMs: null,
      late: true,
      answerMs: 0,
      avgLevel: null,
      transcript: '',
      replays: item.replays,
      skipped: true,
      hasRecording: false,
      selfEval: { volume: false, pace: false, clarity: false },
      retry: true, // skipping counts as not answered
    });
    advance();
  }

  function next() {
    commitPending();
    advance();
  }

  function advance() {
    runId++;
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
    if (index + 1 < items.length) showItem(index + 1);
    else showSummary();
  }

  function showSummary() {
    setPhase('summary');
    avatar?.destroy();
    avatar = null;
    view = null;
    counter.textContent = '요약';
    const sum = summarize(session.items);
    const retryLeft = retryCount(loadBank(), loadProgress());
    fill(
      body,
      h('section', { class: 'card' }, h('h2', {}, '세션 요약')),
      h(
        'div',
        { class: 'metrics' },
        metric('평균 반응', formatSec(sum.avgReactionMs), sum.avgReactionMs != null && sum.avgReactionMs <= reactionLimitMs ? 'ok' : 'late'),
        metric(`${settings.reactionLimitSec}초 안에 시작`, `${sum.withinLimit} / ${sum.count}`),
        metric('다시 풀기', `${sum.retryCount}개`),
        metric('건너뜀', `${sum.skipped}개`),
      ),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, '문항별 반응 시간'),
        h(
          'ol',
          { class: 'summary-list' },
          session.items.map((it) =>
            h(
              'li',
              {},
              h('span', { class: 'q' }, it.question, it.retry ? h('span', { class: 'badge', title: '다시 풀기' }, ' 다시') : null),
              h(
                'span',
                { class: `v ${it.skipped || it.late ? 'late' : 'ok'}` },
                it.skipped ? '건너뜀' : it.reactionMs == null ? '감지 안 됨' : formatSec(it.reactionMs),
              ),
            ),
          ),
        ),
      ),
      h(
        'div',
        { class: 'stack' },
        retryLeft > 0 && h('button', { class: 'btn btn-outline btn-block', onclick: () => navigate('practice?mode=retry') }, `오답만 풀기 (${retryLeft}문항)`),
        h('button', { class: 'btn btn-primary btn-block', onclick: () => navigate('practice') }, '한 번 더 연습'),
        h('a', { class: 'btn btn-block', href: '#/' }, '홈으로'),
      ),
    );
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
      commitPending();
      speech?.cancel();
      stopListening();
      view?.ring.stop();
      avatar?.destroy();
      offMeter?.();
      monitor?.close();
      stopStream(stream);
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    },
  };
}
