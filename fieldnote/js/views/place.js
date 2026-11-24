import { h, icon, section, chips, fmtDate, outcomeBadge, toast, pct } from '../ui.js';
import { getPlace, putPlace, allVisits } from '../db.js';
import { state } from '../state.js';
import { labelOf } from '../catalog.js';
import { summary } from '../stats.js';
import { findPersonalInfo } from '../privacy.js';
import { OUTCOME_COLORS } from '../maplib.js';

export default async function place(id) {
  const p = await getPlace(id);
  if (!p) return { title: '장소 없음', back: '#/map', node: h('div.page', h('div.notice.bad', '이 장소를 찾을 수 없습니다.')) };
  const visits = (await allVisits()).filter((v) => v.placeId === id);
  const c = state.catalog;
  const s = summary(visits);
  const L = (dim, key) => labelOf(c, dim, key);

  // 장소 정보 편집
  const editMount = h('div');
  let editing = false;
  const drawEdit = () => {
    if (!editing) {
      editMount.replaceChildren(
        h('dl.kv', h('dt', '업종'), h('dd', L('industry', p.industry)), h('dt', '주소'), h('dd', p.address ?? '—')),
        h('button.link', { type: 'button', onclick: () => { editing = true; drawEdit(); } }, icon('edit', 16), ' 이름·업종 고치기'),
      );
      return;
    }
    const name = h('input.input', { type: 'text', value: p.name, maxLength: 40, 'aria-label': '장소 별칭' });
    const err = h('p.hint');
    let industry = p.industry;
    editMount.replaceChildren(
      h('div.field', h('div.field-label', '장소 별칭'), name, err),
      h('div.field', h('div.field-label', '업종'), chips(c.industry.filter((x) => !x.hidden), { value: industry, name: '업종', onChange: (k) => (industry = k) })),
      h(
        'div.btn-row',
        h('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: () => { editing = false; drawEdit(); } }, '취소'),
        h(
          'button.btn.btn-primary.btn-sm',
          {
            type: 'button',
            onclick: async () => {
              const hits = findPersonalInfo(name.value);
              if (hits.length) {
                err.className = 'hint bad';
                err.textContent = `개인정보로 보이는 내용(${[...new Set(hits.map((x) => x.label))].join(', ')})은 넣을 수 없습니다.`;
                return;
              }
              p.name = name.value.trim() || p.name;
              p.industry = industry;
              await putPlace(p);
              toast('장소 정보를 고쳤습니다');
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            },
          },
          '저장',
        ),
      ),
    );
  };
  drawEdit();

  const node = h(
    'div.page.page-narrow',
    section(
      p.name,
      h(
        'div.kpis',
        h('div.kpi', h('div.kpi-label', '방문'), h('div.kpi-value', s.n, h('small', '회'))),
        h('div.kpi', h('div.kpi-label', '신청'), h('div.kpi-value', s.applied, h('small', '건'))),
        h('div.kpi', h('div.kpi-label', '신청률'), h('div.kpi-value', pct(s.rate), s.rate == null ? null : h('small', '%'))),
      ),
      editMount,
    ),
    section(
      '방문 이력',
      { desc: '이 장소에서 어떤 반응이 있었고 어떻게 대처했는지 순서대로 봅니다.' },
      h(
        'ul.timeline',
        visits.map((v) =>
          h(
            'li',
            h('span.tl-dot', { style: { background: OUTCOME_COLORS[v.outcome] } }),
            h('a.tl-head', { href: `#/visit/${v.id}` }, h('span.tl-date', fmtDate(v.createdAt)), outcomeBadge(v.outcome, L('outcome', v.outcome))),
            h(
              'div.tl-body',
              h('p', [L('role', v.role), `첫 반응 ${L('reaction', v.reaction)}`, `${L('stage', v.stage)}까지`].filter((x) => !x.startsWith('—')).join(' · ')),
              (v.objections ?? []).map((o) => h('p', `${L('objection', o.type)} → ${L('technique', o.technique)} `, h(`span.tag.${o.overcome ? 'good' : 'bad'}`, o.overcome ? '넘김' : '못 넘김'))),
              v.memo ? h('p', { style: { color: 'var(--ink)' } }, `“${v.memo}”`) : null,
            ),
          ),
        ),
      ),
    ),
    h('a.btn.btn-primary.btn-block', { href: '#/record', style: { marginTop: '16px' } }, icon('plus', 18), '여기서 방문 기록'),
  );
  return { title: '장소', back: '#/map', node };
}
