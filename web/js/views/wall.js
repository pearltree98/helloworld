import { api, meta } from '../api.js';
import { h, clear, fmtDate, fmtMoney, fmtNum, labelOf, loading, errorBox, toast } from '../ui.js';
import { visitorId } from '../identity.js';
import { t } from '../i18n.js';

export async function wallView(root) {
  root.replaceChildren(loading());
  const [m, wall, taken, stats] = await Promise.all([meta(), api.tickets('wall'), api.tickets('taken'), api.stats()]).catch((e) => [e]);
  if (m instanceof Error) return root.replaceChildren(errorBox(m));

  const grid = h('div', { class: 'tickets' });
  const render = (items) => grid.replaceChildren(
    ...(items.length ? items.map((tk) => ticketCard(tk, m, { onTaken: reload })) : [h('p', { class: 'muted' }, t('wall.empty'))]),
  );
  async function reload() {
    const { items } = await api.tickets('wall');
    render(items);
  }
  render(wall.items);

  clear(root).append(
    h('h1', {}, t('wall.h1')),
    h('p', { class: 'lead' }, t('wall.lead')),
    h('p', { class: 'muted' }, t('wall.stats', {
      wall: fmtNum(stats.tickets_on_wall), taken: fmtNum(stats.tickets_taken),
      pledged: fmtMoney(stats.pledged_amount, m.currency), lessons: fmtNum(stats.lessons),
    })),
    grid,
    h('h2', { class: 'section-title' }, t('wall.recent')),
    h('div', { class: 'tickets' },
      ...(taken.items.length ? taken.items.slice(0, 12).map((tk) => ticketCard(tk, m)) : [h('p', { class: 'muted' }, t('wall.none'))]),
    ),
  );
}

/** Ticket box, shared by the wall and the case page. */
export function ticketCard(tk, m, { onTaken, showCase = true } = {}) {
  const mine = tk.giver_id === visitorId();
  const takeBtn = !tk.taker_id && onTaken
    ? h('button', { class: 'btn btn-sm', type: 'button', disabled: mine, title: mine ? t('ticket.mineTitle') : '', onclick: async (e) => {
      e.preventDefault();
      takeBtn.disabled = true;
      try {
        await api.takeTicket(tk.id);
        toast(t('ticket.taken', { name: tk.giver_name }));
        await onTaken();
      } catch (err) { toast(err.message); takeBtn.disabled = false; }
    } }, mine ? t('ticket.mine') : t('ticket.take'))
    : null;

  return h('div', { class: `ticket${tk.taker_id ? ' taken' : ''}` },
    showCase ? h('a', { class: 'ticket-case', href: `#/case/${tk.case_id}` }, `${labelOf(m.categories, tk.case_category)} · `, h('span', { dir: 'auto' }, tk.case_title)) : null,
    h('p', { class: 'ticket-msg', dir: 'auto' }, tk.message),
    h('div', { class: 'meta' },
      `${tk.giver_name} · ${fmtDate(tk.created_at)}`,
      tk.pledge_amount ? ` · ${t('ticket.pledged', { amount: fmtMoney(tk.pledge_amount, m.currency) })}` : null,
    ),
    tk.taker_id ? h('div', { class: 'meta' }, t('ticket.takenBy', { name: tk.taker_name, date: fmtDate(tk.taken_at) })) : takeBtn,
  );
}
