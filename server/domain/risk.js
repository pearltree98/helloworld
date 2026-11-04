/**
 * Risk = Severity × Likelihood, on the 5×5 matrix used across industrial safety.
 *
 * Vocabulary (used consistently across the whole app):
 *  - hazard    : the *source* of potential harm.            e.g. a truck's right-side blind spot
 *  - exposure  : the *state* that puts a person in its path. e.g. standing 1 m from the truck's right side
 *  - risk      : likelihood that exposure turns into harm × how bad the harm is
 *  - avoidance : the action *I* can take to break the exposure and drive risk toward zero
 */

export const RISK_LEVELS = [
  { max: 4, key: 'low' },
  { max: 9, key: 'moderate' },
  { max: 15, key: 'high' },
  { max: 25, key: 'critical' },
];

export function riskScore(severity, likelihood) {
  return severity * likelihood;
}

export function riskLevel(score) {
  return RISK_LEVELS.find((l) => score <= l.max) ?? RISK_LEVELS.at(-1);
}

export function withRisk(row) {
  if (!row) return row;
  const score = riskScore(row.severity, row.likelihood);
  return { ...row, risk_score: score, risk_level: riskLevel(score).key };
}
