import { api, meta } from '../api.js';
import { h, clear, fmtDate, fmtKrw, labelOf, loading, errorBox, toast } from '../ui.js';
import { visitorId } from '../identity.js';

export async function wallView(root) {
  root.replaceChildren(loading());
  const [m, wall, taken, stats] = await Promise.all([meta(), api.tickets('wall'), api.tickets('taken'), api.stats()]).catch((e) => [e]);
  if (m instanceof Error) return root.replaceChildren(errorBox(m));

  const grid = h('section', { class: 'tickets' });
  const render = (items) => grid.replaceChildren(
    ...(items.length ? items.map((t) => ticketCard(t, { categories: m.categories, onTaken: reload })) : [h('p', { class: 'empty' }, '벽이 비어 있습니다. 사례를 읽고 첫 티켓을 붙여주세요.')]),
  );
  async function reload() {
    const { items } = await api.tickets('wall');
    render(items);
  }
  render(wall.items);

  clear(root).append(
    h('section', { class: 'hero' },
      h('h1', {}, '티켓 벽'),
      h('p', {}, '누군가 "이 교훈이 나를 지켰다"며 붙여 둔 티켓입니다. 한 장을 가져가면 그 교훈을 받은 것으로 기록되고, 티켓은 벽에서 사라집니다. 가져간 사람은 다시 다른 사례에 티켓을 붙일 수 있습니다.'),
    ),
    h('section', { class: 'stats' },
      stat(stats.tickets_on_wall, '벽에 붙은 티켓'),
      stat(stats.tickets_taken, '건네진 티켓'),
      stat(fmtKrw(stats.pledged_krw), '약정된 안전 기금'),
      stat(stats.lessons, '받은 교훈'),
    ),
    grid,
    h('h2', { style: 'margin-top:36px;font-size:18px' }, '최근에 건네진 티켓'),
    h('section', { class: 'tickets' },
      ...(taken.items.length ? taken.items.slice(0, 12).map((t) => ticketCard(t, { categories: m.categories })) : [h('p', { class: 'empty' }, '아직 없습니다.')]),
    ),
  );
}

const stat = (n, label) => h('div', { class: 'stat' }, h('b', {}, typeof n === 'number' ? n.toLocaleString('ko-KR') : n), h('span', {}, label));

/** 티켓 카드. 사례 상세와 벽 양쪽에서 쓴다. */
export function ticketCard(t, { categories, onTaken, showCase = true } = {}) {
  const mine = t.giver_id === visitorId();
  const takeBtn = !t.taker_id && onTaken
    ? h('button', { class: 'btn btn--sm', type: 'button', disabled: mine, title: mine ? '내가 붙인 티켓은 가져갈 수 없습니다' : '', onclick: async (e) => {
      e.preventDefault();
      takeBtn.disabled = true;
      try {
        await api.takeTicket(t.id);
        toast(`티켓을 받았습니다. ${t.giver_name}님의 한마디를 기억해주세요.`);
        await onTaken();
      } catch (err) { toast(err.message); takeBtn.disabled = false; }
    } }, mine ? '내가 붙인 티켓' : '이 티켓 받기')
    : null;

  return h('div', { class: `ticket${t.taker_id ? ' taken' : ''}` },
    showCase ? h('a', { class: 'case', href: `#/case/${t.case_id}` }, `${categories ? `${labelOf(categories, t.case_category)} · ` : ''}${t.case_title}`) : null,
    h('p', { class: 'msg' }, `“${t.message}”`),
    h('div', { class: 'from' }, `${t.giver_name} · ${fmtDate(t.created_at)}`),
    t.pledge_krw ? h('div', { class: 'pledge' }, `안전 기금 약정 ${fmtKrw(t.pledge_krw)}`) : null,
    t.taker_id ? h('div', { class: 'from' }, `→ ${t.taker_name}님이 가져감 (${fmtDate(t.taken_at)})`) : takeBtn,
  );
}
