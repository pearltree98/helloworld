import { h, fill, notice } from '../ui/dom.js';
import { navigate } from '../nav.js';
import { setFlag } from '../core/store.js';
import { hasMic, openMic, stopStream, micErrorMessage } from '../media/mic.js';

/** First-run screen: why the app needs the microphone, then ask for it. */
export function permissionScreen() {
  const status = h('div', { class: 'stack' });
  let busy = false;

  async function allow() {
    if (busy) return;
    busy = true;
    try {
      const stream = await openMic();
      stopStream(stream);
      setFlag('permissionIntroSeen', true);
      fill(status, notice('마이크가 허용되었습니다.', 'ok'));
      setTimeout(() => navigate('', { replace: true }), 400);
    } catch (err) {
      fill(status, notice(micErrorMessage(err), 'error'));
    } finally {
      busy = false;
    }
  }

  function later() {
    setFlag('permissionIntroSeen', true);
    navigate('', { replace: true });
  }

  const el = h(
    'main',
    { class: 'screen permission' },
    h(
      'div',
      { class: 'permission-hero' },
      h('div', { class: 'mic', 'aria-hidden': 'true' }, '🎙'),
      h('h1', {}, '마이크를 써도 될까요?'),
      h('p', { class: 'lead' }, '답변을 듣고, 말을 시작한 시간과 목소리 크기를 재려면 마이크가 필요합니다.'),
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, '어떻게 쓰나요'),
      h(
        'ul',
        { class: 'facts' },
        h('li', {}, h('span', {}, '녹음'), h('b', {}, '이 기기 안에만 저장')),
        h('li', {}, h('span', {}, '음량·반응 시간'), h('b', {}, '이 기기에서 계산')),
        h('li', {}, h('span', {}, '전사(받아쓰기)'), h('b', {}, '크롬 음성 인식 사용')),
      ),
      h(
        'p',
        { class: 'muted small' },
        '전사는 크롬의 음성 인식 기능을 쓰며, 이때 음성이 구글 서버로 전송될 수 있습니다. 원하지 않으면 설정에서 전사를 끄세요. 녹음 파일 자체는 어디로도 보내지 않습니다.',
      ),
    ),
    status,
    !hasMic() && notice('이 브라우저는 마이크를 쓸 수 없습니다. 안드로이드 크롬에서 열어 주세요.', 'error'),
    h('button', { class: 'btn btn-primary btn-big btn-block', disabled: !hasMic(), onclick: allow }, h('span', {}, '마이크 허용하기')),
    h('button', { class: 'btn btn-ghost btn-block', onclick: later }, '나중에'),
  );

  return { el, title: '마이크 권한' };
}
