import { h, fill, topbar, notice, downloadJSON } from '../ui/dom.js';
import { navigate } from '../nav.js';
import { loadBank, saveBank, seedBank, loadProgress, saveProgress } from '../core/store.js';
import { normalizeQuestion, exportBank, parseImport, mergeBanks, LIMITS } from '../core/bank.js';
import { getEntry } from '../core/leitner.js';
import { newId } from '../core/ids.js';
import { PERSONAS, getPersona } from '../data/personas.js';

export function bankScreen(route) {
  const [action, id] = route.params;
  if (action === 'new') return editScreen(null);
  if (action === 'edit') return editScreen(id);
  return listScreen();
}

// ---------- list ----------

function listScreen() {
  let bank = loadBank();
  const progress = loadProgress();
  const status = h('div', { class: 'stack' });
  const list = h('ul', { class: 'qlist' });
  const count = h('span', {});
  const search = h('input', { type: 'search', placeholder: '질문·태그 검색', 'aria-label': '질문 검색', oninput: renderList });
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: onFile });

  function renderList() {
    const term = search.value.trim();
    const shown = term ? bank.filter((q) => q.question.includes(term) || q.tags.some((t) => t.includes(term))) : bank;
    count.textContent = `${bank.length}문항`;
    fill(
      list,
      shown.length === 0 && h('li', { class: 'muted' }, term ? '검색 결과가 없습니다.' : '질문이 없습니다.'),
      shown.map((q) => {
        const entry = getEntry(progress, q.id);
        const persona = getPersona(q.persona);
        return h(
          'li',
          {},
          h(
            'a',
            { class: 'qitem', href: `#/bank/edit/${encodeURIComponent(q.id)}` },
            h('div', { class: 'qitem-title' }, q.question),
            h(
              'div',
              { class: 'qitem-meta' },
              q.needsCheck && h('span', { class: 'badge badge-check' }, '확인 필요'),
              h('span', { class: 'badge badge-box' }, `상자 ${entry.box}`),
              entry.retry && h('span', { class: 'badge' }, '다시 풀기'),
              h('span', { class: 'badge' }, persona ? persona.label : '랜덤 손님'),
              q.tags.map((t) => h('span', { class: 'badge' }, `#${t}`)),
            ),
          ),
        );
      }),
    );
  }

  function exportFile() {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    downloadJSON(`card-roleplay-questions-${stamp}.json`, exportBank(bank));
    fill(status, notice(`${bank.length}문항을 파일로 내보냈습니다.`, 'ok'));
  }

  async function onFile() {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    let parsed;
    try {
      parsed = parseImport(await file.text());
    } catch (err) {
      fill(status, notice(`가져오지 못했습니다: ${err.message}`, 'error'));
      return;
    }
    const { questions, skipped } = parsed;
    const apply = (next, label) => {
      bank = next;
      saveBank(bank);
      renderList();
      fill(status, notice(`${label}: 지금 ${bank.length}문항입니다.${skipped ? ` (질문이 비어 건너뛴 항목 ${skipped}개)` : ''}`, 'ok'));
    };
    fill(
      status,
      h(
        'div',
        { class: 'card stack' },
        h('p', {}, `파일에서 ${questions.length}문항을 읽었습니다. 어떻게 넣을까요?`),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn btn-primary', onclick: () => apply(mergeBanks(bank, questions), '합쳤습니다') }, '합치기'),
          h('button', { class: 'btn btn-danger', onclick: () => apply(questions, '바꿨습니다') }, '전부 바꾸기'),
          h('button', { class: 'btn', onclick: () => fill(status) }, '취소'),
        ),
        h('p', { class: 'muted small' }, '합치기: 같은 id는 파일 내용으로 고치고 새 문항은 추가합니다.'),
      ),
    );
  }

  function resetToSeed() {
    if (!window.confirm('질문 은행을 처음 10문항으로 되돌릴까요? 직접 추가·수정한 질문은 사라집니다.')) return;
    bank = seedBank();
    saveBank(bank);
    renderList();
    fill(status, notice('기본 질문으로 되돌렸습니다.', 'ok'));
  }

  renderList();

  const el = h(
    'main',
    { class: 'screen bank' },
    topbar('질문 은행', { right: count }),
    h('a', { class: 'btn btn-primary btn-block', href: '#/bank/new' }, '+ 새 질문'),
    search,
    status,
    list,
    h(
      'section',
      { class: 'card stack' },
      h('h2', {}, '파일로 옮기기'),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn', onclick: exportFile }, 'JSON 내보내기'),
        h('button', { class: 'btn', onclick: () => fileInput.click() }, 'JSON 가져오기'),
      ),
      fileInput,
      h('button', { class: 'btn btn-ghost', onclick: resetToSeed }, '기본 질문으로 되돌리기'),
      h('p', { class: 'muted small' }, '노란 "확인 필요" 표시가 있는 모범답안은 지점 교육 자료로 숫자·조건을 꼭 고치세요.'),
    ),
  );
  return { el, title: '질문 은행' };
}

// ---------- edit ----------

function editScreen(id) {
  const bank = loadBank();
  const existing = id ? bank.find((q) => q.id === id) : null;
  if (id && !existing) {
    return {
      el: h('main', { class: 'screen' }, topbar('질문 편집', { back: '#/bank', backLabel: '목록' }), notice('이 질문을 찾지 못했습니다.', 'error')),
      title: '질문 편집',
    };
  }
  const q = existing || { question: '', modelAnswer: '', needsCheck: false, persona: null, tags: [] };
  const status = h('div', { class: 'stack' });

  const question = h('textarea', { rows: 2, maxlength: LIMITS.question, value: q.question, placeholder: '예: 연회비 얼마예요?' });
  const modelAnswer = h('textarea', { rows: 5, maxlength: LIMITS.modelAnswer, value: q.modelAnswer, placeholder: '짧고 진실한 답. 모르는 숫자는 [확인 필요]로 남기세요.', oninput: hint });
  const needsCheck = h('input', { type: 'checkbox', checked: q.needsCheck });
  const persona = h(
    'select',
    {},
    h('option', { value: '', selected: !q.persona }, '랜덤 손님'),
    PERSONAS.map((p) => h('option', { value: p.id, selected: q.persona === p.id }, `${p.name} · ${p.label}`)),
  );
  const tags = h('input', { type: 'text', value: q.tags.join(', '), placeholder: '쉼표로 구분 (예: 조건, 연회비)' });
  const hintLine = h('small', {});

  function hint() {
    const hasMarker = /\[[^\]]*확인[^\]]*\]/.test(modelAnswer.value);
    hintLine.textContent = hasMarker && !needsCheck.checked ? '답에 [확인 필요]가 있습니다. "확인 필요"를 켜 두면 결과 화면에 노란 배지가 뜹니다.' : '';
  }
  needsCheck.addEventListener('change', hint);
  hint();

  function save() {
    const clean = normalizeQuestion(
      {
        id: existing?.id || newId('u-'),
        question: question.value,
        modelAnswer: modelAnswer.value,
        needsCheck: needsCheck.checked,
        persona: persona.value || null,
        tags: tags.value,
      },
      () => newId('u-'),
    );
    if (!clean) {
      fill(status, notice('질문을 입력하세요.', 'error'));
      question.focus();
      return;
    }
    const next = existing ? bank.map((x) => (x.id === existing.id ? clean : x)) : [...bank, clean];
    saveBank(next);
    navigate('bank');
  }

  function remove() {
    if (!window.confirm(`"${existing.question}" 질문을 지울까요?`)) return;
    saveBank(bank.filter((x) => x.id !== existing.id));
    const progress = loadProgress();
    delete progress[existing.id];
    saveProgress(progress);
    navigate('bank');
  }

  const field = (label, control, extra) => h('label', { class: 'field' }, h('span', {}, label), control, extra);

  const el = h(
    'main',
    { class: 'screen bank-edit' },
    topbar(existing ? '질문 수정' : '새 질문', { back: '#/bank', backLabel: '목록' }),
    field('손님 질문', question),
    field('모범답안 초안', modelAnswer, hintLine),
    h('label', { class: 'switch card' }, h('span', {}, '확인 필요 (지점 자료로 고칠 내용 있음)'), needsCheck),
    field('손님', persona, h('small', {}, '"랜덤 손님"이면 연습 때마다 세 명 중 한 명이 묻습니다.')),
    field('태그', tags),
    status,
    h(
      'div',
      { class: 'row' },
      h('button', { class: 'btn btn-primary', onclick: save }, '저장'),
      h('a', { class: 'btn', href: '#/bank' }, '취소'),
    ),
    existing && h('button', { class: 'btn btn-danger btn-block', onclick: remove }, '이 질문 지우기'),
  );
  return { el, title: existing ? '질문 수정' : '새 질문' };
}
