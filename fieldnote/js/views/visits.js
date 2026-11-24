import { h, chips, empty, fmtDate } from '../ui.js';
import { allVisits, allPlaces } from '../db.js';
import { OUTCOMES } from '../catalog.js';
import { visitRow } from './home.js';
import { isoLocalDate } from '../ui.js';

export default async function visits() {
  const [list, places] = await Promise.all([allVisits(), allPlaces()]);
  const byId = new Map(places.map((p) => [p.id, p]));
  let filter = null;
  const mount = h('div');

  const render = () => {
    const rows = filter ? list.filter((v) => v.outcome === filter) : list;
    if (!rows.length) {
      mount.replaceChildren(h('section.section', empty(list.length ? '이 결과의 기록이 없습니다.' : '아직 기록이 없습니다.')));
      return;
    }
    const groups = new Map();
    for (const v of rows) {
      const k = isoLocalDate(v.createdAt);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(v);
    }
    mount.replaceChildren(
      ...[...groups.entries()].map(([, vs]) =>
        h(
          'div',
          h('h3.day-head', `${fmtDate(vs[0].createdAt, { withTime: false })} · ${vs.length}곳`),
          h('section.section', { style: { marginTop: 0, padding: '4px 20px' } }, h('ul.list', vs.map((v) => visitRow(v, byId, { showDate: false })))),
        ),
      ),
    );
  };
  render();

  const node = h(
    'div.page',
    h(
      'div',
      { style: { marginTop: '4px' } },
      chips(OUTCOMES, {
        value: null,
        name: '결과로 거르기',
        onChange: (k) => {
          filter = k;
          render();
        },
      }),
    ),
    h('p.small.muted', { style: { margin: '10px 4px 0' } }, `전체 ${list.length}건`),
    mount,
  );
  return { title: '전체 기록', back: '#/', node };
}
