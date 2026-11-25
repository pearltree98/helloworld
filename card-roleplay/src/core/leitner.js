// Leitner boxes 1–3. "다시 풀기" sends a question to box 1; a good answer moves it up one box.
// Sessions draw from box 1 first, then the least recently seen. Pure functions.

export const MAX_BOX = 3;

const num = (v) => (Number.isFinite(v) ? v : 0);

export function getEntry(progress, id) {
  const e = progress?.[id] || {};
  const box = Number.isInteger(e.box) ? Math.min(MAX_BOX, Math.max(1, e.box)) : 1;
  return {
    box,
    retry: e.retry === true,
    attempts: num(e.attempts),
    lastSeen: num(e.lastSeen),
    lastReactionMs: Number.isFinite(e.lastReactionMs) ? e.lastReactionMs : null,
  };
}

export function applyOutcome(entry, { retry, reactionMs = null }, now = Date.now()) {
  return {
    ...entry,
    box: retry ? 1 : Math.min(MAX_BOX, entry.box + 1),
    retry: Boolean(retry),
    attempts: entry.attempts + 1,
    lastSeen: now,
    lastReactionMs: Number.isFinite(reactionMs) ? reactionMs : entry.lastReactionMs,
  };
}

function shuffle(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks the questions for one session.
 * mode 'normal': `size` questions, lowest box first, then least recently seen.
 * mode 'retry':  every question marked 다시 풀기 (오답만 풀기).
 * The chosen questions are returned in random order.
 */
export function pickSession(questions, progress, { mode = 'normal', size = 5, random = Math.random } = {}) {
  let pool = questions.map((q) => ({ q, e: getEntry(progress, q.id), r: random() }));
  if (mode === 'retry') pool = pool.filter((x) => x.e.retry);
  pool.sort((a, b) => a.e.box - b.e.box || a.e.lastSeen - b.e.lastSeen || a.r - b.r);
  const chosen = mode === 'retry' ? pool : pool.slice(0, Math.max(1, size));
  return shuffle(
    chosen.map((x) => x.q),
    random,
  );
}

export function retryCount(questions, progress) {
  return questions.filter((q) => getEntry(progress, q.id).retry).length;
}

export function boxCounts(questions, progress) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const q of questions) counts[getEntry(progress, q.id).box]++;
  return counts;
}
