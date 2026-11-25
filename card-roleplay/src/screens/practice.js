import { h, fill, topbar, notice } from '../ui/dom.js';
import { navigate } from '../nav.js';
import { loadSettings } from '../core/store.js';
import { resolvePersona } from '../data/personas.js';
import { createAvatar, avatarImage } from '../ui/avatar.js';
import { speak, waitForVoices, koreanVoices, hasTTS } from '../media/tts.js';
import { createStaticProvider } from '../providers/question-provider.js';

export function practiceScreen(route) {
  const mode = route.query.get('mode') === 'retry' ? 'retry' : 'normal';
  const settings = loadSettings();
  const provider = createStaticProvider();

  const counter = h('span', {}, '');
  const body = h('div', { class: 'practice-body' });
  const el = h('main', { class: 'screen practice' }, topbar(mode === 'retry' ? '오답만 풀기' : '연습', { right: counter }), body);

  let items = [];
  let index = 0;
  let avatar = null;
  let speech = null;
  let view = null;
  let runId = 0;
  let disposed = false;

  function ttsNotice() {
    if (!hasTTS()) return notice('이 브라우저는 음성 읽기를 지원하지 않아 자막으로만 진행합니다.', 'warn');
    if (koreanVoices().length === 0)
      return notice(
        '한국어 음성이 없어 자막으로 진행합니다. 안드로이드 설정 › 텍스트 음성 변환에서 Google 음성 엔진의 한국어 데이터를 설치하세요.',
        'warn',
      );
    return null;
  }

  function showIntro() {
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
          h('li', {}, h('span', {}, '반응 제한'), h('b', {}, `${settings.reactionLimitSec}초`)),
          h('li', {}, h('span', {}, '답변 제한'), h('b', {}, `${settings.answerLimitSec}초`)),
        ),
      ),
      h(
        'button',
        { class: 'btn btn-primary btn-big btn-block', onclick: start },
        h('span', {}, '응대 시작'),
        h('small', {}, '손님이 먼저 말합니다'),
      ),
    );
  }

  async function start() {
    fill(body, h('p', { class: 'muted' }, '준비 중…'));
    await waitForVoices();
    if (disposed) return;
    showItem(0);
  }

  function buildView(question, persona) {
    avatar?.destroy();
    avatar = createAvatar(persona);
    const subtitle = h('p', { class: 'bubble', 'aria-live': 'polite' }, question.question);
    const status = h('p', { class: 'muted small', 'aria-live': 'polite' }, '');
    const replayBtn = h('button', { class: 'btn', onclick: replay }, '다시 듣기');
    const nextBtn = h('button', { class: 'btn btn-primary', onclick: next }, '다음');
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
      ttsNotice(),
      h('div', { class: 'stage' }, avatar.el, subtitle),
      status,
      h('div', { class: 'controls row' }, replayBtn, nextBtn),
    );
    return { subtitle, status };
  }

  function showItem(i) {
    index = i;
    const question = items[i];
    const persona = resolvePersona(question);
    counter.textContent = `${i + 1} / ${items.length}`;
    view = buildView(question, persona);
    view.persona = persona;
    view.question = question;
    ask();
  }

  function ask() {
    const my = ++runId;
    speech?.cancel();
    view.status.textContent = '손님이 말하는 중…';
    speech = speak(view.question.question, {
      voiceURI: settings.voiceURI,
      rate: settings.rate,
      pitch: view.persona.pitch,
      onStart: () => my === runId && avatar.startTalking(),
      onBoundary: () => my === runId && avatar.pulseOpen(),
      onEnd: () => {
        if (my !== runId) return;
        avatar.stopTalking();
        view.status.textContent = '이제 답할 차례입니다.';
      },
    });
  }

  function replay() {
    ask();
  }

  function next() {
    runId++;
    speech?.cancel();
    avatar.stopTalking();
    if (index + 1 < items.length) showItem(index + 1);
    else navigate('');
  }

  provider.nextSession({ mode, size: settings.sessionSize }).then((list) => {
    if (disposed) return;
    items = list;
    if (items.length === 0) {
      fill(
        body,
        notice(mode === 'retry' ? '다시 풀 문항이 없습니다.' : '질문 은행이 비어 있습니다. 질문을 먼저 추가하세요.'),
        h(
          'a',
          { class: 'btn btn-block', href: mode === 'retry' ? '#/' : '#/bank' },
          mode === 'retry' ? '홈으로' : '질문 은행으로',
        ),
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
      avatar?.destroy();
    },
  };
}
