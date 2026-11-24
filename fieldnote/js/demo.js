// 데모 데이터: 성적표가 어떻게 보이는지 미리 보기 위한 가상 기록.
// 모든 항목에 demo: true가 붙어 있어 설정에서 데모만 골라 지울 수 있다. 실제 사람·상호는 쓰지 않는다.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLACES = [
  ['가산 A타워 7층 사무실', 'office', 37.4786, 126.8826],
  ['가산 B타워 3층 IT회사', 'office', 37.4772, 126.8857],
  ['디지털로 지식산업센터 11층', 'office', 37.4811, 126.8823],
  ['가산 물류센터 2동', 'factory', 37.4745, 126.8792],
  ['구로 기계공구상가 3열', 'factory', 37.4893, 126.8862],
  ['독산동 인쇄공장', 'factory', 37.4714, 126.8941],
  ['구로역 앞 내과', 'hospital', 37.5031, 126.8822],
  ['가산 메디컬빌딩 2층 치과', 'hospital', 37.4802, 126.8868],
  ['디지털단지 오피스텔 1층 상가', 'shop', 37.4826, 126.8795],
  ['구로시장 입구 점포', 'shop', 37.4947, 126.8889],
  ['가산 먹자골목 백반집', 'restaurant', 37.4791, 126.8871],
  ['디지털로 카페거리', 'restaurant', 37.4818, 126.8846],
  ['구로 구민회관 민원실', 'public', 37.4954, 126.8875],
  ['가산 직업학교', 'school', 37.4765, 126.8812],
];

const MEMOS = [
  '점심 직후에 대표님이 여유가 있었음. 다음에도 이 시간대로',
  '경비실에서 출입 제한. 1층 로비에서만 가능',
  '연회비 상쇄 계산 보여주니 관심이 확 올라감',
  '다음 주에 다시 오라고 함. 자료 두고 나옴',
  '회의 중이라 1분만 이야기함',
  '이미 카드 4장 있다고 함. 주유 혜택 비교가 먹힘',
  '신용조회 이야기에서 분위기가 식음. 조회 기록 영향 설명을 더 준비할 것',
  '비 와서 손님 적고 직원들이 여유 있었음',
  '',
  '',
  '',
];

const BASE = { factory: 0.34, office: 0.24, shop: 0.17, restaurant: 0.13, hospital: 0.06, public: 0.05, school: 0.12, etc: 0.15 };
const OVERCOME = { annual_fee: 0.45, credit_check: 0.18, many_cards: 0.35, no_time: 0.4, no_need: 0.25, policy: 0.1, family: 0.3, distrust: 0.2 };
const TECH_BONUS = { fee_offset: 0.3, compare: 0.18, short: 0.2, numbers: 0.12, question: 0.08, empathy: 0.05, revisit: 0, leaflet: -0.15 };
const GOOD_TECH = {
  annual_fee: ['fee_offset', 'numbers', 'empathy'],
  credit_check: ['empathy', 'question', 'numbers'],
  many_cards: ['compare', 'numbers', 'question'],
  no_time: ['short', 'revisit', 'leaflet'],
  no_need: ['question', 'numbers', 'empathy'],
  policy: ['leaflet', 'revisit'],
  family: ['revisit', 'leaflet'],
  distrust: ['empathy', 'question'],
};

export function generateDemo(now = new Date(), count = 64) {
  const r = rng(20261124);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const weighted = (pairs) => {
    const total = pairs.reduce((a, [, w]) => a + w, 0);
    let x = r() * total;
    for (const [k, w] of pairs) if ((x -= w) <= 0) return k;
    return pairs[pairs.length - 1][0];
  };

  const places = PLACES.map(([name, industry, lat, lng], i) => ({
    id: `demo_p${i}`,
    name,
    industry,
    lat,
    lng,
    address: '서울 금천·구로 일대(데모)',
    createdAt: new Date(now.getTime() - 50 * 86400000).toISOString(),
    demo: true,
  }));

  const visits = [];
  for (let i = 0; i < count; i++) {
    // 최근 45일, 주말은 드물게
    let d;
    do {
      d = new Date(now.getTime() - Math.floor(r() * 45) * 86400000);
    } while ((d.getDay() === 0 || d.getDay() === 6) && r() < 0.85);
    const hour = weighted([[8, 1], [9, 2], [10, 4], [11, 4], [12, 4], [13, 3], [14, 4], [15, 4], [16, 3], [17, 2], [18, 1]]);
    d.setHours(hour, Math.floor(r() * 60), 0, 0);
    if (d > now) d = new Date(now.getTime() - 3600000);

    const place = pick(places);
    const role = weighted([['owner', 3], ['manager', 3], ['staff', 4], ['gate', 1.5]]);
    const pace = weighted([['hurried', 3], ['normal', 4], ['relaxed', 2]]);
    const crowd = weighted([['quiet', 3], ['normal', 4], ['busy', 2]]);
    const reaction = weighted([['warm', 3], ['neutral', 5], ['cold', 2.5]]);
    const weather = weighted([['clear', 6], ['cloudy', 3], ['rain', 1.2], ['snow', 0.3]]);

    let p = BASE[place.industry];
    if (hour >= 12 && hour < 14) p *= place.industry === 'factory' ? 1.9 : 1.3;
    if (hour < 9 || hour >= 17) p *= 0.6;
    p *= { hurried: 0.45, normal: 1, relaxed: 1.6 }[pace];
    p *= { warm: 2, neutral: 1, cold: 0.3 }[reaction];
    p *= { owner: 1.35, manager: 1.1, staff: 0.9, gate: 0.25 }[role];
    if (weather === 'rain') p *= 0.85;

    const objections = [];
    const nObj = reaction === 'cold' ? weighted([[1, 3], [2, 1]]) : weighted([[0, 3], [1, 4], [2, 1.5]]);
    const types = ['annual_fee', 'credit_check', 'many_cards', 'no_time', 'no_need', 'policy', 'family', 'distrust'];
    for (let j = 0; j < nObj; j++) {
      const type = weighted(types.map((t) => [t, { annual_fee: 4, credit_check: 3, many_cards: 4, no_time: 4, no_need: 2, policy: 1, family: 1, distrust: 1 }[t]]));
      if (objections.some((o) => o.type === type)) continue;
      const technique = r() < 0.7 ? pick(GOOD_TECH[type]) : pick(Object.keys(TECH_BONUS));
      const overcome = r() < Math.min(0.92, OVERCOME[type] + TECH_BONUS[technique]);
      objections.push({ type, technique, overcome });
    }
    if (objections.length) p *= objections.every((o) => o.overcome) ? 1.5 : 0.25;

    const applied = r() < Math.min(0.85, p);
    let stage;
    let outcome;
    if (applied) {
      stage = 'close';
      outcome = 'applied';
    } else {
      stage = objections.length
        ? weighted([['objection', 3], ['close', objections.every((o) => o.overcome) ? 3 : 0.6]])
        : weighted([['approach', reaction === 'cold' ? 4 : 1.5], ['interest', 2.5], ['explain', 2], ['close', 0.8]]);
      outcome = weighted([['rejected', 5], ['info', 2.5], ['revisit', stage === 'close' || stage === 'objection' ? 2.5 : 0.8]]);
    }
    let revisitDate = '';
    if (outcome === 'revisit') {
      const rd = new Date(d.getTime() + (3 + Math.floor(r() * 14)) * 86400000);
      revisitDate = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, '0')}-${String(rd.getDate()).padStart(2, '0')}`;
    }

    visits.push({
      id: `demo_v${i}`,
      createdAt: d.toISOString(),
      lat: place.lat + (r() - 0.5) * 0.0006,
      lng: place.lng + (r() - 0.5) * 0.0006,
      accuracy: 10 + Math.floor(r() * 30),
      address: place.address,
      placeId: place.id,
      industry: place.industry,
      role,
      crowd,
      pace,
      reaction,
      weather,
      temp: weather === 'snow' ? -2 : 4 + Math.floor(r() * 10),
      stage,
      objections,
      outcome,
      product: applied ? pick(['생활 할인 카드', '주유 특화 카드', '온라인 쇼핑 카드', '체크카드 겸용']) : '',
      revisitDate,
      memo: pick(MEMOS),
      demo: true,
    });
  }
  return { visits, places };
}
