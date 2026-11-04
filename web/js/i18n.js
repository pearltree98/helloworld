/**
 * UI strings. English is the default; other locales fall back to English key by key.
 * Category / outcome / risk labels come from the server (/api/meta?lang=) so both sides agree.
 */
export const BRAND = 'Stepback';

const en = {
  tagline: 'See the hazard early. Hand the lesson on.',
  nav: { cases: 'Cases', wall: 'Ticket wall', about: 'Why', new: 'Record a case' },
  who: { edit: 'Change your display name (max 20 characters)', saved: 'You will now be recorded as "{name}".' },
  lang: { label: 'Language' },
  footer: 'No blame. We record the structure that keeps people safe.',
  errors: {
    generic: 'Something went wrong.',
    not_found: 'Page not found.',
    case_not_found: 'Case not found.',
    required: 'This field is required.',
    too_long: 'Keep it under {max} characters.',
    invalid_url: 'Only addresses starting with http(s) are allowed.',
    invalid_choice: 'Please pick one of the options.',
    out_of_range: 'Enter a whole number between {min} and {max}.',
    check_fields: 'Please check the fields marked in red.',
  },
  home: {
    h1: 'Nothing happening is the biggest win.',
    lead: 'A close call, a crash you saw on video, your parents\' bathroom. Record the "avoiding action" you learned there and hand it to the next person.',
    stats: { cases: 'Cases recorded', lessons: 'Lessons taken', wall: 'Tickets on the wall', taken: 'Tickets handed on' },
    search: 'Search: reversing, ladder, black ice…',
    sort: { recent: 'Newest', risk: 'Highest risk', lessons: 'Most lessons taken' },
    all: 'All',
    empty: 'No cases yet. Record the first one.',
  },
  card: { avoid: 'Avoid it · ', lessons: 'Lessons {n}', tickets: 'Tickets {n}' },
  risk: { badge: 'Risk {score} · {label}', title: 'Severity {s} × Likelihood {l}', panel: 'Risk', severity: 'Severity', likelihood: 'Likelihood', score: 'Score' },
  detail: {
    back: '← All cases',
    by: '{name} · {date}',
    situation: 'What happened',
    hazard: 'Hazard — the source of harm',
    exposure: 'Exposure — the state that put me in its path',
    avoidance: 'Avoidance — what I can do',
    habit: 'A common habit that raises the risk',
    source: 'View source ↗',
    learn: 'I take this lesson',
    learned: 'Lesson taken ✓',
    learnToast: 'Remembered. May nothing happen.',
    count: { zero: 'Nobody has taken this lesson yet', one: '1 person has taken this lesson', some: '{n} people have taken this lesson' },
    share: 'Share this case',
    shareCopied: 'Link copied.',
    oneLine: 'In one line',
    wall: 'Ticket wall',
    wallLead: 'If this lesson protected you, pin a ticket for the next person. A ticket disappears once one person takes it, like a meal voucher on a café wall.',
    noTickets: 'No tickets yet. Pin the first one.',
  },
  ticket: {
    message: 'A note for the next person',
    placeholder: 'e.g. To every new driver: the fast lane is borrowed, not owned.',
    pledge: 'Safety-fund pledge (optional)',
    pledgeHint: 'No payment is taken yet. Pledge totals are public and are meant for "avoiding tools" such as reflective strips and bathroom grab bars.',
    pin: 'Pin the ticket',
    pinned: 'Your ticket is on the wall.',
    take: 'Take this ticket',
    mine: 'Your ticket',
    mineTitle: 'You cannot take a ticket you pinned yourself',
    taken: 'You took the ticket. Keep {name}\'s note with you.',
    takenBy: '→ taken by {name} ({date})',
    pledged: 'Safety-fund pledge {amount}',
  },
  wall: {
    h1: 'Ticket wall',
    lead: 'Tickets pinned by people who said "this lesson protected me". Take one and the lesson is recorded as yours; the ticket leaves the wall. People who take a ticket can pin one on another case.',
    stats: { wall: 'Tickets on the wall', taken: 'Tickets handed on', pledged: 'Pledged to the safety fund', lessons: 'Lessons taken' },
    empty: 'The wall is empty. Read a case and pin the first ticket.',
    recent: 'Recently handed on',
    none: 'None yet.',
  },
  form: {
    h1: 'Record a case',
    lead: 'One close call can protect someone else\'s day. Heinrich\'s ratio (1 serious injury : 29 minor : 300 near misses) says near misses are the most valuable data we have.',
    title: 'Title', titlePh: 'e.g. A child running behind a reversing car in a parking lot',
    category: 'Category',
    situation: 'What happened (or nearly happened)',
    situationHint: 'No need to name people or places. No blame. Describe the structure.',
    hazard: 'Hazard — what was the source of harm?',
    hazardHint: 'e.g. a truck\'s right-side blind spot / wet tile / a stopped object in a live lane',
    exposure: 'Exposure — what state put you in its path?',
    exposureHint: 'e.g. standing within 1 m of the truck\'s side / cruising in the fast lane with eyes on the bumper ahead',
    avoidance: 'Avoidance — what can I do?',
    avoidanceHint: 'The most important field. Write it as something the reader can do tomorrow.',
    habit: 'A common habit that raises the risk (optional)', habitPh: 'e.g. looking at your phone while waiting at the light',
    severity: 'Severity', severityHint: 'If it happens, how badly are people hurt?',
    severityScale: ['Trivial', 'Minor injury', 'Needs treatment', 'Serious / disabling', 'Fatal'],
    likelihood: 'Likelihood', likelihoodHint: 'In this situation, how often?',
    likelihoodScale: ['Rare', 'Occasional', 'Sometimes', 'Often', 'Almost always'],
    outcome: 'Outcome',
    location: 'Type of place (optional)', locationPh: 'e.g. bridges, tunnel exits',
    source: 'Source link (optional)',
    submit: 'Save the case',
    saved: 'Saved. Someone will take a step back because of this.',
  },
};

const ko = {
  tagline: '위험을 미리 보고, 교훈을 건넵니다.',
  nav: { cases: '사례', wall: '티켓 벽', about: '원리', new: '기록하기' },
  who: { edit: '이 브라우저에서 쓸 별명 (20자 이내)', saved: '이제 "{name}"으로 기록됩니다.' },
  lang: { label: '언어' },
  footer: '탓하지 않습니다. 사람을 지키는 구조를 기록합니다.',
  errors: {
    generic: '문제가 생겼습니다.',
    not_found: '페이지를 찾을 수 없습니다.',
    case_not_found: '사례를 찾을 수 없습니다.',
    required: '필수 항목입니다.',
    too_long: '{max}자 이내로 적어주세요.',
    invalid_url: 'http(s)로 시작하는 주소만 넣을 수 있습니다.',
    invalid_choice: '목록에서 골라주세요.',
    out_of_range: '{min}~{max} 사이의 정수를 넣어주세요.',
    check_fields: '빨간 글씨 항목을 확인해주세요.',
  },
  home: {
    h1: '아무 일도 일어나지 않은 것이 가장 큰 승리입니다.',
    lead: '아찔했던 순간, 영상으로 본 사고, 부모님 댁 욕실. 거기서 배운 "피하는 행동"을 기록하고 다음 사람에게 건넵니다.',
    stats: { cases: '기록된 사례', lessons: '교훈을 받은 횟수', wall: '벽에 붙은 티켓', taken: '건네진 티켓' },
    search: '검색: 후진, 사다리, 블랙아이스…',
    sort: { recent: '최신순', risk: '위험도순', lessons: '교훈 많이 받은 순' },
    all: '전체',
    empty: '아직 기록이 없습니다. 첫 번째 사례를 남겨주세요.',
  },
  card: { avoid: '피하는 행동 · ', lessons: '교훈 {n}', tickets: '티켓 {n}장' },
  risk: { badge: '위험도 {score} · {label}', title: '심각도 {s} × 가능성 {l}', panel: '위험도', severity: '심각도', likelihood: '가능성', score: '점수' },
  detail: {
    back: '← 사례 목록',
    by: '{name} · {date}',
    situation: '무슨 일이 있었나',
    hazard: '위해 요인 (Hazard) — 해의 원천',
    exposure: '노출 상태 (Exposure) — 나를 그 앞에 둔 상태',
    avoidance: '피하는 행동 (Avoidance) — 내가 할 수 있는 것',
    habit: '위험을 높이는 흔한 행위',
    source: '출처 보기 ↗',
    learn: '이 교훈을 받습니다',
    learned: '교훈을 받았습니다 ✓',
    learnToast: '기억하겠습니다. 아무 일도 없기를.',
    count: { zero: '아직 아무도 받지 않았습니다', one: '1명이 이 교훈을 받았습니다', some: '{n}명이 이 교훈을 받았습니다' },
    share: '이 사례 공유하기',
    shareCopied: '링크를 복사했습니다.',
    oneLine: '한 줄로',
    wall: '티켓 벽',
    wallLead: '이 교훈이 나를 지켰다면, 다음 사람을 위해 티켓 한 장을 벽에 붙여주세요. 티켓은 한 사람이 가져가면 사라집니다. 식당 벽의 식권처럼.',
    noTickets: '아직 티켓이 없습니다. 첫 티켓을 붙여주세요.',
  },
  ticket: {
    message: '다음 사람에게 남길 한마디',
    placeholder: '예) 초보 운전자에게. 1차선은 잠깐 빌려 쓰는 차로입니다.',
    pledge: '안전 기금 약정 (선택)',
    pledgeHint: '결제는 아직 받지 않습니다. 약정 합계는 공개되며, 반사띠·욕실 손잡이 같은 "피하는 도구"를 나누는 데 쓰일 예정입니다.',
    pin: '티켓 붙이기',
    pinned: '티켓을 벽에 붙였습니다.',
    take: '이 티켓 받기',
    mine: '내가 붙인 티켓',
    mineTitle: '내가 붙인 티켓은 가져갈 수 없습니다',
    taken: '티켓을 받았습니다. {name}님의 한마디를 기억해주세요.',
    takenBy: '→ {name}님이 가져감 ({date})',
    pledged: '안전 기금 약정 {amount}',
  },
  wall: {
    h1: '티켓 벽',
    lead: '누군가 "이 교훈이 나를 지켰다"며 붙여 둔 티켓입니다. 한 장을 가져가면 그 교훈을 받은 것으로 기록되고, 티켓은 벽에서 사라집니다. 가져간 사람은 다시 다른 사례에 티켓을 붙일 수 있습니다.',
    stats: { wall: '벽에 붙은 티켓', taken: '건네진 티켓', pledged: '약정된 안전 기금', lessons: '받은 교훈' },
    empty: '벽이 비어 있습니다. 사례를 읽고 첫 티켓을 붙여주세요.',
    recent: '최근에 건네진 티켓',
    none: '아직 없습니다.',
  },
  form: {
    h1: '사례 기록하기',
    lead: '아찔했던 한 순간이 다른 사람의 하루를 지킵니다. 하인리히 법칙(중상 1 : 경상 29 : 아차 300)대로, 아차 사고 하나하나가 가장 값진 데이터입니다.',
    title: '제목', titlePh: '예) 주차장에서 후진하는 차 뒤로 지나가던 아이',
    category: '분류',
    situation: '무슨 일이 있었나 (또는 있을 뻔했나)',
    situationHint: '사람·장소를 특정하지 않아도 됩니다. 탓하지 않습니다. 구조를 적습니다.',
    hazard: '위해 요인 (Hazard) — 해의 원천은 무엇이었나',
    hazardHint: '예) 대형차의 우측 사각지대 / 젖은 타일 바닥 / 주행 차로 위의 정지 물체',
    exposure: '노출 상태 (Exposure) — 어떤 상태가 나를 그 앞에 두었나',
    exposureHint: '예) 트럭 우측 1m 안에 서 있음 / 1차선 정속 주행 중 시선이 앞차 범퍼에 고정',
    avoidance: '피하는 행동 (Avoidance) — 내가 할 수 있는 것',
    avoidanceHint: '가장 중요한 칸입니다. 읽는 사람이 내일 당장 할 수 있는 행동으로 적어주세요.',
    habit: '위험을 높이는 흔한 행위 (선택)', habitPh: '예) 신호 대기 중 스마트폰 보기',
    severity: '심각도', severityHint: '일어났을 때 얼마나 크게 다치나',
    severityScale: ['경미', '가벼운 부상', '치료 필요', '중상·장애', '사망'],
    likelihood: '발생 가능성', likelihoodHint: '같은 상황에서 얼마나 자주',
    likelihoodScale: ['드묾', '가끔', '종종', '자주', '거의 항상'],
    outcome: '결과',
    location: '장소 유형 (선택)', locationPh: '예) 교량, 터널 출구',
    source: '출처 링크 (선택)',
    submit: '사례 남기기',
    saved: '기록되었습니다. 누군가는 이 글 덕분에 한 걸음 물러설 것입니다.',
  },
};

export const LOCALES = [
  { key: 'en', label: 'English' },
  { key: 'ko', label: '한국어' },
];
const DICTS = { en, ko };
const KEY = 'stepback.locale';

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && DICTS[saved]) return saved;
  } catch { /* storage blocked */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return DICTS[nav] ? nav : 'en';
}

export let locale = detect();

export function setLocale(next) {
  if (!DICTS[next]) return;
  locale = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  document.documentElement.lang = next;
}

function lookup(dict, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

/** t('detail.count.some', { n: 3 }) → "3 people have taken this lesson" */
export function t(path, vars = {}) {
  const raw = lookup(DICTS[locale], path) ?? lookup(en, path) ?? path;
  if (Array.isArray(raw)) return raw;
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

/** Server validation error → localized sentence. */
export function tError(err) {
  if (!err) return '';
  if (typeof err === 'string') return t(`errors.${err}`);
  return t(`errors.${err.code}`, err);
}
