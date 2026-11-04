import { api, meta, ApiError } from '../api.js';
import { h, clear, field, toast } from '../ui.js';

export async function newCaseView(root) {
  const m = await meta();
  const errors = {};
  const refs = {};

  const text = (name, attrs = {}) => (refs[name] = h('input', { id: `f-${name}`, type: 'text', ...attrs }));
  const area = (name, attrs = {}) => (refs[name] = h('textarea', { id: `f-${name}`, ...attrs }));
  const select = (name, options, attrs = {}) => (refs[name] = h('select', { id: `f-${name}`, ...attrs },
    ...options.map((o) => h('option', { value: o.key }, o.label))));
  const scale = (name, labels) => (refs[name] = h('select', { id: `f-${name}` },
    ...labels.map((l, i) => h('option', { value: i + 1 }, `${i + 1} — ${l}`))));

  const errBox = h('p', { class: 'err' });
  const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, '사례 남기기');

  const form = h('form', { onsubmit: async (e) => {
    e.preventDefault();
    submit.disabled = true;
    errBox.textContent = '';
    for (const k of Object.keys(errors)) delete errors[k];
    const data = Object.fromEntries(Object.entries(refs).map(([k, el]) => [k, el.value]));
    try {
      const created = await api.createCase(data);
      toast('기록되었습니다. 누군가는 이 글 덕분에 한 걸음 물러설 것입니다.');
      location.hash = `#/case/${created.id}`;
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        Object.assign(errors, err.errors);
        paint();
        errBox.textContent = '빨간 글씨 항목을 확인해주세요.';
      } else errBox.textContent = err.message;
      submit.disabled = false;
    }
  } });

  function paint() {
    clear(form).append(
      h('div', { class: 'row' },
        field({ label: '제목', name: 'title', error: errors.title, control: text('title', { maxlength: 80, placeholder: '예) 주차장에서 후진하는 차 뒤로 지나가던 아이' }) }),
        field({ label: '분류', name: 'category', error: errors.category, control: select('category', m.categories) }),
      ),
      field({ label: '무슨 일이 있었나 (또는 있을 뻔했나)', name: 'situation', error: errors.situation,
        hint: '사람·장소를 특정하지 않아도 됩니다. 탓하지 않습니다. 구조를 적습니다.',
        control: area('situation', { maxlength: 2000 }) }),
      field({ label: '위해 요인 (Hazard) — 해의 원천은 무엇이었나', name: 'hazard', error: errors.hazard,
        hint: '예) 대형차의 우측 사각지대 / 젖은 타일 바닥 / 주행 차로 위의 정지 물체',
        control: area('hazard', { maxlength: 500 }) }),
      field({ label: '노출 상태 (Exposure) — 어떤 상태가 나를 그 앞에 두었나', name: 'exposure', error: errors.exposure,
        hint: '예) 트럭 우측 1m 안에 서 있음 / 1차선 정속 주행 중 시선이 앞차 범퍼에 고정',
        control: area('exposure', { maxlength: 500 }) }),
      field({ label: '피하는 행동 (Avoidance) — 내가 할 수 있는 것', name: 'avoidance', error: errors.avoidance,
        hint: '가장 중요한 칸입니다. 읽는 사람이 내일 당장 할 수 있는 행동으로 적어주세요.',
        control: area('avoidance', { maxlength: 1000 }) }),
      field({ label: '위험을 높이는 흔한 행위 (선택)', name: 'risky_habit', error: errors.risky_habit,
        control: text('risky_habit', { maxlength: 500, placeholder: '예) 신호 대기 중 스마트폰 보기' }) }),
      h('div', { class: 'row' },
        field({ label: '심각도', name: 'severity', error: errors.severity, hint: '일어났을 때 얼마나 크게 다치나',
          control: scale('severity', ['경미', '가벼운 부상', '치료 필요', '중상·장애', '사망']) }),
        field({ label: '발생 가능성', name: 'likelihood', error: errors.likelihood, hint: '같은 상황에서 얼마나 자주',
          control: scale('likelihood', ['드묾', '가끔', '종종', '자주', '거의 항상']) }),
        field({ label: '결과', name: 'outcome', error: errors.outcome, control: select('outcome', m.outcomes) }),
      ),
      h('div', { class: 'row' },
        field({ label: '장소 유형 (선택)', name: 'location_text', error: errors.location_text, control: text('location_text', { maxlength: 120, placeholder: '예) 교량, 터널 출구' }) }),
        field({ label: '출처 링크 (선택)', name: 'source_url', error: errors.source_url, control: text('source_url', { maxlength: 500, placeholder: 'https://' }) }),
      ),
      errBox,
      submit,
    );
    // 유지: 다시 그릴 때 값 보존
    for (const [k, v] of Object.entries(kept)) if (refs[k]) refs[k].value = v;
  }
  const kept = {};
  form.addEventListener('input', (e) => { if (e.target.id?.startsWith('f-')) kept[e.target.id.slice(2)] = e.target.value; });
  form.addEventListener('change', (e) => { if (e.target.id?.startsWith('f-')) kept[e.target.id.slice(2)] = e.target.value; });
  paint();
  refs.severity.value = 3; refs.likelihood.value = 3;

  clear(root).append(
    h('section', { class: 'hero' },
      h('h1', {}, '사례 기록하기'),
      h('p', {}, '아찔했던 한 순간이 다른 사람의 하루를 지킵니다. 큰 사고 1건 뒤에는 아차 사고 300건이 있다는 통계(하인리히 법칙)대로, 아차 사고 하나하나가 가장 값진 데이터입니다.'),
    ),
    h('div', { class: 'article' }, form),
  );
}
