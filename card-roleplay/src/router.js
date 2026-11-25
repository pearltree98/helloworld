import { parseHash, navigate } from './nav.js';
import { homeScreen } from './screens/home.js';
import { practiceScreen } from './screens/practice.js';
import { permissionScreen } from './screens/permission.js';
import { bankScreen } from './screens/bank.js';
import { historyScreen } from './screens/history.js';
import { settingsScreen } from './screens/settings.js';
import { loadFlags } from './core/store.js';

const ROUTES = {
  '': homeScreen,
  practice: practiceScreen,
  permission: permissionScreen,
  bank: bankScreen,
  history: historyScreen,
  settings: settingsScreen,
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
