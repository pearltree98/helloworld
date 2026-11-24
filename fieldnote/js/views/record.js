// 방문 기록(새로 쓰기·고치기). 현장에서 20초 안에 끝나도록 칩 위주로 구성한다.
import { h, icon, chips, section, toast, confirmSheet, fmtDate } from '../ui.js';
import { allPlaces, getVisit, getPlace, putVisit, putPlace, getKV, setKV, delKV, uid, prunePlaces } from '../db.js';
import { state } from '../state.js';
import { STAGES, OUTCOMES, labelOf } from '../catalog.js';
import { getPosition, reverseGeocode, nearbyPlaces, formatCoord } from '../geo.js';
import { currentWeather } from '../weather.js';
import { findPersonalInfo, maskPersonalInfo } from '../privacy.js';
import { loadLeaflet, baseMap, mineIcon } from '../maplib.js';

const visible = (list) => list.filter((it) => !it.hidden);

function blankDraft() {
  return {
    id: uid('v'),
    createdAt: new Date().toISOString(),
    lat: null,
    lng: null,
    accuracy: null,
    address: null,
    placeId: null,
    newPlaceName: '',
    industry: null,
    role: null,
    crowd: null,
    pace: null,
    reaction: null,
    weather: null,
    temp: null,
    stage: 'approach',
    objections: [],
    outcome: null,
    product: '',
    revisitDate: '',
    memo: '',
  };
}

function toLocalInput(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 개인정보 검사가 붙은 입력란 */
function guardedField({ multiline = false, value, placeholder, onInput, maxLength = 500, label }) {
  const input = multiline
    ? h('textarea.textarea', { placeholder, maxLength, value: value ?? '', 'aria-label': label })
    : h('input.input', { type: 'text', placeholder, maxLength, value: value ?? '', 'aria-label': label, autocomplete: 'off' });
  const msg = h('div');
  const check = () => {
    const hits = findPersonalInfo(input.value);
    input.classList.toggle('invalid', hits.length > 0);
    if (!hits.length) {
      msg.replaceChildren();
      return hits;
    }
    const labels = [...new Set(hits.map((x) => x.label))].join(', ');
    const preview = h('div.pii-preview');
    let pos = 0;
    for (const x of hits) {
      preview.append(input.value.slice(pos, x.start), h('mark', x.text));
      pos = x.end;
    }
    preview.append(input.value.slice(pos));
    msg.replaceChildren(
      h('p.hint.bad', `고객 개인정보로 보이는 내용(${labels})이 있어 저장할 수 없습니다.`),
      preview,
      h(
        'div.btn-row',
        { style: { marginTop: '8px' } },
        h(
          'button.btn.btn-ghost.btn-sm',
          {
            type: 'button',
            onclick: () => {
              input.value = maskPersonalInfo(input.value);
              onInput(input.value);
              check();
            },
          },
          '해당 부분 가리기',
        ),
      ),
    );
    return hits;
  };
  input.addEventListener('input', () => {
    onInput(input.value);
    check();
  });
  queueMicrotask(check);
  return { el: h('div', input, msg), check, input };
}

export default async function record(id) {
  const editing = Boolean(id);
  let v;
  if (editing) {
    const saved = await getVisit(id);
    if (!saved) return { title: '기록 없음', back: '#/', node: h('div.page', h('div.notice.bad', '이 기록을 찾을 수 없습니다.')) };
    v = { ...blankDraft(), ...saved, newPlaceName: '' };
  } else {
    v = (await getKV('draft')) ?? blankDraft();
  }
  const resumed = !editing && Boolean(await getKV('draft'));
  const places = (await allPlaces()).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ko'));
  const c = state.catalog;

  let saveTimer;
  const persistDraft = () => {
    if (editing) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => setKV('draft', v).catch(() => {}), 300);
  };
  const set = (patch) => {
    Object.assign(v, patch);
    persistDraft();
    updateSaveState();
  };

  // ── 위치 ──
  const locTitle = h('div.loc-title');
  const locSub = h('div.loc-sub');
  const mapEl = h('div.minimap', { 'aria-label': '방문 위치 지도. 핀을 끌어 위치를 고칠 수 있습니다.' });
  const weatherFact = h('span');
  let map;
  let marker;

  const renderLoc = (status) => {
    if (status === 'loading') {
      locTitle.textContent = '현재 위치를 찾는 중…';
      locSub.textContent = '실내에서는 몇 초 걸릴 수 있습니다';
      return;
    }
    if (status instanceof Error) {
      locTitle.textContent = '위치 없이 기록합니다';
      locSub.textContent = status.message;
      return;
    }
    if (v.lat == null) {
      locTitle.textContent = '위치 정보 없음';
      locSub.textContent = '‘다시 찾기’를 눌러 현재 위치를 넣을 수 있습니다';
      return;
    }
    locTitle.textContent = v.address ?? '주소 확인 중…';
    locSub.textContent = `${v.accuracy ? `오차 약 ${v.accuracy}m · ` : ''}${formatCoord(v)}`;
  };

  const renderWeather = () => {
    weatherFact.replaceChildren(
      icon('cloud', 16),
      v.weather ? `${labelOf(c, 'weather', v.weather)}${v.temp != null ? ` ${v.temp}°` : ''}` : '날씨 미확인',
    );
  };

  const placeMount = h('div');
  const placeSection = section('장소', { desc: '같은 장소 150m 안에서 다시 기록하면 자동으로 묶입니다.' }, placeMount);

  const updateMap = () => {
    if (!map || v.lat == null) return;
    const ll = [v.lat, v.lng];
    map.setView(ll, Math.max(map.getZoom(), 17));
    if (!marker) {
      marker = window.L.marker(ll, { icon: mineIcon(window.L), draggable: true, keyboard: false }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        set({ lat: p.lat, lng: p.lng, accuracy: null });
        renderLoc();
        lookupAddress();
        renderPlace();
      });
    } else marker.setLatLng(ll);
  };

  async function lookupAddress() {
    if (!state.settings.networkLookup || v.lat == null) {
      if (v.lat != null && !v.address) {
        v.address = '주소 조회 꺼짐';
        renderLoc();
      }
      return;
    }
    const r = await reverseGeocode(v);
    set({ address: r?.address ?? '주소를 찾지 못함' });
    renderLoc();
  }

  async function locate() {
    renderLoc('loading');
    try {
      const pos = await getPosition();
      set({ ...pos, address: null });
      renderLoc();
      updateMap();
      autoPickPlace();
      renderPlace();
      const tasks = [lookupAddress()];
      if (state.settings.networkLookup && !v.weather) {
        tasks.push(
          currentWeather(pos).then((w) => {
            if (w && !v.weather) {
              set({ weather: w.weather, temp: w.temp });
              renderWeather();
              renderEnv();
            }
          }),
        );
      }
      await Promise.all(tasks);
    } catch (err) {
      renderLoc(err);
      renderPlace();
    }
  }

  const timeInput = h('input.input', {
    type: 'datetime-local',
    value: toLocalInput(v.createdAt),
    'aria-label': '방문 시각',
    style: { maxWidth: '230px', minHeight: '40px', padding: '6px 10px', fontSize: '14px' },
    onchange: (e) => e.target.value && set({ createdAt: new Date(e.target.value).toISOString() }),
  });

  const locSection = section(
    '위치와 시간',
    {
      action: h('button.link', { type: 'button', onclick: locate }, icon('locate', 16), ' 다시 찾기'),
    },
    h('div.loc', h('div.loc-icon', icon('pin', 20)), h('div.loc-main', locTitle, locSub)),
    mapEl,
    h('div.auto-facts', h('span', icon('clock', 16), timeInput), weatherFact),
  );

  // ── 장소 ──
  function autoPickPlace() {
    if (v.placeId || v.newPlaceName) return;
    const near = nearbyPlaces(places, v);
    if (near.length) {
      v.placeId = near[0].id;
      if (!v.industry) v.industry = near[0].industry ?? null;
      persistDraft();
      renderIndustry();
    }
  }

  let placeNameGuard;
  const industryMount = h('div');
  function renderIndustry() {
    industryMount.replaceChildren(
      h('div.field-label', '업종'),
      chips(visible(c.industry), { value: v.industry, name: '업종', onChange: (k) => set({ industry: k }) }),
    );
  }

  function renderPlace() {
    const near = nearbyPlaces(places, v);
    const isNew = !v.placeId;
    const items = [
      ...near.map((p) => ({ key: p.id, label: `${p.name} · ${Math.round(p.distance)}m` })),
      { key: '__new', label: '새 장소' },
    ];
    const selectedKey = isNew ? '__new' : near.some((p) => p.id === v.placeId) ? v.placeId : null;
    const others = places.filter((p) => !near.some((n) => n.id === p.id));
    const chosenOther = !isNew && !near.some((p) => p.id === v.placeId) ? places.find((p) => p.id === v.placeId) : null;

    placeNameGuard = isNew
      ? guardedField({
          value: v.newPlaceName,
          label: '장소 별칭',
          maxLength: 40,
          placeholder: '예: 가산 A동 3층 사무실, 역앞 상가 2층',
          onInput: (val) => set({ newPlaceName: val }),
        })
      : null;

    placeMount.replaceChildren(
      h(
        'div.field',
        near.length ? h('div.field-label', '근처에 기록한 장소') : null,
        chips(items, {
          value: selectedKey,
          name: '장소',
          onChange: (k) => {
            if (k === '__new' || k == null) set({ placeId: null });
            else {
              const p = places.find((x) => x.id === k);
              set({ placeId: k, newPlaceName: '', industry: p?.industry ?? v.industry });
              renderIndustry();
            }
            renderPlace();
          },
        }),
        others.length
          ? h(
              'select.select',
              {
                style: { marginTop: '8px' },
                'aria-label': '저장된 다른 장소에서 고르기',
                onchange: (e) => {
                  const p = places.find((x) => x.id === e.target.value);
                  if (!p) return;
                  set({ placeId: p.id, newPlaceName: '', industry: p.industry ?? v.industry });
                  renderIndustry();
                  renderPlace();
                },
              },
              h('option', { value: '' }, chosenOther ? `선택됨: ${chosenOther.name}` : `저장된 다른 장소에서 고르기 (${others.length})`),
              others.map((p) => h('option', { value: p.id }, p.name)),
            )
          : null,
      ),
      isNew
        ? h(
            'div.field',
            h('div.field-label', '장소 별칭', h('span.opt', '선택')),
            placeNameGuard.el,
            h('p.hint', '사업장 단위로 적어 주세요. 사람 이름·연락처는 적지 않습니다. 비우면 주소로 저장됩니다.'),
          )
        : null,
      h('div.field', industryMount),
    );
    renderIndustry();
  }

  // ── 현장 상황 ──
  const envMount = h('div');
  function renderEnv() {
    const field = (dim, title, opts = {}) =>
      h(
        'div.field',
        h('div.field-label', title, opts.auto ? h('span.opt', '자동 입력됨 · 고칠 수 있음') : null),
        chips(visible(c[dim]), { value: v[dim], name: title, onChange: (k) => set({ [dim]: k }) }),
      );
    envMount.replaceChildren(
      field('role', '만난 사람'),
      field('reaction', '첫 반응'),
      field('pace', '상대의 여유'),
      field('crowd', '현장 혼잡도'),
      field('weather', '날씨', { auto: Boolean(v.weather) }),
    );
  }

  // ── 단계 ──
  const stageMount = h('div');
  function renderStage() {
    const idx = Math.max(0, STAGES.findIndex((s) => s.key === v.stage));
    stageMount.replaceChildren(
      h(
        'div.stepper',
        { role: 'radiogroup', 'aria-label': '도달 단계' },
        STAGES.map((s, i) =>
          h(
            'button.step',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(i === idx),
              class: `${i <= idx ? 'on' : ''} ${i === idx ? 'current' : ''}`,
              onclick: () => {
                set({ stage: s.key });
                renderStage();
              },
            },
            s.label,
          ),
        ),
      ),
      h('p.hint', `‘${STAGES[idx].label}’까지 진행 — ${STAGES[idx].hint}`),
    );
  }

  // ── 거절 사유 ──
  const objMount = h('div');
  function renderObjections() {
    const list = v.objections.map((o, i) =>
      h(
        'div.obj-item',
        h(
          'div.obj-head',
          `거절 사유 ${i + 1}`,
          h(
            'button.icon-btn',
            {
              type: 'button',
              'aria-label': '이 거절 사유 삭제',
              style: { width: '36px', height: '36px' },
              onclick: () => {
                v.objections.splice(i, 1);
                set({});
                renderObjections();
              },
            },
            icon('trash', 18),
          ),
        ),
        chips(visible(c.objection), {
          value: o.type,
          name: '거절 사유',
          onChange: (k) => {
            o.type = k;
            set({});
          },
        }),
        h('div.field-label', { style: { marginTop: '14px' } }, '내 대처'),
        chips(visible(c.technique), {
          value: o.technique,
          name: '내 대처',
          onChange: (k) => {
            o.technique = k;
            set({});
          },
        }),
        h('div.field-label', { style: { marginTop: '14px' } }, '이 거절을 넘겼나요?'),
        (() => {
          const seg = h('div.seg', { role: 'radiogroup', 'aria-label': '극복 여부' });
          const draw = () =>
            seg.replaceChildren(
              h('button.yes', { type: 'button', role: 'radio', 'aria-checked': String(o.overcome === true), class: o.overcome === true ? 'on' : '', onclick: () => { o.overcome = true; set({}); draw(); } }, '넘김'),
              h('button.no', { type: 'button', role: 'radio', 'aria-checked': String(o.overcome === false), class: o.overcome === false ? 'on' : '', onclick: () => { o.overcome = false; set({}); draw(); } }, '못 넘김'),
            );
          draw();
          return seg;
        })(),
      ),
    );
    objMount.replaceChildren(
      ...list,
      h(
        'button.btn.btn-ghost.btn-block',
        {
          type: 'button',
          style: { marginTop: list.length ? '10px' : '0' },
          onclick: () => {
            v.objections.push({ type: null, technique: null, overcome: false });
            set({});
            renderObjections();
          },
        },
        icon('plus', 18),
        list.length ? '거절 사유 하나 더' : '거절 사유 추가',
      ),
    );
  }

  // ── 결과 ──
  const outcomeExtra = h('div');
  let productGuard;
  const memoGuard = guardedField({
    multiline: true,
    value: v.memo,
    label: '메모',
    maxLength: 1000,
    placeholder: '다음에 참고할 점. 예: 점심 직후엔 사장님이 여유 있음, 연회비 상쇄 계산이 잘 먹힘',
    onInput: (val) => set({ memo: val }),
  });

  function renderOutcomeExtra() {
    productGuard = null;
    if (v.outcome === 'applied') {
      productGuard = guardedField({
        value: v.product,
        label: '신청 상품',
        maxLength: 40,
        placeholder: '예: 생활 할인 카드',
        onInput: (val) => set({ product: val }),
      });
      outcomeExtra.replaceChildren(h('div.field', h('div.field-label', '신청 상품', h('span.opt', '선택')), productGuard.el));
    } else if (v.outcome === 'revisit') {
      outcomeExtra.replaceChildren(
        h(
          'div.field',
          h('div.field-label', '재방문 날짜', h('span.opt', '선택')),
          h('input.input', { type: 'date', value: v.revisitDate ?? '', 'aria-label': '재방문 날짜', onchange: (e) => set({ revisitDate: e.target.value }) }),
        ),
      );
    } else outcomeExtra.replaceChildren();
  }

  const outcomeSection = section(
    '결과',
    h(
      'div.field',
      chips(OUTCOMES, {
        value: v.outcome,
        name: '결과',
        onChange: (k) => {
          set({ outcome: k });
          renderOutcomeExtra();
        },
      }),
    ),
    outcomeExtra,
    h(
      'div.field',
      h('div.field-label', '메모', h('span.opt', '선택')),
      memoGuard.el,
      h('p.hint', '고객을 알아볼 수 있는 내용(이름, 연락처, 생김새 등)은 적지 마세요. 전화번호·주민번호·이메일·카드번호·이름+호칭은 자동으로 막습니다.'),
    ),
  );

  // ── 저장 ──
  const saveBtn = h('button.btn.btn-primary.btn-block', { type: 'button' }, editing ? '수정 내용 저장' : '저장');
  const saveHint = h('p.hint', { style: { textAlign: 'center' } });
  function updateSaveState() {
    const missing = !v.outcome;
    saveBtn.disabled = missing;
    saveHint.textContent = missing ? '결과를 고르면 저장할 수 있습니다' : '';
  }

  saveBtn.addEventListener('click', async () => {
    const guards = [placeNameGuard, productGuard, memoGuard].filter(Boolean);
    const blocked = guards.some((g) => g.check().length);
    if (blocked) {
      toast('개인정보로 보이는 내용을 지우거나 가려 주세요', 'bad');
      const bad = document.querySelector('.invalid');
      bad?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bad?.focus({ preventScroll: true });
      return;
    }
    if (!v.outcome) return;

    // 결과와 단계를 맞춘다: 신청이면 클로징까지, 거절 사유를 적었으면 이의 처리까지 간 것
    const idx = STAGES.findIndex((s) => s.key === v.stage);
    let stage = v.stage;
    if (v.outcome === 'applied') stage = 'close';
    else if (v.objections.some((o) => o.type) && idx < 3) stage = 'objection';

    let placeId = v.placeId;
    if (!placeId) {
      placeId = uid('p');
      await putPlace({
        id: placeId,
        name: v.newPlaceName.trim() || v.address || '이름 없는 장소',
        industry: v.industry,
        lat: v.lat,
        lng: v.lng,
        address: v.address,
        createdAt: new Date().toISOString(),
      });
    } else {
      const p = await getPlace(placeId);
      if (p) {
        const patch = { ...p };
        if (v.industry && p.industry !== v.industry) patch.industry = v.industry;
        if (p.lat == null && v.lat != null) Object.assign(patch, { lat: v.lat, lng: v.lng, address: v.address });
        await putPlace(patch);
      }
    }

    const out = {
      id: v.id,
      createdAt: v.createdAt,
      lat: v.lat,
      lng: v.lng,
      accuracy: v.accuracy,
      address: v.address,
      placeId,
      industry: v.industry,
      role: v.role,
      crowd: v.crowd,
      pace: v.pace,
      reaction: v.reaction,
      weather: v.weather,
      temp: v.temp,
      stage,
      objections: v.objections.filter((o) => o.type),
      outcome: v.outcome,
      product: v.outcome === 'applied' ? v.product.trim() : '',
      revisitDate: v.outcome === 'revisit' ? v.revisitDate : '',
      memo: v.memo.trim(),
      ...(v.demo ? { demo: true } : {}),
    };
    await putVisit(out);
    clearTimeout(saveTimer);
    if (!editing) await delKV('draft');
    else await prunePlaces();
    toast(editing ? '수정했습니다' : '저장했습니다');
    location.hash = editing ? `#/visit/${v.id}` : '#/';
  });

  const discard = async () => {
    const ok = await confirmSheet({ title: '작성 중인 기록을 버릴까요?', body: '지금까지 입력한 내용이 지워집니다.', ok: '버리기', danger: true });
    if (!ok) return;
    clearTimeout(saveTimer);
    await delKV('draft');
    toast('기록을 버렸습니다');
    location.hash = '#/';
  };

  renderLoc();
  renderWeather();
  renderPlace();
  renderEnv();
  renderStage();
  renderObjections();
  renderOutcomeExtra();
  updateSaveState();

  const node = h(
    'div.page.page-narrow',
    resumed ? h('div.notice.info', icon('edit', 18), h('div.grow', `${fmtDate(v.createdAt)}에 시작한 기록을 이어서 작성합니다.`)) : null,
    locSection,
    placeSection,
    section('현장 상황', { desc: '고객 개인이 아니라 상황을 기록합니다.' }, envMount),
    section('어디까지 갔나요', stageMount),
    section('거절 사유와 내 대처', { desc: '거절이 없었다면 비워 두세요.' }, objMount),
    outcomeSection,
    h('div.savebar', saveBtn, saveHint),
  );

  return {
    title: editing ? '기록 수정' : '방문 기록',
    back: editing ? `#/visit/${v.id}` : '#/',
    actions: editing ? [] : [h('button.btn.btn-text-danger.btn-sm', { type: 'button', onclick: discard }, '버리기')],
    node,
    async onMount() {
      if (!editing) persistDraft();
      try {
        const L = await loadLeaflet();
        if (!mapEl.isConnected) return;
        map = baseMap(L, mapEl, { center: v.lat != null ? [v.lat, v.lng] : [37.5665, 126.978], zoom: v.lat != null ? 17 : 12 });
        updateMap();
      } catch {
        mapEl.replaceChildren(h('div.map-fallback', { style: { position: 'relative', height: '100%' } }, '지도를 불러오지 못했습니다. 위치는 그대로 저장됩니다.'));
      }
      if (!editing && v.lat == null) locate();
      else if (v.lat != null && !v.address) lookupAddress();
    },
    onLeave() {
      map?.remove();
    },
  };
}
