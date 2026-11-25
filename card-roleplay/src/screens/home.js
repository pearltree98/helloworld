import { h, formatDateTime, notice } from '../ui/dom.js';
import { navigate } from '../nav.js';
import { loadBank, loadProgress, loadHistory, loadSettings } from '../core/store.js';
import { retryCount, boxCounts } from '../core/leitner.js';
import { summarize, formatSec } from '../core/stats.js';
import { canInstall, promptInstall, onInstallChange } from '../pwa.js';
import { hasSTT } from '../media/stt.js';
import { hasMic } from '../media/mic.js';
import { isSamsungInternet } from '../media/support.js';

export const PRINCIPLES = [
  '과장하지 않는다. 조건(연회비·실적)은 먼저 말한다.',
  '거절은 깔끔하게 받고 물러난다.',
  '길거리 모집은 하지 않는다. 연습 장면은 지점 부스, 미리 동의한 방문, 지인 소개 자리다.',
];

export function homeScreen() {
  const settings = loadSettings();
  const bank = loadBank();
  const progress = loadProgress();
  const history = loadHistory();
  const retry = retryCount(bank, progress);
  const boxes = boxCounts(bank, progress);
  const last = history[0];
  const lastSummary = last ? summarize(last.items || []) : null;

  const installBtn = h('button', { class: 'btn btn-ghost', hidden: !canInstall(), onclick: promptInstall }, '홈 화면에 앱 설치');
  const offInstall = onInstallChange(() => {
    installBtn.hidden = !canInstall();
  });

  const el = h(
    'main',
    { class: 'screen home' },
    h(
      'header',
      { class: 'home-head' },
      h('h1', {}, '카드 응대 연습'),
      h('p', { class: 'lead' }, `${settings.reactionLimitSec}초 안에 입을 열고, ${settings.answerLimitSec}초 안에 짧고 진실하게.`),
    ),
    !hasMic() && notice('이 브라우저는 마이크를 쓸 수 없습니다. 안드로이드 크롬에서 열어 주세요.', 'error'),
    hasMic() &&
      (!hasSTT() || isSamsungInternet()) &&
      notice('이 브라우저에서는 전사(받아쓰기)가 안 될 수 있습니다. 크롬에서 열면 전사가 됩니다. 녹음과 음량 측정은 그대로 됩니다.', 'warn'),
    h(
      'div',
      { class: 'stack' },
      h(
        'button',
        { class: 'btn btn-primary btn-big', onclick: () => navigate('practice') },
        h('span', {}, '연습 시작'),
        h('small', {}, `${settings.sessionSize}문항`),
      ),
      h(
        'button',
        { class: 'btn btn-outline btn-big', disabled: retry === 0, onclick: () => navigate('practice?mode=retry') },
        h('span', {}, '오답만 풀기'),
        h('small', {}, retry ? `${retry}문항` : '없음'),
      ),
    ),
    h(
      'nav',
      { class: 'grid3', 'aria-label': '메뉴' },
      h('a', { class: 'tile', href: '#/bank' }, h('strong', {}, '질문 은행 편집'), h('small', {}, `${bank.length}문항`)),
      h('a', { class: 'tile', href: '#/history' }, h('strong', {}, '기록 보기'), h('small', {}, `${history.length}회`)),
      h('a', { class: 'tile', href: '#/settings' }, h('strong', {}, '설정'), h('small', {}, '시간·음성·음량')),
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, '지금 상태'),
      h(
        'ul',
        { class: 'facts' },
        h('li', {}, h('span', {}, '상자 1 · 2 · 3'), h('b', {}, `${boxes[1]} · ${boxes[2]} · ${boxes[3]}`)),
        h('li', {}, h('span', {}, '다시 풀기'), h('b', {}, `${retry}문항`)),
        lastSummary &&
          h(
            'li',
            {},
            h('span', {}, `최근 연습 (${formatDateTime(last.startedAt)})`),
            h('b', {}, `평균 반응 ${formatSec(lastSummary.avgReactionMs)}`),
          ),
      ),
    ),
    h(
      'section',
      { class: 'card principles' },
      h('h2', {}, '응대 원칙'),
      h('ol', {}, PRINCIPLES.map((p) => h('li', {}, p))),
    ),
    installBtn,
  );

  return { el, title: '카드 응대 연습', destroy: offInstall };
}
