import { h, icon, section, empty, fmtDate, fmtRelativeDay, outcomeBadge, pct, isoLocalDate } from '../ui.js';
import { allVisits, allPlaces, getKV } from '../db.js';
import { state } from '../state.js';
import { labelOf } from '../catalog.js';
import { summary, splitByPeriod } from '../stats.js';

const WD = ['일', '월', '화', '수', '목', '금', '토'];

export function visitRow(v, placesById, { showDate = true } = {}) {
  const c = state.catalog;
  const p = placesById.get(v.placeId);
  const objections = (v.objections ?? []).map((o) => labelOf(c, 'objection', o.type)).filter((x) => x !== '—');
  const sub = [
    showDate ? fmtDate(v.createdAt) : fmtDate(v.createdAt).split(' ').pop(),
    labelOf(c, 'industry', p?.industry ?? v.industry),
    objections.length ? objections.join('·') : labelOf(c, 'stage', v.stage),
  ].filter((x) => x && x !== '—');
  return h(
    'li.row',
    { onclick: () => (location.hash = `#/visit/${v.id}`), role: 'link', tabindex: '0', onkeydown: (e) => e.key === 'Enter' && (location.hash = `#/visit/${v.id}`) },
    h('div.row-main', h('div.row-title', p?.name ?? '장소 미지정'), h('div.row-sub', sub.join(' · '))),
    outcomeBadge(v.outcome, labelOf(c, 'outcome', v.outcome)),
  );
}

export default async function home() {
  const [visits, places, draft, lastBackupAt] = await Promise.all([allVisits(), allPlaces(), getKV('draft'), getKV('lastBackupAt')]);
  const placesById = new Map(places.map((p) => [p.id, p]));
  const now = new Date();
  const todayKey = isoLocalDate(now);
  const today = visits.filter((v) => isoLocalDate(v.createdAt) === todayKey);
  const t = summary(today);
  const month = summary(splitByPeriod(visits, 'month', now).current);

  const upcoming = visits
    .filter((v) => v.revisitDate && v.revisitDate >= todayKey)
    .sort((a, b) => (a.revisitDate < b.revisitDate ? -1 : 1))
    .slice(0, 5);

  const needsBackup =
    visits.filter((v) => !v.demo).length >= 5 &&
    (!lastBackupAt || now - new Date(lastBackupAt) > 7 * 86400000);

  const node = h(
    'div.page',
    h(
      'div.hello',
      h('p.hello-date', `${now.getMonth() + 1}월 ${now.getDate()}일 ${WD[now.getDay()]}요일`),
      h('h2', today.length ? `오늘 ${today.length}곳 다녀왔어요` : '오늘의 첫 방문을 기록해 보세요'),
    ),

    draft
      ? h(
          'a.notice.info',
          { href: '#/record' },
          icon('edit', 18),
          h('div.grow', h('strong', '작성 중인 기록이 있습니다'), h('div', `${fmtDate(draft.createdAt)} 시작 · 이어서 작성하기`)),
          icon('chevron', 18),
        )
      : h(
          'button.cta',
          { type: 'button', onclick: () => (location.hash = '#/record') },
          h('span.cta-plus', icon('plus', 22)),
          h('div', h('div.cta-title', '방문 기록 시작'), h('div.cta-sub', '위치·시간·날씨는 자동으로 들어갑니다')),
          icon('chevron', 20),
        ),

    needsBackup
      ? h(
          'div.notice',
          icon('alert', 18),
          h('div.grow', h('strong', '백업한 지 일주일이 넘었습니다. '), '기록은 이 기기에만 있어서, 폰을 바꾸거나 브라우저 데이터를 지우면 사라집니다.'),
          h('a.btn.btn-ghost.btn-sm', { href: '#/settings' }, '백업'),
        )
      : null,

    section(
      '오늘',
      h(
        'div.kpis',
        h('div.kpi', h('div.kpi-label', '방문'), h('div.kpi-value', t.n, h('small', '곳'))),
        h('div.kpi', h('div.kpi-label', '신청'), h('div.kpi-value', t.applied, h('small', '건'))),
        h('div.kpi', h('div.kpi-label', '재방문 약속'), h('div.kpi-value', t.revisit, h('small', '건'))),
      ),
    ),

    section(
      '이번 달',
      { action: h('a.link', { href: '#/report' }, '성적표 보기', icon('chevron', 16)) },
      h(
        'div.kpis',
        h('div.kpi', h('div.kpi-label', '방문'), h('div.kpi-value', month.n, h('small', '곳'))),
        h('div.kpi', h('div.kpi-label', '신청'), h('div.kpi-value', month.applied, h('small', '건'))),
        h('div.kpi', h('div.kpi-label', '신청률'), h('div.kpi-value', pct(month.rate), month.rate == null ? null : h('small', '%'))),
      ),
    ),

    upcoming.length
      ? section(
          '재방문 예정',
          h(
            'ul.list',
            upcoming.map((v) => {
              const p = placesById.get(v.placeId);
              return h(
                'li.row',
                { onclick: () => (location.hash = `#/visit/${v.id}`) },
                h('div.row-main', h('div.row-title', p?.name ?? '장소 미지정'), h('div.row-sub', `지난 방문 ${fmtDate(v.createdAt, { withTime: false })}`)),
                h('span.tag', fmtRelativeDay(v.revisitDate + 'T09:00:00')),
              );
            }),
          ),
        )
      : null,

    section(
      '최근 기록',
      { action: visits.length ? h('a.link', { href: '#/visits' }, '전체 보기', icon('chevron', 16)) : null },
      visits.length
        ? h('ul.list', visits.slice(0, 6).map((v) => visitRow(v, placesById)))
        : empty('아직 기록이 없습니다. 설정에서 데모 데이터를 넣어 성적표를 미리 볼 수도 있습니다.', h('a.btn.btn-ghost.btn-sm', { href: '#/settings' }, '데모 데이터 넣기')),
    ),
  );

  return { title: '현장노트', node, actions: [h('a.icon-btn', { href: '#/visits', 'aria-label': '전체 기록' }, icon('list', 22))] };
}
