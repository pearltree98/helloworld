import { h, topbar } from './ui/dom.js';
import { parseHash, navigate } from './nav.js';
import { homeScreen } from './screens/home.js';
import { practiceScreen } from './screens/practice.js';
import { permissionScreen } from './screens/permission.js';
import { loadFlags } from './core/store.js';

function placeholder(title) {
  return () => ({
    el: h('main', { class: 'screen' }, topbar(title), h('p', { class: 'muted' }, '준비 중입니다.')),
    title,
  });
}

const ROUTES = {
  '': homeScreen,
  practice: practiceScreen,
  permission: permissionScreen,
  bank: placeholder('질문 은행'),
  history: placeholder('기록'),
  settings: placeholder('설정'),
};

export function startRouter(root) {
  let current = null;

  function render() {
    const route = parseHash();
    if (route.name === '' && !loadFlags().permissionIntroSeen) {
      navigate('permission', { replace: true });
      return;
    }
    const make = ROUTES[route.name] || homeScreen;
    try {
      current?.destroy?.();
    } catch (err) {
      console.warn(err);
    }
    current = make(route);
    root.replaceChildren(current.el);
    document.title = current.title ? `${current.title} · 카드 응대 연습` : '카드 응대 연습';
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);
  render();
}
