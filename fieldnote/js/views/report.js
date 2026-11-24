// 성적표: 시험 성적표처럼 영역별 점수와 강점·약점을 보여 준다.
import { h, icon, section, scoreRow, empty, pct } from '../ui.js';
import { allVisits } from '../db.js';
import { state } from '../state.js';
import { labelOf, DIMENSION_TITLES } from '../catalog.js';
import { buildReport, MIN_SAMPLE, bestTechniqueFor } from '../stats.js';

let period = 'month';

const ENV_DESC = {
  industry: '어떤 업종에서 신청이 잘 나오는지',
  timeslot: '언제 방문하면 잘 되는지',
  weekday: '요일별 신청률',
  role: '누구를 만났을 때 잘 되는지',
  reaction: '첫 반응이 결과로 얼마나 이어지는지',
  pace: '상대가 바쁠 때와 여유 있을 때',
  crowd: '현장이 붐빌 때와 한산할 때',
  weather: '날씨별 신청률',
};

function scoreTable(rows, { base, dim, sortBy = 'order' } = {}) {
  const c = state.catalog;
  let list = rows;
  if (dim && c[dim]) {
    const order = new Map(c[dim].map((it, i) => [it.key, i]));
    list = [...rows].sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99));
  }
  if (sortBy === 'rate') list = [...rows].sort((a, b) => (b.n >= MIN_SAMPLE) - (a.n >= MIN_SAMPLE) || b.rate - a.rate);
  return h(
    'div.score-table',
    list.map((r) =>
      scoreRow({
        label: r.label ?? labelOf(c, dim, r.key),
        rate: r.rate,
        n: r.n,
        k: r.k,
        base,
        pending: r.n < MIN_SAMPLE,
        note: r.note,
      }),
    ),
  );
}

function legend(withBase) {
  return h(
    'div.legend-line',
    h('span', h('i.legend-swatch'), '점수(100점 만점)'),
    h('span', h('i.legend-swatch.pending'), `${MIN_SAMPLE}건 미만 · 판단 보류`),
    withBase ? h('span', h('i.legend-tick'), '전체 평균') : null,
    h('span', '오른쪽 숫자 = 성공/건수'),
  );
}

function swColumn(kind, items) {
  const good = kind === 'good';
  return h(
    `div.sw-col.${kind}`,
    h('h3', good ? '강점' : '약점', h('span.muted', { style: { fontWeight: 500 } }, ' · 같은 묶음 평균과 비교')),
    items.length
      ? items.map((it) =>
          h(
            'div.sw-item',
            h(
              'div.sw-top',
              h('div', h('div.sw-dim', it.dimTitle), h('div.sw-name', it.label)),
              h(`span.tag.${it.confident ? (good ? 'good' : 'bad') : ''}`, it.confident ? '뚜렷함' : '경향'),
            ),
            h(
              'p.sw-meta',
              `${it.metric} `,
              h('b', `${pct(it.rate)}%`),
              ` (${it.k}/${it.n}건) · 평균 ${pct(it.base)}% 대비 `,
              h('b', `${it.delta > 0 ? '+' : '−'}${Math.round(Math.abs(it.delta) * 100)}%p`),
            ),
          ),
        )
      : h('div.sw-empty', `아직 ${good ? '강점' : '약점'}으로 볼 만한 항목이 없습니다.`),
  );
}

export default async function report() {
  const visits = await allVisits();
  const c = state.catalog;
  const mount = h('div');

  const periodSwitch = h('div.period', { role: 'tablist', 'aria-label': '기간' });
  const drawSwitch = () =>
    periodSwitch.replaceChildren(
      ...[
        ['week', '이번 주'],
        ['month', '이번 달'],
        ['all', '전체'],
      ].map(([k, label]) =>
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(period === k), class: period === k ? 'on' : '', onclick: () => { period = k; drawSwitch(); render(); } }, label),
      ),
    );
  drawSwitch();

  function render() {
    const r = buildReport(visits, c, period);
    const s = r.summary;
    if (!s.n) {
      mount.replaceChildren(
        h('section.section', empty(`${r.range.label}에는 기록이 없습니다.`, visits.length ? null : h('a.btn.btn-ghost.btn-sm', { href: '#/settings' }, '데모 데이터로 미리 보기'))),
      );
      return;
    }

    let deltaEl = null;
    if (r.change != null) {
      const d = Math.round(r.change * 100);
      deltaEl = h(`p.delta.${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}`, d === 0 ? `${r.range.prevLabel}와 같음` : `${r.range.prevLabel}보다 ${d > 0 ? '▲' : '▼'} ${Math.abs(d)}%p`);
    } else if (r.range.prevLabel) {
      deltaEl = h('p.delta.flat', `${r.range.prevLabel} 기록 없음`);
    }

    const head = h(
      'section.section',
      h(
        'div.headline',
        h(
          'div',
          h('p.headline-label', `${r.range.label} 신청률`),
          h('p.headline-value', pct(s.rate), h('small', '%')),
          deltaEl,
        ),
        h(
          'div.headline-facts',
          h('div', h('b', s.n), '방문'),
          h('div', h('b', s.applied), '신청'),
          h('div', h('b', s.revisit), '재방문 약속'),
        ),
      ),
    );

    const comments = section('이번 기간 요약', h('ul.comment-list', r.comments.map((t) => h('li', t))));

    const sw = section(
      '강점과 약점',
      { desc: `업종·시간대 같은 환경과, 거절 사유·대처 기법 가운데 평균과 가장 차이 나는 항목입니다. ${MIN_SAMPLE}건 미만인 ${r.sw.pendingCount}개 항목은 판단을 보류했습니다.` },
      h('div.sw', swColumn('good', r.sw.strengths), swColumn('bad', r.sw.weaknesses)),
    );

    const funnel = section(
      '영업 단계 점수',
      { desc: '그 단계까지 간 방문 중 다음 단계로 넘어간 비율. 클로징은 신청으로 이어진 비율입니다.' },
      scoreTable(r.funnel.map((f) => ({ ...f, label: f.label }))),
      legend(false),
    );

    const objBase = (() => {
      const n = r.objections.reduce((a, x) => a + x.n, 0);
      return n ? r.objections.reduce((a, x) => a + x.k, 0) / n : null;
    })();

    const pairs = r.objections
      .filter((o) => o.n >= 3)
      .map((o) => ({ o, best: bestTechniqueFor(r.matrix, o.key) }))
      .filter((x) => x.best);

    const objection = section(
      '이의 처리 점수',
      { desc: '거절 사유별로 그 거절을 넘긴 비율입니다.' },
      r.objections.length ? scoreTable(r.objections, { base: objBase, dim: 'objection', sortBy: 'rate' }) : h('p.small.muted', '거절 사유 기록이 없습니다.'),
      r.techniques.length ? h('h3.subhead', '대처 기법별 점수') : null,
      r.techniques.length ? scoreTable(r.techniques, { base: objBase, dim: 'technique', sortBy: 'rate' }) : null,
      r.objections.length ? legend(true) : null,
    );

    const pairSection = !pairs.length
      ? null
      : section(
          '이 거절에는 이 대처가 통했다',
          { desc: '거절 사유별로 3번 이상 써 본 대처 중 가장 믿을 만하게 통한 것입니다.' },
          h(
            'table.pair-table',
            h('thead', h('tr', h('th', '거절 사유'), h('th', '가장 잘 통한 대처'), h('th.r', '넘김'))),
            h(
              'tbody',
              pairs.map(({ o, best }) =>
                h('tr', h('td', labelOf(c, 'objection', o.key)), h('td', labelOf(c, 'technique', best.technique)), h('td.r', `${best.k}/${best.n}`)),
              ),
            ),
          ),
        );

    const envSections = Object.entries(r.env)
      .filter(([, rows]) => rows.length)
      .map(([dim, rows]) => section(`${DIMENSION_TITLES[dim]}별 신청률`, { desc: ENV_DESC[dim] }, scoreTable(rows, { base: s.rate, dim })));

    mount.replaceChildren(
      head,
      comments,
      sw,
      h('div.grid-2', h('div', funnel, pairSection), objection),
      h('h2.day-head', { style: { fontSize: '15px', color: 'var(--ink)', padding: '24px 4px 0' } }, '환경별 점수'),
      h('p.small.muted', { style: { padding: '2px 4px 0' } }, '세로선은 이 기간 전체 신청률입니다. 선보다 길면 평균보다 잘 된 환경입니다.'),
      h('div.grid-2', h('div', envSections.filter((_, i) => i % 2 === 0)), h('div', envSections.filter((_, i) => i % 2 === 1))),
    );
  }
  render();

  const node = h('div.page', h('div', { style: { margin: '4px 0 0' } }, periodSwitch), mount);
  return { title: '성적표', node, actions: [h('a.icon-btn', { href: '#/visits', 'aria-label': '전체 기록' }, icon('list', 22))] };
}

