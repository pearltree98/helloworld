// 문항 형식 검사. 브라우저(data.js)와 Node(scripts/validate.mjs)가 함께 쓴다.
// errors가 있으면 그 문항은 앱에 나오지 않고, warnings는 나오되 콘솔에 알린다.

export const OPTION_COUNT = 5;

const filled = (v) => typeof v === 'string' && v.trim() !== '';

export function checkQuestion(q) {
  const errors = [];
  const warnings = [];

  if (!q || typeof q !== 'object' || Array.isArray(q)) {
    return { errors: ['문항이 객체({ … })가 아닙니다'], warnings };
  }

  if (!filled(q.id)) errors.push('id가 없습니다');
  if (!filled(q.type)) errors.push('type(유형)이 없습니다');
  if (!filled(q.prompt)) errors.push('prompt(발문)가 없습니다');
  if (q.passage != null && typeof q.passage !== 'string') errors.push('passage는 문자열이어야 합니다');

  if (!Array.isArray(q.options) || q.options.length !== OPTION_COUNT) {
    const n = Array.isArray(q.options) ? q.options.length : '없음';
    errors.push(`options는 ${OPTION_COUNT}개여야 합니다 (현재 ${n})`);
  } else {
    q.options.forEach((o, i) => {
      if (!o || !filled(o.text)) {
        errors.push(`options[${i}].text가 없습니다`);
        return;
      }
      if (!filled(o.keyword)) warnings.push(`options[${i}].keyword가 비었습니다`);
      if (!filled(o.explain)) warnings.push(`options[${i}].explain이 비었습니다`);
    });
  }

  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= OPTION_COUNT) {
    errors.push(`answer는 0~${OPTION_COUNT - 1} 사이 정수여야 합니다 (0 = ①)`);
  }

  if (!filled(q.explanation)) warnings.push('explanation(문항 해설)이 비었습니다');
  if (q.refs != null && (!Array.isArray(q.refs) || !q.refs.every(filled))) {
    errors.push('refs는 문자열 배열이어야 합니다');
  }

  return { errors, warnings };
}
