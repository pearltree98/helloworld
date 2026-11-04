import { CATEGORY_KEYS, OUTCOME_KEYS } from './catalog.js';

export class ValidationError extends Error {
  constructor(errors) {
    super('입력값이 올바르지 않습니다.');
    this.status = 400;
    this.errors = errors;
  }
}

const LIMITS = {
  title: 80,
  situation: 2000,
  hazard: 500,
  exposure: 500,
  avoidance: 1000,
  risky_habit: 500,
  location_text: 120,
  source_url: 500,
  message: 300,
  nickname: 20,
};

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function intIn(v, min, max) {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function validateCase(body) {
  const errors = {};
  const out = {};

  for (const field of ['title', 'situation', 'hazard', 'exposure', 'avoidance']) {
    const v = str(body[field]);
    if (!v) errors[field] = '필수 항목입니다.';
    else if (v.length > LIMITS[field]) errors[field] = `${LIMITS[field]}자 이내로 적어주세요.`;
    out[field] = v;
  }
  for (const field of ['risky_habit', 'location_text']) {
    const v = str(body[field]);
    if (v.length > LIMITS[field]) errors[field] = `${LIMITS[field]}자 이내로 적어주세요.`;
    out[field] = v || null;
  }

  const source = str(body.source_url);
  if (source) {
    if (source.length > LIMITS.source_url || !/^https?:\/\//i.test(source)) {
      errors.source_url = 'http(s)로 시작하는 주소만 넣을 수 있습니다.';
    }
  }
  out.source_url = source || null;

  out.category = str(body.category);
  if (!CATEGORY_KEYS.has(out.category)) errors.category = '분류를 선택해주세요.';

  out.outcome = str(body.outcome) || 'near_miss';
  if (!OUTCOME_KEYS.has(out.outcome)) errors.outcome = '결과 유형이 올바르지 않습니다.';

  out.severity = intIn(body.severity, 1, 5);
  if (out.severity === null) errors.severity = '1~5 사이로 골라주세요.';
  out.likelihood = intIn(body.likelihood, 1, 5);
  if (out.likelihood === null) errors.likelihood = '1~5 사이로 골라주세요.';

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

export function validateTicket(body) {
  const errors = {};
  const message = str(body.message);
  if (!message) errors.message = '티켓에 남길 한마디를 적어주세요.';
  else if (message.length > LIMITS.message) errors.message = `${LIMITS.message}자 이내로 적어주세요.`;

  let pledge = 0;
  if (body.pledge_krw !== undefined && body.pledge_krw !== null && body.pledge_krw !== '') {
    const n = intIn(body.pledge_krw, 0, 1_000_000);
    if (n === null) errors.pledge_krw = '0원 이상 100만 원 이하의 정수만 가능합니다.';
    else pledge = n;
  }

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return { message, pledge_krw: pledge };
}

export function cleanNickname(v) {
  const s = str(v).replace(/[\u0000-\u001f]/g, '');
  if (!s) return '익명';
  return s.slice(0, LIMITS.nickname);
}

export function isVisitorId(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v);
}
