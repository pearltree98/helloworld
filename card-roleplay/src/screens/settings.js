import { h, fill, topbar, notice } from '../ui/dom.js';
import { loadSettings, saveSettings, saveProgress } from '../core/store.js';
import { SETTING_RANGES, DEFAULT_SETTINGS } from '../core/settings.js';
import { activeLevel } from '../core/stats.js';
import { countRecordings, clearRecordings, pruneRecordings, hasIDB } from '../core/recordings.js';
import { createMeter } from '../ui/meter.js';
import { speak, waitForVoices, koreanVoices, hasTTS } from '../media/tts.js';
import { hasSTT } from '../media/stt.js';
import { hasMic, openMic, stopStream, createLevelMonitor, micErrorMessage } from '../media/mic.js';
import { supportReport } from '../media/support.js';

export function settingsScreen() {
  let settings = loadSettings();
  const cleanups = new Set();
  const saved = h('span', { 'aria-live': 'polite' }, '');
  let savedTimer = 0;

  function update(patch) {
    settings = { ...settings, ...patch };
    saveSettings(settings);
    settings = loadSettings();
    saved.textContent = '저장됨';
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (saved.textContent = ''), 1200);
  }

  function range(key, label, { unit = '', digits = 0, help } = {}) {
    const r = SETTING_RANGES[key];
    const show = (v) => `${Number(v).toFixed(digits)}${unit}`;
    const out = h('b', {}, show(settings[key]));
    const input = h('input', {
      type: 'range',
      min: r.min,
      max: r.max,
      step: r.step,
      'aria-label': label,
      value: String(settings[key]),
      oninput: () => {
        out.textContent = show(input.value);
        update({ [key]: Number(input.value) });
        onRangeChange(key);
      },
    });
    return {
      input,
      el: h('label', { class: 'field' }, h('div', { class: 'range-head' }, h('span', {}, label), out), input, help && h('small', {}, help)),
      set(v) {
        input.value = String(v);
        out.textContent = show(v);
      },
    };
  }

  // ---------- 시간 ----------
  const reaction = range('reactionLimitSec', '① 반응 제한', { unit: '초', digits: 1, help: '질문이 끝나고 첫 마디를 시작할 때까지' });
  const answer = range('answerLimitSec', '② 답변 제한', { unit: '초', help: '첫 마디부터 답을 끝낼 때까지' });
  const size = range('sessionSize', '세션당 문항 수', { unit: '문항' });

  // ---------- 음성 ----------
  const voiceSelect = h('select', {
    'aria-label': '한국어 음성',
    onchange: () => update({ voiceURI: voiceSelect.value }),
  });
  const voiceNote = h('div', {});
  const rate = range('rate', '말 속도', { unit: '배', digits: 2 });

  function fillVoices() {
    const voices = koreanVoices();
    fill(
      voiceSelect,
      h('option', { value: '', selected: !settings.voiceURI }, '자동 (기기 기본 한국어 음성)'),
      voices.map((v) => h('option', { value: v.voiceURI, selected: v.voiceURI === settings.voiceURI }, `${v.name}${v.localService ? '' : ' · 온라인'}`)),
    );
    fill(
      voiceNote,
      !hasTTS()
        ? notice('이 브라우저는 음성 읽기를 지원하지 않습니다. 질문은 자막으로만 나옵니다.', 'warn')
        : voices.length === 0 && notice('한국어 음성이 없습니다. 안드로이드 설정 › 일반 › 텍스트 음성 변환 › 기본 엔진을 Google로 하고 한국어 음성 데이터를 설치하세요.', 'warn'),
    );
  }
  waitForVoices().then(fillVoices);
  fillVoices();

  let preview = null;
  cleanups.add(() => preview?.cancel());
  const previewBtn = h(
    'button',
    {
      class: 'btn',
      onclick: () => {
        preview?.cancel();
        preview = speak('카드 이미 있어요. 연회비 얼마예요?', { voiceURI: settings.voiceURI, rate: settings.rate });
      },
    },
    '미리 듣기',
  );

  // ---------- 목소리 크기 ----------
  const quiet = range('quietLevel', '"너무 작음" 기준선', { help: '답변 평균 음량이 이 선보다 낮으면 결과에 "조금 더 크게"가 뜹니다.' });
  const speechLine = range('speechLevel', '말 시작 감지 기준', { help: '음량이 이 선을 0.15초 넘으면 말을 시작한 것으로 봅니다. 주변 소음보다 높게 두세요.' });
  const meter = createMeter({ quietLevel: settings.quietLevel, speechLevel: settings.speechLevel, caption: '지금 음량' });
  const liveText = h('p', { class: 'muted small', 'aria-live': 'polite' }, '테스트를 시작하면 숫자가 나옵니다.');
  const micStatus = h('div', {});
  let mic = null;
  let window3s = [];
  let stats = { floor: null, active: null };

  function onRangeChange(key) {
    if (key !== 'quietLevel' && key !== 'speechLevel') return;
    meter.setMarks(settings.quietLevel, settings.speechLevel);
    checkLines();
  }

  const levelWarning = h('div', {});

  function checkLines() {
    fill(
      levelWarning,
      settings.speechLevel >= settings.quietLevel &&
        notice('말 시작 감지 기준이 "너무 작음" 기준선 이상입니다. 이러면 작은 목소리는 말 시작으로 잡히지 않습니다. 감지 기준을 낮추세요.', 'warn'),
    );
  }

  // Step ①: measure the room while silent, put speech detection above it.
  const useNoiseBtn = h(
    'button',
    {
      class: 'btn',
      disabled: true,
      onclick: () => {
        if (stats.floor == null) return;
        const v = Math.min(SETTING_RANGES.speechLevel.max, Math.round(stats.floor + 12));
        update({ speechLevel: v });
        speechLine.set(settings.speechLevel);
        onRangeChange('speechLevel');
      },
    },
    '① 소음 기준 잡기',
  );
  // Step ②: speak at a volume a customer can hear, put the "too quiet" line just under it.
  const useVoiceBtn = h(
    'button',
    {
      class: 'btn',
      disabled: true,
      onclick: () => {
        if (stats.active == null) return;
        const v = Math.max(SETTING_RANGES.quietLevel.min, Math.round(stats.active - 5));
        update({ quietLevel: v });
        quiet.set(settings.quietLevel);
        onRangeChange('quietLevel');
      },
    },
    '② 목소리 기준 잡기',
  );

  async function toggleMic() {
    if (mic) return stopMic();
    try {
      const stream = await openMic();
      const monitor = createLevelMonitor(stream);
      await monitor?.resume();
      mic = { stream, monitor };
      window3s = [];
      mic.off = monitor?.subscribe((level, t) => {
        meter.set(level);
        window3s.push({ t, level });
        window3s = window3s.filter((f) => t - f.t <= 3000);
        const levels = window3s.map((f) => f.level);
        stats = { floor: Math.min(...levels), active: activeLevel(levels) };
        liveText.textContent = `지금 ${Math.round(level)} · 최근 3초: 조용할 때 ${Math.round(stats.floor)} / 말할 때 ${Math.round(stats.active)}`;
      });
      micBtn.textContent = '테스트 끝';
      useVoiceBtn.disabled = useNoiseBtn.disabled = false;
      fill(micStatus);
    } catch (err) {
      fill(micStatus, notice(micErrorMessage(err), 'error'));
    }
  }

  function stopMic() {
    mic?.off?.();
    mic?.monitor?.close();
    stopStream(mic?.stream);
    mic = null;
    meter.set(0);
    micBtn.textContent = '마이크 테스트 시작';
    useVoiceBtn.disabled = useNoiseBtn.disabled = true;
  }
  cleanups.add(stopMic);
  const micBtn = h('button', { class: 'btn btn-primary', disabled: !hasMic(), onclick: toggleMic }, '마이크 테스트 시작');
  checkLines();

  // ---------- 전사 ----------
  const transcribe = h('input', {
    type: 'checkbox',
    checked: settings.transcribe,
    disabled: !hasSTT(),
    onchange: () => update({ transcribe: transcribe.checked }),
  });

  // ---------- 녹음 ----------
  const cap = range('recordingCap', '녹음 보관 개수', { unit: '개', help: '넘으면 오래된 녹음부터 지웁니다.' });
  const recCount = h('b', {}, '…');
  const refreshCount = () =>
    hasIDB()
      ? countRecordings()
          .then((n) => (recCount.textContent = `${n}개`))
          .catch(() => (recCount.textContent = '알 수 없음'))
      : (recCount.textContent = '보관 불가');
  refreshCount();
  cap.input.addEventListener('change', () => hasIDB() && pruneRecordings(settings.recordingCap).then(refreshCount));

  const dataStatus = h('div', {});

  async function deleteRecordings() {
    if (!window.confirm('저장된 녹음을 모두 지울까요?')) return;
    await clearRecordings().catch(() => {});
    refreshCount();
    fill(dataStatus, notice('녹음을 모두 지웠습니다.', 'ok'));
  }

  function resetBoxes() {
    if (!window.confirm('모든 질문을 상자 1로 되돌리고 "다시 풀기" 표시를 지울까요? 기록은 남습니다.')) return;
    saveProgress({});
    fill(dataStatus, notice('상자 상태를 초기화했습니다.', 'ok'));
  }

  function resetSettings() {
    if (!window.confirm('설정을 기본값으로 되돌릴까요?')) return;
    stopMic();
    saveSettings({ ...DEFAULT_SETTINGS });
    location.reload();
  }

  const section = (title, ...children) => h('section', { class: 'card stack' }, h('h2', {}, title), children);

  const el = h(
    'main',
    { class: 'screen settings' },
    topbar('설정', { right: saved }),
    section('시간', reaction.el, answer.el, size.el),
    section('손님 음성', h('label', { class: 'field' }, h('span', {}, '한국어 음성'), voiceSelect), voiceNote, rate.el, previewBtn),
    section(
      '목소리 크기 점검',
      h(
        'ol',
        { class: 'muted small steps' },
        h('li', {}, '[마이크 테스트 시작]을 누르고 3초 동안 조용히 있다가 [① 소음 기준 잡기].'),
        h('li', {}, '손님이 1m 떨어져서도 들을 크기로 "안녕하세요, 카드 모집인 ○○○입니다"를 말한 직후 [② 목소리 기준 잡기].'),
      ),
      meter.el,
      liveText,
      micStatus,
      micBtn,
      h('div', { class: 'row' }, useNoiseBtn, useVoiceBtn),
      levelWarning,
      quiet.el,
      speechLine.el,
    ),
    section(
      '전사 (받아쓰기)',
      h('label', { class: 'switch' }, h('span', {}, '답변을 글로 받아 적기'), transcribe),
      !hasSTT() && notice('이 브라우저는 전사를 지원하지 않습니다. 크롬에서 열면 전사가 됩니다. 녹음과 음량 측정은 그대로 됩니다.', 'warn'),
      h('p', { class: 'muted small' }, '크롬 음성 인식을 쓰며 음성이 구글 서버로 전송될 수 있습니다. 끄면 말 시작은 음량으로만 잡습니다. 전사와 녹음이 동시에 안 되는 기기에서는 꺼 두세요.'),
    ),
    section('녹음', cap.el, h('div', { class: 'range-head' }, h('span', {}, '지금 저장된 녹음'), recCount), h('button', { class: 'btn btn-danger', onclick: deleteRecordings }, '녹음 모두 지우기')),
    section(
      '이 기기 지원 현황',
      h(
        'ul',
        { class: 'facts' },
        supportReport().map((r) => h('li', {}, h('span', {}, r.label), h('b', { class: r.ok ? 'v ok' : 'v late', title: r.ok ? '' : r.fix }, r.ok ? r.value || '됨' : '안 됨'))),
      ),
      supportReport()
        .filter((r) => !r.ok)
        .map((r) => h('p', { class: 'muted small' }, `${r.label}: ${r.fix}`)),
    ),
    section('데이터', dataStatus, h('button', { class: 'btn', onclick: resetBoxes }, '상자 상태 초기화'), h('button', { class: 'btn btn-ghost', onclick: resetSettings }, '설정 기본값으로')),
  );

  return {
    el,
    title: '설정',
    destroy() {
      cleanups.forEach((fn) => fn());
      clearTimeout(savedTimer);
    },
  };
}
