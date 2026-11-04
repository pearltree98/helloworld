import { api, meta, ApiError } from '../api.js';
import { h, clear, fmtDate, fmtKrw, labelOf, riskBadge, loading, errorBox, toast, field } from '../ui.js';
import { ticketCard } from './wall.js';

export async function caseView(root, { id }) {
  root.replaceChildren(loading());
  const [m, c] = await Promise.all([meta(), api.case(id).catch((e) => e)]);
  if (c instanceof Error) return root.replaceChildren(errorBox(c.status === 404 ? new Error('사례를 찾을 수 없습니다.') : c));

  const article = h('article', { class: 'article' },
    h('a', { class: 'back', href: '#/' }, '← 사례 목록'),
    h('div', { class: 'meta', style: 'margin-top:10px' },
      h('span', { class: 'tag' }, labelOf(m.categories, c.category)),
      h('span', { class: 'tag' }, labelOf(m.outcomes, c.outcome)),
      riskBadge(c),
    ),
    h('h1', {}, c.title),
    h('p', { class: 'back' }, `${c.author_name ?? '익명'} · ${fmtDate(c.created_at)}${c.location_text ? ` · ${c.location_text}` : ''}`),
    sect('무슨 일이 있었나', c.situation),
    sect('위해 요인 (Hazard) — 해의 원천', c.hazard),
    sect('노출 상태 (Exposure) — 나를 그 앞에 둔 상태', c.exposure),
    sect('피하는 행동 (Avoidance) — 내가 할 수 있는 것', c.avoidance, 'sect--avoid'),
    c.risky_habit ? sect('위험을 높이는 흔한 행위', c.risky_habit) : null,
    c.source_url ? h('p', { class: 'sect' }, h('a', { href: c.source_url, target: '_blank', rel: 'noopener noreferrer', class: 'back' }, '출처 보기 ↗')) : null,
  );

  const learnBtn = h('button', { class: 'btn btn--primary btn--block', type: 'button', disabled: c.learned }, c.learned ? '교훈을 받았습니다 ✓' : '이 교훈을 받습니다');
  const learnCount = h('div', { class: 'count' }, countText(c.lesson_count));
  learnBtn.addEventListener('click', async () => {
    learnBtn.disabled = true;
    try {
      const r = await api.learn(c.id);
      learnBtn.textContent = '교훈을 받았습니다 ✓';
      learnCount.textContent = countText(r.lesson_count);
      toast('기억하겠습니다. 아무 일도 없기를.');
    } catch (e) { learnBtn.disabled = false; toast(e.message); }
  });

  const shareBtn = h('button', { class: 'btn btn--block', type: 'button', onclick: () => share(c) }, '이 사례 공유하기');

  const pct = Math.round((c.risk_score / 25) * 100);
  const riskPanel = h('div', { class: 'panel' },
    h('h3', {}, '위험도'),
    h('dl', { class: 'matrix' },
      h('dt', {}, '심각도'), h('dd', {}, `${c.severity} / 5`),
      h('dt', {}, '가능성'), h('dd', {}, `${c.likelihood} / 5`),
      h('dt', {}, '점수'), h('dd', {}, `${c.risk_score} / 25 · ${c.risk_label}`),
    ),
    h('div', { class: 'bar' }, h('i', { class: `risk--${c.risk_level}`, style: `width:${pct}%` })),
  );

  const ticketsWrap = h('div', { class: 'tickets' });
  const renderTickets = (tickets) => ticketsWrap.replaceChildren(
    ...(tickets.length ? tickets.map((t) => ticketCard(t, { onTaken: refreshTickets, showCase: false })) : [h('p', { class: 'empty', style: 'padding:12px 0' }, '아직 티켓이 없습니다. 첫 티켓을 붙여주세요.')]),
  );
  async function refreshTickets() {
    const fresh = await api.case(c.id);
    renderTickets(fresh.tickets);
    learnCount.textContent = countText(fresh.lesson_count);
    if (fresh.learned) { learnBtn.disabled = true; learnBtn.textContent = '교훈을 받았습니다 ✓'; }
  }
  renderTickets(c.tickets);

  const ticketSection = h('section', { class: 'sect' },
    h('h2', {}, '티켓 벽'),
    h('p', { class: 'back', style: 'margin:0 0 12px' }, '이 교훈이 나를 지켰다면, 다음 사람을 위해 티켓 한 장을 벽에 붙여주세요. 티켓은 한 사람이 가져가면 사라집니다. 식당 벽의 식권처럼.'),
    ticketsWrap,
    ticketForm(c, refreshTickets),
  );

  clear(root).append(
    h('div', { class: 'detail' },
      h('div', {}, article, ticketSection),
      h('aside', { class: 'side' },
        h('div', { class: 'panel learn' }, learnBtn, learnCount, shareBtn),
        riskPanel,
        h('div', { class: 'panel' }, h('h3', {}, '한 줄로'), h('p', { style: 'margin:0;font-weight:600' }, c.avoidance)),
      ),
    ),
  );
}

const countText = (n) => (n ? `${n}명이 이 교훈을 받았습니다` : '아직 아무도 받지 않았습니다');

function sect(title, body, extra = '') {
  return h('section', { class: `sect ${extra}` }, h('h2', {}, title), h('p', {}, body));
}

function ticketForm(c, onDone) {
  const msg = h('textarea', { id: 'f-message', placeholder: '예) 초보 운전자에게. 1차선은 잠깐 빌려 쓰는 차로입니다.', maxlength: 300 });
  const pledge = h('input', { id: 'f-pledge_krw', type: 'number', min: 0, max: 1000000, step: 1000, placeholder: '0' });
  const errMsg = h('p', { class: 'err' });
  const btn = h('button', { class: 'btn btn--primary', type: 'submit' }, '티켓 붙이기');
  const form = h('form', { class: 'ticket-form', onsubmit: async (e) => {
    e.preventDefault();
    errMsg.textContent = '';
    btn.disabled = true;
    try {
      await api.pinTicket(c.id, { message: msg.value, pledge_krw: pledge.value || 0 });
      msg.value = ''; pledge.value = '';
      toast('티켓을 벽에 붙였습니다.');
      await onDone();
    } catch (err) {
      errMsg.textContent = err instanceof ApiError ? Object.values(err.errors)[0] ?? err.message : err.message;
    } finally { btn.disabled = false; }
  } },
    field({ label: '다음 사람에게 남길 한마디', name: 'message', control: msg }),
    field({ label: '안전 기금 약정 (선택)', name: 'pledge_krw', control: pledge,
      hint: '결제는 아직 받지 않습니다. 약정 합계는 공개되며, 반사띠·욕실 손잡이 같은 "피하는 도구"를 나누는 데 쓰일 예정입니다.' }),
    errMsg,
    btn,
  );
  return form;
}

async function share(c) {
  const url = `${location.origin}/#/case/${c.id}`;
  const text = `[미리봄] ${c.title}\n피하는 행동: ${c.avoidance}`;
  try {
    if (navigator.share) await navigator.share({ title: c.title, text, url });
    else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('링크를 복사했습니다.'); }
  } catch { /* 사용자가 취소 */ }
}

export { fmtKrw };
