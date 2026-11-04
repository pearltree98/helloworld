import { api, meta, ApiError } from '../api.js';
import { h, clear, fmtDate, labelOf, riskText, loading, errorBox, toast, field, sep } from '../ui.js';
import { t, tError } from '../i18n.js';
import { ticketCard } from './wall.js';

export async function caseView(root, { id }) {
  root.replaceChildren(loading());
  const [m, c] = await Promise.all([meta(), api.case(id).catch((e) => e)]);
  if (c instanceof Error) return root.replaceChildren(errorBox(c.status === 404 ? new Error(t('errors.case_not_found')) : c));

  const learnBtn = h('button', { class: 'btn btn-primary', type: 'button', disabled: c.learned }, c.learned ? t('detail.learned') : t('detail.learn'));
  const learnCount = h('span', { class: 'muted' }, countText(c.lesson_count));
  learnBtn.addEventListener('click', async () => {
    learnBtn.disabled = true;
    try {
      const r = await api.learn(c.id);
      learnBtn.textContent = t('detail.learned');
      learnCount.textContent = countText(r.lesson_count);
      toast(t('detail.learnToast'));
    } catch (e) { learnBtn.disabled = false; toast(e.message); }
  });
  const shareBtn = h('button', { class: 'btn', type: 'button', onclick: () => share(c) }, t('detail.share'));

  const ticketsWrap = h('div', { class: 'tickets' });
  const renderTickets = (tickets) => ticketsWrap.replaceChildren(
    ...(tickets.length ? tickets.map((tk) => ticketCard(tk, m, { onTaken: refresh, showCase: false })) : [h('p', { class: 'muted' }, t('detail.noTickets'))]),
  );
  async function refresh() {
    const fresh = await api.case(c.id);
    renderTickets(fresh.tickets);
    learnCount.textContent = countText(fresh.lesson_count);
    if (fresh.learned) { learnBtn.disabled = true; learnBtn.textContent = t('detail.learned'); }
  }
  renderTickets(c.tickets);

  clear(root).append(
    h('article', { class: 'article' },
      h('p', { class: 'muted' }, h('a', { href: '#/' }, t('detail.back'))),
      h('h1', { dir: 'auto' }, c.title),
      h('div', { class: 'meta' },
        labelOf(m.categories, c.category), sep(),
        labelOf(m.outcomes, c.outcome), sep(),
        riskText(c, m.risk_levels), sep(),
        t('detail.by', { name: c.author_name ?? 'Anonymous', date: fmtDate(c.created_at) }),
        c.location_text ? [sep(), c.location_text] : null,
      ),
      h('div', { class: 'actions' }, learnBtn, shareBtn, learnCount),
      sect(t('detail.situation'), c.situation),
      sect(t('detail.hazard'), c.hazard),
      sect(t('detail.exposure'), c.exposure),
      h('section', { class: 'section avoid' }, h('h2', {}, t('detail.avoidance')), h('p', { dir: 'auto' }, c.avoidance)),
      c.risky_habit ? sect(t('detail.habit'), c.risky_habit) : null,
      h('section', { class: 'section' },
        h('h2', {}, t('risk.panel')),
        h('table', { class: 'table' },
          h('tr', {}, h('th', {}, t('risk.severity')), h('td', {}, `${c.severity} / 5`)),
          h('tr', {}, h('th', {}, t('risk.likelihood')), h('td', {}, `${c.likelihood} / 5`)),
          h('tr', {}, h('th', {}, t('risk.score')), h('td', {}, `${c.risk_score} / 25 · ${labelOf(m.risk_levels, c.risk_level)}`)),
        ),
      ),
      c.source_url ? h('p', {}, h('a', { href: c.source_url, target: '_blank', rel: 'noopener noreferrer' }, t('detail.source'))) : null,
      h('section', { class: 'section' },
        h('h2', {}, t('detail.wall')),
        h('p', { class: 'muted' }, t('detail.wallLead')),
        ticketsWrap,
        ticketForm(c, m, refresh),
      ),
    ),
  );
}

const countText = (n) => (n === 0 ? t('detail.count.zero') : n === 1 ? t('detail.count.one') : t('detail.count.some', { n }));

const sect = (title, body) => h('section', { class: 'section' }, h('h2', {}, title), h('p', { dir: 'auto' }, body));

function ticketForm(c, m, onDone) {
  const msg = h('textarea', { id: 'f-message', placeholder: t('ticket.placeholder'), maxlength: m.limits.message, rows: 3 });
  const errMsg = h('p', { class: 'error' });
  const btn = h('button', { class: 'btn btn-primary', type: 'submit' }, t('ticket.pin'));
  return h('form', { class: 'form', onsubmit: async (e) => {
    e.preventDefault();
    errMsg.textContent = '';
    btn.disabled = true;
    try {
      await api.pinTicket(c.id, { message: msg.value });
      msg.value = '';
      toast(t('ticket.pinned'));
      await onDone();
    } catch (err) {
      errMsg.textContent = err instanceof ApiError && err.status === 400 ? tError(Object.values(err.errors)[0]) || err.message : err.message;
    } finally { btn.disabled = false; }
  } },
    field({ label: t('ticket.message'), name: 'message', control: msg }),
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
