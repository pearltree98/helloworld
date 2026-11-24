// 앱 전역 상태: 선택 항목(카탈로그)과 설정
import { mergeCatalog } from './catalog.js';
import { getKV, setKV } from './db.js';

export const state = {
  catalog: mergeCatalog(),
  customCatalog: {},
  settings: { networkLookup: true },
};

export async function loadState() {
  state.customCatalog = (await getKV('catalog', {})) ?? {};
  state.catalog = mergeCatalog(state.customCatalog);
  state.settings = { networkLookup: true, ...((await getKV('settings', {})) ?? {}) };
}

export async function saveCustomCatalog(custom) {
  state.customCatalog = custom;
  state.catalog = mergeCatalog(custom);
  await setKV('catalog', custom);
}

export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await setKV('settings', state.settings);
}
