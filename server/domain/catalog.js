/** 카테고리와 결과 유형. 프론트엔드도 /api/meta 로 같은 값을 받아 쓴다. */

export const CATEGORIES = [
  { key: 'road', label: '도로·운전' },
  { key: 'walk', label: '보행' },
  { key: 'home', label: '가정' },
  { key: 'work', label: '작업·현장' },
  { key: 'transit', label: '대중교통' },
  { key: 'air', label: '항공' },
  { key: 'water', label: '물·해양' },
  { key: 'other', label: '기타' },
];

export const OUTCOMES = [
  { key: 'near_miss', label: '아찔했지만 무사함' },
  { key: 'observed', label: '목격·영상으로 배움' },
  { key: 'injury', label: '부상' },
  { key: 'fatal', label: '사망' },
];

export const CATEGORY_KEYS = new Set(CATEGORIES.map((c) => c.key));
export const OUTCOME_KEYS = new Set(OUTCOMES.map((o) => o.key));
