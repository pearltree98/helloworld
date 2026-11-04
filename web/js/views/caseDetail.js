import { api, meta, ApiError } from '../api.js';
import { h, clear, fmtDate, labelOf, riskBadge, loading, errorBox, toast, field } from '../ui.js';
import { t, tError } from '../i18n.js';
import { ticketCard } from './wall.js';

export async function caseView(root, { id }) {
  root.replaceChildren(loading());
  const [m, c] = await Promise.all([meta(), api.case(id).catch((e) => e)]);
  if (c instanceof Error) return root.replaceChildren(errorBox(c.status === 404 ? new Error(t('errors.case_not_found')) : c));

  const article = h('article', { class: 'article' },
    h('a', { class: 'back', href: '#/' }, t('detail.back')),
    h('div', { class: 'meta', style: 'margin-top:10px' },
      h('span', { class: 'tag' }, labelOf(m.categories, c.category)),
      h('span', { class: 'tag' }, labelOf(m.outcomes, c.outcome)),
      riskBadge(c, m.risk_levels),
    ),
    h('h1', {}, c.title),
    h('p', { class: 'back' }, `${t('detail.by', { name: c.author_name ?? 'Anonymous', date: fmtDate(c.created_at) })}${c.location_text ? ` · ${c.location_text}` : ''}`),
    sect(t('detail.situation'), c.situation),
    sect(t('detail.hazard'), c.hazard),
    sect(t('detail.exposure'), c.exposure),
    sect(t('detail.avoidance'), c.avoidance, 'sect--avoid'),
    c.risky_habit ? sect(t('detail.habit'), c.risky_habit) : null,
    c.source_url ? h('p', { class: 'sect' }, h('a', { href: c.source_url, target: '_blank', rel: 'noopener noreferrer', class: 'back' }, t('detail.source'))) : null,
  );

  const learnBtn = h('button', { class: 'btn btn--primary btn--block', type: 'button', disabled: c.learned }, c.learned ? t('detail.learned') : t('detail.learn'));
  const learnCount = h('div', { class: 'count' }, countText(c.lesson_count));
  learnBtn.addEventListener('click', async () => {
    learnBtn.disabled = true;
    try {
      const r = await api.learn(c.id);
      learnBtn.textContent = t('detail.learned');
      learnCount.textContent = countText(r.lesson_count);
      toast(t('detail.learnToast'));
    } catch (e) { learnBtn.disabled = false; toast(e.message); }
  });

  const shareBtn = h('button', { class: 'btn btn--block', type: 'button', onclick: () => share(c) }, t('detail.share'));

  const pct = Math.round((c.risk_score / 25) * 100);
  const riskPanel = h('div', { class: 'panel' },
    h('h3', {}, t('risk.panel')),
    h('dl', { class: 'matrix' },
      h('dt', {}, t('risk.severity')), h('dd', {}, `${c.severity} / 5`),
      h('dt', {}, t('risk.likelihood')), h('dd', {}, `${c.likelihood} / 5`),
      h('dt', {}, t('risk.score')), h('dd', {}, `${c.risk_score} / 25 · ${labelOf(m.risk_levels, c.risk_level)}`),
    ),
    h('div', { class: 'bar' }, h('i', { class: `risk--${c.risk_level}`, style: `width:${pct}%` })),
  );

  const ticketsWrap = h('div', { class: 'tickets' });
  const renderTickets = (tickets) => ticketsWrap.replaceChildren(
    ...(tickets.length ? tickets.map((tk) => ticketCard(tk, m, { onTaken: refreshTickets, showCase: false })) : [h('p', { class: 'empty', style: 'padding:12px 0' }, t('detail.noTickets'))]),
  );
  async function refreshTickets() {
    const fresh = await api.case(c.id);
    renderTickets(fresh.tickets);
    learnCount.textContent = countText(fresh.lesson_count);
    if (fresh.learned) { learnBtn.disabled = true; learnBtn.textContent = t('detail.learned'); }
  }
  renderTickets(c.tickets);

  const ticketSection = h('section', { class: 'sect' },
    h('h2', {}, t('detail.wall')),
    h('p', { class: 'back', style: 'margin:0 0 12px' }, t('detail.wallLead')),
    ticketsWrap,
    ticketForm(c, m, refreshTickets),
  );

  clear(root).append(
    h('div', { class: 'detail' },
      h('div', {}, article, ticketSection),
      h('aside', { class: 'side' },
        h('div', { class: 'panel learn' }, learnBtn, learnCount, shareBtn),
        riskPanel,
        h('div', { class: 'panel' }, h('h3', {}, t('detail.oneLine')), h('p', { style: 'margin:0;font-weight:600' }, c.avoidance)),
      ),
    ),
  );
}

const countText = (n) => (n === 0 ? t('detail.count.zero') : n === 1 ? t('detail.count.one') : t('detail.count.some', { n }));

function sect(title, body, extra = '') {
  return h('section', { class: `sect ${extra}` }, h('h2', {}, title), h('p', {}, body));
}

function ticketForm(c, m, onDone) {
  const msg = h('textarea', { id: 'f-message', placeholder: t('ticket.placeholder'), maxlength: m.limits.message });
  const pledge = h('input', { id: 'f-pledge_amount', type: 'number', min: 0, max: m.limits.pledge_max, step: 1, placeholder: '0' });
  const errMsg = h('p', { class: 'err' });
  const btn = h('button', { class: 'btn btn--primary', type: 'submit' }, t('ticket.pin'));
  return h('form', { class: 'ticket-form', onsubmit: async (e) => {
    e.preventDefault();
    errMsg.textContent = '';
    btn.disabled = true;
    try {
      await api.pinTicket(c.id, { message: msg.value, pledge_amount: pledge.value || 0 });
      msg.value = ''; pledge.value = '';
      toast(t('ticket.pinned'));
      await onDone();
    } catch (err) {
      errMsg.textContent = err instanceof ApiError && err.status === 400 ? tError(Object.values(err.errors)[0]) || err.message : err.message;
    } finally { btn.disabled = false; }
  } },
    field({ label: t('ticket.message'), name: 'message', control: msg }),
    field({ label: `${t('ticket.pledge')} · ${m.currency}`, name: 'pledge_amount', control: pledge, hint: t('ticket.pledgeHint') }),
    errMsg,
    btn,
  );
}

async function share(c) {
  const url = `${location.origin}/#/case/${c.id}`;
  const text = `[Stepback] ${c.title}\n${c.avoidance}`;
  try {
    if (navigator.share) await navigator.share({ title: c.title, text, url });
    else { await navigator.clipboard.writeText(`${text}\n${url}`); toast(t('detail.shareCopied')); }
  } catch { /* user cancelled */ }
}
