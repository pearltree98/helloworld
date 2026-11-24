import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPersonalInfo, maskPersonalInfo } from '../fieldnote/js/privacy.js';

const BLOCKED = [
  ['010-1234-5678로 연락 달라고 함', 'phone'],
  ['01012345678', 'phone'],
  ['+82 10 1234 5678', 'phone'],
  ['사무실 02-123-4567', 'phone'],
  ['031 765 4321', 'phone'],
  ['850101-1234567', 'rrn'],
  ['메일 abc.def@naver.com 으로', 'email'],
  ['카드 1234-5678-9012-3456', 'card'],
  ['1234 5678 9012 3456', 'card'],
  ['101동 1203호 거주', 'address'],
  ['1990년 3월 4일생', 'birth'],
  ['김민수 씨가 관심 보임', 'name'],
  ['박 과장님 부재', 'name'],
  ['최부장 거절', 'name'],
  ['이름은 홍길동', 'name'],
  ['정수진님 재방문', 'name'],
];

const ALLOWED = [
  '사장님이 바빠서 다음 주 재방문',
  '이 사장님은 카드가 많다고 함',
  '고객님 반응 좋음',
  '원장님 진료 중',
  '손님이 많아서 대기',
  '연회비 15,000원 상쇄 계산 보여줌',
  '2026.11.24 재방문',
  '점심시간 12시 30분',
  '구매팀장 만남',
  '3층 사무실 직원 5명',
  '이름은 모름',
  '주임님이 안내해 줌',
  '차장님 회의 중',
  '기사님들 휴게실 앞',
  '선생님들 수업 중',
  '대표님 외근',
  '10만원 캐시백 설명',
  '오후 2시~4시 사이가 한가함',
  '가산 A동 3층',
  '신용조회 걱정이 많았음',
];

for (const [text, type] of BLOCKED) {
  test(`blocks ${type}: ${text}`, () => {
    const hits = findPersonalInfo(text);
    assert.ok(hits.length >= 1, 'should be detected');
    assert.equal(hits[0].type, type);
    assert.equal(text.slice(hits[0].start, hits[0].end), hits[0].text);
  });
}

for (const text of ALLOWED) {
  test(`allows: ${text}`, () => {
    assert.deepEqual(findPersonalInfo(text), []);
  });
}

test('mask replaces only the detected span', () => {
  const masked = maskPersonalInfo('010-1234-5678 연락 요청');
  assert.ok(!/\d{4}/.test(masked));
  assert.ok(masked.endsWith(' 연락 요청'));
  assert.equal(maskPersonalInfo('평범한 메모'), '평범한 메모');
});
