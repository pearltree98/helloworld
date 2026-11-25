// Small numeric helpers shared by the result, summary and history screens. Pure.

export function formatSec(ms, digits = 1) {
  if (!Number.isFinite(ms)) return '—';
  return `${(ms / 1000).toFixed(digits)}초`;
}

export function mean(values) {
  const v = values.filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/**
 * Speaking loudness of an answer: the mean of the louder half of the meter
 * readings, so pauses between words don't drag the average down.
 */
export function activeLevel(levels) {
  const v = levels.filter(Number.isFinite).sort((a, b) => b - a);
  if (v.length === 0) return null;
  return mean(v.slice(0, Math.ceil(v.length / 2)));
}

/** Summary of one session's items (see practice screen for the item shape). */
export function summarize(items) {
  const answered = items.filter((i) => !i.skipped && Number.isFinite(i.reactionMs));
  return {
    count: items.length,
    detected: answered.length,
    avgReactionMs: mean(answered.map((i) => i.reactionMs)),
    withinLimit: answered.filter((i) => !i.late).length,
    retryCount: items.filter((i) => i.retry).length,
    skipped: items.filter((i) => i.skipped).length,
  };
}
