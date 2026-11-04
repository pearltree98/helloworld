import { CATEGORY_SET, OUTCOME_SET } from './catalog.js';

/**
 * Validation errors carry machine-readable codes per field so the client can localize them:
 *   { title: { code: 'required' }, situation: { code: 'too_long', max: 2000 } }
 */
export class ValidationError extends Error {
  constructor(errors) {
    super('Some fields are invalid.');
    this.status = 400;
    this.errors = errors;
  }
}

export const LIMITS = {
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
  pledge_max: 1_000_000,
};

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function intIn(v, min, max) {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function validateCase(body) {
  const errors = {};
  const out = {};

  for (const field of ['title', 'situation', 'hazard', 'exposure', 'avoidance']) {
    const v = str(body[field]);
    if (!v) errors[field] = { code: 'required' };
    else if (v.length > LIMITS[field]) errors[field] = { code: 'too_long', max: LIMITS[field] };
    out[field] = v;
  }
  for (const field of ['risky_habit', 'location_text']) {
    const v = str(body[field]);
    if (v.length > LIMITS[field]) errors[field] = { code: 'too_long', max: LIMITS[field] };
    out[field] = v || null;
  }

  const source = str(body.source_url);
  if (source && (source.length > LIMITS.source_url || !/^https?:\/\//i.test(source))) {
    errors.source_url = { code: 'invalid_url' };
  }
  out.source_url = source || null;

  out.category = str(body.category);
  if (!CATEGORY_SET.has(out.category)) errors.category = { code: 'invalid_choice' };

  out.outcome = str(body.outcome) || 'near_miss';
  if (!OUTCOME_SET.has(out.outcome)) errors.outcome = { code: 'invalid_choice' };

  out.severity = intIn(body.severity, 1, 5);
  if (out.severity === null) errors.severity = { code: 'out_of_range', min: 1, max: 5 };
  out.likelihood = intIn(body.likelihood, 1, 5);
  if (out.likelihood === null) errors.likelihood = { code: 'out_of_range', min: 1, max: 5 };

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

export function validateTicket(body) {
  const errors = {};
  const message = str(body.message);
  if (!message) errors.message = { code: 'required' };
  else if (message.length > LIMITS.message) errors.message = { code: 'too_long', max: LIMITS.message };

  let pledge = 0;
  if (body.pledge_amount !== undefined && body.pledge_amount !== null && body.pledge_amount !== '') {
    const n = intIn(body.pledge_amount, 0, LIMITS.pledge_max);
    if (n === null) errors.pledge_amount = { code: 'out_of_range', min: 0, max: LIMITS.pledge_max };
    else pledge = n;
  }

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return { message, pledge_amount: pledge };
}

export function cleanNickname(v) {
  const s = str(v).replace(/[\u0000-\u001f]/g, '');
  if (!s) return 'Anonymous';
  return s.slice(0, LIMITS.nickname);
}

export function isVisitorId(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v);
}
