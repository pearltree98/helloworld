// Question bank: validation, import/export, merge. Pure functions.
import { PERSONA_IDS } from '../data/personas.js';
import { newId } from './ids.js';

export const LIMITS = { question: 300, modelAnswer: 2000, tag: 20, tags: 10, questions: 1000 };

const str = (v) => (typeof v === 'string' ? v : '');

export function normalizeTags(tags) {
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : [];
  const clean = list.map((t) => String(t).trim().slice(0, LIMITS.tag)).filter(Boolean);
  return [...new Set(clean)].slice(0, LIMITS.tags);
}

/** A clean question object, or null if `raw` has no question text. */
export function normalizeQuestion(raw, makeId = () => newId('u-')) {
  if (!raw || typeof raw !== 'object') return null;
  const question = str(raw.question).trim().slice(0, LIMITS.question);
  if (!question) return null;
  return {
    id: str(raw.id).trim().slice(0, 80) || makeId(),
    question,
    persona: PERSONA_IDS.includes(raw.persona) ? raw.persona : null,
    modelAnswer: str(raw.modelAnswer).trim().slice(0, LIMITS.modelAnswer),
    needsCheck: raw.needsCheck === true,
    tags: normalizeTags(raw.tags),
  };
}

/** Normalizes a list; drops entries without question text and renames duplicate ids. */
export function normalizeBank(list, makeId = () => newId('u-')) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list.slice(0, LIMITS.questions)) {
    const q = normalizeQuestion(raw, makeId);
    if (!q) continue;
    if (seen.has(q.id)) q.id = makeId();
    seen.add(q.id);
    out.push(q);
  }
  return out;
}

export function exportBank(questions, now = new Date()) {
  return {
    app: 'card-roleplay',
    kind: 'question-bank',
    version: 1,
    exportedAt: now.toISOString(),
    questions,
  };
}

/**
 * Parses an exported file (or a bare array of questions).
 * Returns { questions, skipped }; throws an Error with a Korean message on bad input.
 */
export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON 형식이 아닙니다.');
  }
  const list = Array.isArray(data) ? data : data?.questions;
  if (!Array.isArray(list)) throw new Error('questions 목록을 찾지 못했습니다.');
  const questions = normalizeBank(list);
  if (questions.length === 0) throw new Error('가져올 질문이 없습니다. 각 항목에 question이 있어야 합니다.');
  return { questions, skipped: list.length - questions.length };
}

/** Incoming questions replace those with the same id; the rest are appended. */
export function mergeBanks(current, incoming) {
  const byId = new Map(current.map((q) => [q.id, q]));
  for (const q of incoming) byId.set(q.id, q);
  return [...byId.values()];
}

/** Splits text into plain and "[확인 필요 …]" parts so the UI can highlight them. */
export function splitCheckMarkers(text) {
  return str(text)
    .split(/(\[[^\]]*\])/)
    .filter(Boolean)
    .map((part) => ({ text: part, marker: /^\[[^\]]*\]$/.test(part) }));
}
