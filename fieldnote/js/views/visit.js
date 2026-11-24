import { h, icon, section, fmtDate, outcomeBadge, confirmSheet, toast } from '../ui.js';
import { getVisit, getPlace, deleteVisit, prunePlaces } from '../db.js';
import { state } from '../state.js';
import { STAGES, labelOf } from '../catalog.js';
import { formatCoord } from '../geo.js';

export default async function visit(id) {
  const v = await getVisit(id);
  if (!v) return { title: '기록 없음', back: '#/visits', node: h('div.page', h('div.notice.bad', '이 기록을 찾을 수 없습니다.')) };
  const p = v.placeId ? await getPlace(v.placeId) : null;
  const c = state.catalog;
  const L = (dim, key) => labelOf(c, dim, key);
  const idx = Math.max(0, STAGES.findIndex((s) => s.key === v.stage));

  const remove = async () => {
    const ok = await confirmSheet({ title: '이 기록을 삭제할까요?', body: '삭제하면 성적표에서도 빠지고 되돌릴 수 없습니다.', ok: '삭제', danger: true });
    if (!ok) return;
    await deleteVisit(v.id);
    await prunePlaces();
    toast('삭제했습니다');
    location.hash = '#/visits';
  };

  const node = h(
    'div.page.page-narrow',
    section(
      p?.name ?? '장소 미지정',
      { action: outcomeBadge(v.outcome, L('outcome', v.outcome)) },
      h(
        'dl.kv',
        h('dt', '방문 시각'), h('dd', fmtDate(v.createdAt, { withYear: true })),
        h('dt', '업종'), h('dd', L('industry', v.industry)),
        h('dt', '주소'), h('dd', v.address ?? (v.lat != null ? formatCoord(v) : '—')),
        h('dt', '날씨'), h('dd', v.weather ? `${L('weather', v.weather)}${v.temp != null ? ` ${v.temp}°` : ''}` : '—'),
        v.product ? [h('dt', '신청 상품'), h('dd', v.product)] : null,
        v.revisitDate ? [h('dt', '재방문'), h('dd', fmtDate(`${v.revisitDate}T09:00:00`, { withTime: false }))] : null,
      ),
      p ? h('a.link', { href: `#/place/${p.id}` }, '이 장소의 방문 이력', icon('chevron', 16)) : null,
    ),
    section(
      '현장 상황',
      h(
        'dl.kv',
        h('dt', '만난 사람'), h('dd', L('role', v.role)),
        h('dt', '첫 반응'), h('dd', L('reaction', v.reaction)),
        h('dt', '상대의 여유'), h('dd', L('pace', v.pace)),
        h('dt', '혼잡도'), h('dd', L('crowd', v.crowd)),
      ),
    ),
    section(
      '진행',
      h(
        'div.stepper',
        STAGES.map((s, i) => h('div.step', { class: `${i <= idx ? 'on' : ''} ${i === idx ? 'current' : ''}`, style: { cursor: 'default' } }, s.label)),
      ),
      v.objections?.length
        ? h(
            'table.pair-table',
            h('thead', h('tr', h('th', '거절 사유'), h('th', '내 대처'), h('th.r', '결과'))),
            h(
              'tbody',
              v.objections.map((o) =>
                h('tr', h('td', L('objection', o.type)), h('td', L('technique', o.technique)), h('td.r', h(`span.tag.${o.overcome ? 'good' : 'bad'}`, o.overcome ? '넘김' : '못 넘김'))),
              ),
            ),
          )
        : h('p.small.muted', '거절 사유 기록 없음'),
    ),
    v.memo ? section('메모', h('p.memo', v.memo)) : null,
    h(
      'div.btn-row',
      { style: { marginTop: '16px' } },
      h('a.btn.btn-ghost', { href: `#/record/${v.id}`, style: { flex: 1 } }, icon('edit', 18), '수정'),
      h('button.btn.btn-ghost', { type: 'button', onclick: remove, style: { flex: 1, color: 'var(--bad-text)' } }, icon('trash', 18), '삭제'),
    ),
  );
  return { title: '방문 기록', back: '#/visits', node };
}
