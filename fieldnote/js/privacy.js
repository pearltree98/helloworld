// 메모·장소 별칭에서 고객 개인정보로 보이는 표현을 찾는다.
// 찾으면 저장을 막는다. 순수 함수만 둔다(브라우저와 node:test 양쪽에서 쓴다).

const SURNAMES =
  '김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부';

const TITLES =
  '씨|님|사장|부장|과장|차장|대리|주임|팀장|실장|원장|이사|상무|전무|대표|선생|소장|반장|매니저|계장|간호사|약사';

// 성씨 글자로 시작하지만 이름이 아닌 말(직함·부서·일반 명사). "사장님", "고객님", "구매팀장"
const COMMON_WORDS = new Set(
  (
    '사장 부장 원장 이사 이사장 부사장 부원장 부회장 주임 차장 반장 소장 기사 선생 경리 고객 손 사원 사모 ' +
    '구매 인사 설계 기획 시설 연구 원무 공무 공정 주방 매장 노무 안전 전산 전략 홍보 총괄 관리 경영 ' +
    '부서 지점 본부 지사 공장 현장 사무 영업 담당 신입 여직원 남직원 주인 사업 대리 과장 실장 팀장 ' +
    '조장 조리 배송 물류 하청 협력 거래 방문 상담 전무 상무 성함 이름 국장 계장 교장 교감 원감 ' +
    '이분 그분 저분 한분 두분 세분 여사 사람'
  ).split(' '),
);

const RULES = [
  {
    type: 'rrn',
    label: '주민·외국인등록번호',
    re: /(?<!\d)\d{6}\s?[-–]\s?[1-8]\d{6}(?!\d)/g,
  },
  {
    type: 'email',
    label: '이메일 주소',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g,
  },
  {
    type: 'card',
    label: '카드·계좌번호',
    re: /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g,
  },
  {
    type: 'phone',
    label: '휴대전화 번호',
    re: /(?<!\d)(?:\+?82[-\s.]?)?0?1[016789][-\s.)]?\d{3,4}[-\s.]?\d{4}(?!\d)/g,
  },
  {
    type: 'phone',
    label: '전화번호',
    re: /(?<!\d)\(?0(?:2|[3-6][1-5]|70|50\d)\)?[-\s.)]?\d{3,4}[-\s.]?\d{4}(?!\d)/g,
  },
  {
    type: 'address',
    label: '집 주소(동·호수)',
    re: /\d{1,4}\s?동\s?\d{1,4}\s?호/g,
  },
  {
    type: 'birth',
    label: '생년월일',
    re: /(?:19|20)\d{2}\s?년\s?\d{1,2}\s?월\s?\d{1,2}\s?일\s?생|(?<!\d)\d{2,4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s?생/g,
  },
  {
    // "김민수 씨", "박 과장님", "최부장" — 성 + 이름(0~2자) + 호칭.
    // 지시어 "이 사장님"(this boss)처럼 '이' 뒤에 띄어쓰기가 오는 경우는 제외한다.
    type: 'name',
    label: '사람 이름',
    re: new RegExp(`(?<![가-힣])([${SURNAMES}])([가-힣]{0,2})(\\s?)(?:${TITLES})`, 'g'),
    accept(m) {
      const [, surname, given, space] = m;
      if (surname === '이' && space && !given) return false; // "이 사장님" = 지시어
      return !COMMON_WORDS.has(surname + given);
    },
  },
  {
    type: 'name',
    label: '사람 이름',
    re: /(?:이름|성함)\s?(?:은|는|:)\s?(?!모|몰|못|안\s|비공개)[가-힣]{2,4}/g,
  },
];

// 날짜(2026.11.24)나 금액(15,000원)처럼 숫자가 많아도 개인정보가 아닌 것
const SAFE_NUMBER = [
  /^(?:19|20)\d{2}[.\-/ ]\d{1,2}[.\-/ ]\d{1,2}$/, // 날짜
];

/**
 * @param {string} text
 * @returns {{type:string,label:string,start:number,end:number,text:string}[]}
 */
export function findPersonalInfo(text) {
  if (!text) return [];
  const hits = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const m of text.matchAll(rule.re)) {
      if (rule.accept && !rule.accept(m)) continue;
      const raw = m[0].trim();
      if (SAFE_NUMBER.some((re) => re.test(raw))) continue;
      const start = m.index + m[0].indexOf(raw);
      hits.push({ type: rule.type, label: rule.label, start, end: start + raw.length, text: raw });
    }
  }
  // 겹치는 구간은 먼저(더 구체적인 규칙) 잡힌 것만 남긴다
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  for (const h of hits) {
    const last = out[out.length - 1];
    if (last && h.start < last.end) continue;
    out.push(h);
  }
  return out;
}

/** 찾은 부분을 ○로 가린 문자열 */
export function maskPersonalInfo(text) {
  const hits = findPersonalInfo(text);
  let out = '';
  let pos = 0;
  for (const h of hits) {
    out += text.slice(pos, h.start) + '○'.repeat(Math.min(h.text.length, 6));
    pos = h.end;
  }
  return out + text.slice(pos);
}

export const BLOCKED_FIELDS = [
  '고객 이름',
  '전화번호',
  '이메일',
  '주민·외국인등록번호',
  '카드·계좌번호',
  '집 주소',
  '생년월일',
  '나이·성별',
  '얼굴 사진',
];
