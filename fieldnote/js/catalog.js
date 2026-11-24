// 기본 선택 항목. 기업체·상가 방문 영업 기준.
// key는 저장·통계에 쓰이므로 바꾸지 않는다. label은 설정에서 고칠 수 있다.
// 사람에 관한 항목은 "역할"과 "반응"뿐이다. 고객을 특정할 수 있는 항목(이름, 연락처, 연령, 성별)은 두지 않는다.

export const STAGES = [
  { key: 'approach', label: '접근', hint: '인사하고 말을 건넴' },
  { key: 'interest', label: '관심 유도', hint: '이야기를 들어 줌' },
  { key: 'explain', label: '상품 설명', hint: '혜택까지 설명함' },
  { key: 'objection', label: '이의 처리', hint: '거절 사유에 대응함' },
  { key: 'close', label: '클로징', hint: '신청을 권유함' },
];

export const OUTCOMES = [
  { key: 'applied', label: '신청 완료' },
  { key: 'revisit', label: '재방문 약속' },
  { key: 'info', label: '자료만 전달' },
  { key: 'rejected', label: '거절' },
];

// 통계 차원. 방문 기록에서 고르는 항목과 자동으로 붙는 항목(시간대·요일·날씨)
export const DEFAULT_CATALOG = {
  industry: [
    { key: 'office', label: '사무실' },
    { key: 'factory', label: '공장·물류' },
    { key: 'hospital', label: '병원·약국' },
    { key: 'shop', label: '상가·점포' },
    { key: 'restaurant', label: '식당·카페' },
    { key: 'public', label: '관공서·기관' },
    { key: 'school', label: '학교·학원' },
    { key: 'etc', label: '기타' },
  ],
  role: [
    { key: 'owner', label: '대표·사장' },
    { key: 'manager', label: '관리자·팀장' },
    { key: 'staff', label: '직원' },
    { key: 'gate', label: '경비·안내' },
  ],
  crowd: [
    { key: 'quiet', label: '한산' },
    { key: 'normal', label: '보통' },
    { key: 'busy', label: '붐빔' },
  ],
  pace: [
    { key: 'hurried', label: '바쁨' },
    { key: 'normal', label: '보통' },
    { key: 'relaxed', label: '여유' },
  ],
  reaction: [
    { key: 'warm', label: '호의적' },
    { key: 'neutral', label: '무관심' },
    { key: 'cold', label: '거부감' },
  ],
  objection: [
    { key: 'many_cards', label: '카드가 이미 많음' },
    { key: 'annual_fee', label: '연회비 부담' },
    { key: 'credit_check', label: '신용조회 걱정' },
    { key: 'no_time', label: '시간 없음' },
    { key: 'no_need', label: '혜택이 필요 없음' },
    { key: 'policy', label: '회사 방침상 불가' },
    { key: 'family', label: '가족과 상의' },
    { key: 'distrust', label: '영업 자체에 불신' },
  ],
  technique: [
    { key: 'empathy', label: '공감 후 전환' },
    { key: 'numbers', label: '혜택 금액으로 제시' },
    { key: 'fee_offset', label: '연회비 상쇄 계산' },
    { key: 'question', label: '질문으로 되묻기' },
    { key: 'compare', label: '쓰는 카드와 비교' },
    { key: 'short', label: '1분 요약' },
    { key: 'revisit', label: '재방문 약속 잡기' },
    { key: 'leaflet', label: '자료만 두고 나옴' },
  ],
};

export const AUTO_DIMENSIONS = {
  timeslot: [
    { key: 'early', label: '9시 이전' },
    { key: 'morning', label: '오전 9–12시' },
    { key: 'lunch', label: '점심 12–14시' },
    { key: 'afternoon', label: '오후 14–17시' },
    { key: 'evening', label: '17시 이후' },
  ],
  weekday: [
    { key: '1', label: '월' }, { key: '2', label: '화' }, { key: '3', label: '수' },
    { key: '4', label: '목' }, { key: '5', label: '금' }, { key: '6', label: '토' }, { key: '0', label: '일' },
  ],
  weather: [
    { key: 'clear', label: '맑음' },
    { key: 'cloudy', label: '흐림' },
    { key: 'rain', label: '비' },
    { key: 'snow', label: '눈' },
  ],
};

export const DIMENSION_TITLES = {
  industry: '업종',
  role: '만난 사람',
  crowd: '현장 혼잡도',
  pace: '상대의 여유',
  reaction: '첫 반응',
  objection: '거절 사유',
  technique: '대처 기법',
  timeslot: '시간대',
  weekday: '요일',
  weather: '날씨',
};

/** 사용자가 설정에서 바꾼 항목(추가·숨김·이름 변경)을 기본값 위에 합친다. */
export function mergeCatalog(custom = {}) {
  const out = {};
  for (const [dim, items] of Object.entries(DEFAULT_CATALOG)) {
    const c = custom[dim] ?? {};
    const base = items.map((it) => ({
      ...it,
      label: c.labels?.[it.key] ?? it.label,
      hidden: Boolean(c.hidden?.includes(it.key)),
    }));
    const added = (c.added ?? []).map((it) => ({ ...it, hidden: Boolean(c.hidden?.includes(it.key)) }));
    out[dim] = [...base, ...added];
  }
  return { ...out, ...AUTO_DIMENSIONS };
}

export function labelOf(catalog, dim, key) {
  if (key == null || key === '') return '—';
  const list = dim === 'stage' ? STAGES : dim === 'outcome' ? OUTCOMES : catalog[dim];
  return list?.find((it) => it.key === String(key))?.label ?? String(key);
}

/** 방문 시각에서 시간대 key */
export function timeslotOf(date) {
  const h = new Date(date).getHours();
  if (h < 9) return 'early';
  if (h < 12) return 'morning';
  if (h < 14) return 'lunch';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function weekdayOf(date) {
  return String(new Date(date).getDay());
}
