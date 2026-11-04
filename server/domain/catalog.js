/** Categories, outcomes and risk levels. The frontend receives localized labels from /api/meta. */

export const LOCALES = ['en', 'ko'];
export const DEFAULT_LOCALE = 'en';

export const CATEGORIES = [
  { key: 'road', labels: { en: 'Road & driving', ko: '도로·운전' } },
  { key: 'walk', labels: { en: 'Walking', ko: '보행' } },
  { key: 'home', labels: { en: 'Home', ko: '가정' } },
  { key: 'work', labels: { en: 'Work & sites', ko: '작업·현장' } },
  { key: 'transit', labels: { en: 'Public transit', ko: '대중교통' } },
  { key: 'air', labels: { en: 'Aviation', ko: '항공' } },
  { key: 'water', labels: { en: 'Water', ko: '물·해양' } },
  { key: 'outdoors', labels: { en: 'Outdoors', ko: '야외·등산' } },
  { key: 'other', labels: { en: 'Other', ko: '기타' } },
];

export const OUTCOMES = [
  { key: 'near_miss', labels: { en: 'Near miss, unharmed', ko: '아찔했지만 무사함' } },
  { key: 'observed', labels: { en: 'Witnessed or learned from footage', ko: '목격·영상으로 배움' } },
  { key: 'injury', labels: { en: 'Injury', ko: '부상' } },
  { key: 'fatal', labels: { en: 'Fatal', ko: '사망' } },
];

export const CATEGORY_KEYS = new Set(CATEGORIES.map((c) => c.key));
export const OUTCOME_KEYS = new Set(OUTCOMES.map((o) => o.key));

export function pickLocale(v) {
  return LOCALES.includes(v) ? v : DEFAULT_LOCALE;
}

export function localize(list, locale) {
  return list.map(({ labels, ...rest }) => ({ ...rest, label: labels[locale] ?? labels[DEFAULT_LOCALE] }));
}
