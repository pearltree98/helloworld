/**
 * 위험도(Risk) = 심각도(Severity) × 발생 가능성(Likelihood)
 * 산업안전에서 널리 쓰는 5×5 리스크 매트릭스를 그대로 따른다.
 *
 * 용어 정리 (앱 전체에서 같은 뜻으로 사용):
 *  - hazard   (위해 요인): 해를 끼칠 수 있는 '원천'. 예) 대형 트럭의 우측 사각지대
 *  - exposure (노출 상태): 그 원천에 사람이 놓이게 되는 '상태'. 예) 트럭 우측 바로 옆에 서 있음
 *  - risk     (위험도): 노출이 실제 피해로 이어질 가능성 × 피해의 크기
 *  - avoidance(회피 행동): 노출을 끊어 위험도를 0에 가깝게 만드는 '내가 할 수 있는 행동'
 */

export const RISK_LEVELS = [
  { max: 4, key: 'low', label: '낮음' },
  { max: 9, key: 'moderate', label: '보통' },
  { max: 15, key: 'high', label: '높음' },
  { max: 25, key: 'critical', label: '매우 높음' },
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
  const level = riskLevel(score);
  return { ...row, risk_score: score, risk_level: level.key, risk_label: level.label };
}
