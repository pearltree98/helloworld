import { h, icon, section, toast, confirmSheet, download, fmtDate, isoLocalDate } from '../ui.js';
import { allVisits, allPlaces, bulkPut, deleteWhere, clearAll, setKV, getKV, delKV, uid } from '../db.js';
import { state, saveCustomCatalog, saveSettings, loadState } from '../state.js';
import { DEFAULT_CATALOG, DIMENSION_TITLES, STAGES, labelOf } from '../catalog.js';
import { BLOCKED_FIELDS, findPersonalInfo, maskPersonalInfo } from '../privacy.js';
import { generateDemo } from '../demo.js';

const EDITABLE = ['industry', 'objection', 'technique', 'role'];
let editDim = 'objection';

const csvCell = (x) => {
  const s = x == null ? '' : String(x);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCSV(visits, places) {
  const c = state.catalog;
  const byId = new Map(places.map((p) => [p.id, p]));
  const L = (d, k) => (k == null ? '' : labelOf(c, d, k));
  const head = ['방문일시', '장소', '업종', '주소', '위도', '경도', '날씨', '기온', '만난 사람', '첫 반응', '상대의 여유', '혼잡도', '도달 단계', '거절 사유', '내 대처', '넘김 여부', '결과', '신청 상품', '재방문 날짜', '메모'];
  const rows = visits.map((v) => {
    const os = v.objections ?? [];
    return [
      fmtDate(v.createdAt, { withYear: true }),
      byId.get(v.placeId)?.name ?? '',
      L('industry', v.industry),
      v.address ?? '',
      v.lat?.toFixed(6) ?? '',
      v.lng?.toFixed(6) ?? '',
      L('weather', v.weather),
      v.temp ?? '',
      L('role', v.role),
      L('reaction', v.reaction),
      L('pace', v.pace),
      L('crowd', v.crowd),
      L('stage', v.stage),
      os.map((o) => L('objection', o.type)).join('; '),
      os.map((o) => L('technique', o.technique)).join('; '),
      os.map((o) => (o.overcome ? '넘김' : '못 넘김')).join('; '),
      L('outcome', v.outcome),
      v.product ?? '',
      v.revisitDate ?? '',
      v.memo ?? '',
    ];
  });
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

/** 복원 파일 검사: 형식이 맞는 것만 받고, 혹시 섞인 개인정보는 가린다 */
function sanitizeImport(json) {
  if (!json || json.app !== 'fieldnote' || !Array.isArray(json.visits) || !Array.isArray(json.places)) {
    throw new Error('현장노트 백업 파일이 아닙니다.');
  }
  const clean = (s, max) => (typeof s === 'string' ? maskPersonalInfo(s).slice(0, max) : '');
  const stageKeys = new Set(STAGES.map((s) => s.key));
  const places = json.places
    .filter((p) => p && typeof p.id === 'string')
    .map((p) => ({
      id: p.id,
      name: clean(p.name, 40) || '이름 없는 장소',
      industry: typeof p.industry === 'string' ? p.industry : null,
      lat: Number.isFinite(p.lat) ? p.lat : null,
      lng: Number.isFinite(p.lng) ? p.lng : null,
      address: clean(p.address, 120) || null,
      createdAt: p.createdAt,
      ...(p.demo ? { demo: true } : {}),
    }));
  const str = (x) => (typeof x === 'string' ? x : null);
  const visits = json.visits
    .filter((v) => v && typeof v.id === 'string' && !Number.isNaN(new Date(v.createdAt).getTime()))
    .map((v) => ({
      id: v.id,
      createdAt: new Date(v.createdAt).toISOString(),
      lat: Number.isFinite(v.lat) ? v.lat : null,
      lng: Number.isFinite(v.lng) ? v.lng : null,
      accuracy: Number.isFinite(v.accuracy) ? v.accuracy : null,
      address: clean(v.address, 120) || null,
      placeId: str(v.placeId),
      industry: str(v.industry),
      role: str(v.role),
      crowd: str(v.crowd),
      pace: str(v.pace),
      reaction: str(v.reaction),
      weather: str(v.weather),
      temp: Number.isFinite(v.temp) ? v.temp : null,
      stage: stageKeys.has(v.stage) ? v.stage : 'approach',
      objections: Array.isArray(v.objections)
        ? v.objections.filter((o) => o && typeof o.type === 'string').map((o) => ({ type: o.type, technique: str(o.technique), overcome: Boolean(o.overcome) }))
        : [],
      outcome: ['applied', 'revisit', 'info', 'rejected'].includes(v.outcome) ? v.outcome : 'rejected',
      product: clean(v.product, 40),
      revisitDate: typeof v.revisitDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.revisitDate) ? v.revisitDate : '',
      memo: clean(v.memo, 1000),
      ...(v.demo ? { demo: true } : {}),
    }));
  return { visits, places, catalog: json.catalog && typeof json.catalog === 'object' ? json.catalog : null };
}

export default async function settings() {
  const [visits, places, lastBackupAt] = await Promise.all([allVisits(), allPlaces(), getKV('lastBackupAt')]);
  const demoCount = visits.filter((v) => v.demo).length;
  const rerender = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

  // 개인정보 원칙
  const privacy = section(
    '개인정보를 저장하지 않습니다',
    h('div.notice.info', { style: { marginTop: '12px' } }, icon('shield', 18), h('div.grow', '이 앱은 고객이 아니라 ', h('strong', '나의 영업 행동과 결과'), '를 기록합니다. 동의 없이 고객 정보를 모으는 것은 개인정보보호법 위반이므로, 아래 항목은 입력란 자체가 없습니다.')),
    h('div.privacy-list', BLOCKED_FIELDS.map((f) => h('span', f))),
    h('p.small.muted', '메모·장소 별칭·상품명은 저장하기 전에 전화번호, 주민·외국인등록번호, 이메일, 카드·계좌번호, 집 주소(동·호수), 생년월일, 이름+호칭을 자동으로 검사해 막습니다. 기록된 위치는 고객이 아니라 내 위치입니다.'),
  );

  // 네트워크 조회
  const netSwitch = h('input', { type: 'checkbox', checked: state.settings.networkLookup, 'aria-label': '주소·날씨 자동 조회' });
  netSwitch.addEventListener('change', async () => {
    await saveSettings({ networkLookup: netSwitch.checked });
    toast(netSwitch.checked ? '주소·날씨를 자동으로 찾습니다' : '주소·날씨 자동 조회를 껐습니다');
  });
  const auto = section(
    '자동 입력',
    h(
      'div.setting-row',
      h('div', h('div.setting-title', '주소·날씨 자동 조회'), h('div.setting-desc', '위치 좌표만 OpenStreetMap(주소)과 Open-Meteo(날씨)에 보내 조회합니다. 끄면 좌표만 저장합니다.')),
      h('label.switch', netSwitch, h('span')),
    ),
  );

  // 항목 관리
  const itemsMount = h('div');
  const drawItems = () => {
    const custom = structuredClone(state.customCatalog ?? {});
    const cur = (custom[editDim] ??= { hidden: [], added: [] });
    cur.hidden ??= [];
    cur.added ??= [];
    const list = state.catalog[editDim];
    const input = h('input.input', { type: 'text', maxLength: 20, placeholder: `새 ${DIMENSION_TITLES[editDim]} 이름`, 'aria-label': '새 항목 이름' });
    const err = h('p.hint');
    const add = async () => {
      const label = input.value.trim();
      if (!label) return;
      if (findPersonalInfo(label).length) {
        err.className = 'hint bad';
        err.textContent = '개인정보로 보이는 내용은 항목 이름으로 쓸 수 없습니다.';
        return;
      }
      if (list.some((it) => it.label === label)) {
        err.className = 'hint bad';
        err.textContent = '이미 있는 항목입니다.';
        return;
      }
      cur.added.push({ key: uid('c'), label });
      await saveCustomCatalog(custom);
      toast(`‘${label}’을(를) 추가했습니다`);
      drawItems();
    };
    input.addEventListener('keydown', (e) => e.key === 'Enter' && add());
    itemsMount.replaceChildren(
      h(
        'div.tabs-inline',
        EDITABLE.map((d) => h('button.chip', { type: 'button', class: d === editDim ? 'on' : '', onclick: () => { editDim = d; drawItems(); } }, DIMENSION_TITLES[d])),
      ),
      h(
        'ul.item-list',
        list.map((it) =>
          h(
            'li',
            { class: it.hidden ? 'hidden-item' : '' },
            h('span.item-name', it.label, DEFAULT_CATALOG[editDim].some((d) => d.key === it.key) ? null : h('span.tag', { style: { marginLeft: '6px' } }, '추가함')),
            h(
              'button.btn.btn-ghost.btn-sm',
              {
                type: 'button',
                onclick: async () => {
                  cur.hidden = it.hidden ? cur.hidden.filter((k) => k !== it.key) : [...cur.hidden, it.key];
                  await saveCustomCatalog(custom);
                  drawItems();
                },
              },
              it.hidden ? '다시 보이기' : '숨기기',
            ),
          ),
        ),
      ),
      h('div.add-row', input, h('button.btn.btn-primary', { type: 'button', onclick: add }, '추가')),
      err,
    );
  };
  drawItems();
  const items = section('선택 항목 관리', { desc: '기록 화면의 칩을 내 영업 방식에 맞게 바꿉니다. 지난 기록의 통계를 지키기 위해 기본 항목은 지우지 않고 숨깁니다.' }, itemsMount);

  // 백업
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try {
      const data = sanitizeImport(JSON.parse(await f.text()));
      const ok = await confirmSheet({ title: '백업을 불러올까요?', body: `방문 ${data.visits.length}건, 장소 ${data.places.length}곳. 같은 기록은 덮어쓰고, 나머지는 지금 기록에 더합니다.`, ok: '불러오기' });
      if (!ok) return;
      await bulkPut(data);
      if (data.catalog) await saveCustomCatalog(data.catalog);
      await loadState();
      toast('백업을 불러왔습니다');
      rerender();
    } catch (err) {
      toast(err.message?.includes('JSON') ? '파일을 읽을 수 없습니다' : err.message, 'bad');
    } finally {
      fileInput.value = '';
    }
  });

  const backup = section(
    '백업과 내보내기',
    { desc: lastBackupAt ? `마지막 백업: ${fmtDate(lastBackupAt, { withYear: true })}` : '아직 백업한 적이 없습니다. 기록은 이 기기에만 있으니 주기적으로 백업해 주세요.' },
    h(
      'div.btn-row',
      h(
        'button.btn.btn-primary',
        {
          type: 'button',
          onclick: async () => {
            const [vs, ps] = await Promise.all([allVisits(), allPlaces()]);
            const payload = { app: 'fieldnote', version: 1, exportedAt: new Date().toISOString(), visits: vs, places: ps, catalog: state.customCatalog };
            download(`현장노트-백업-${isoLocalDate()}.json`, JSON.stringify(payload, null, 1), 'application/json');
            await setKV('lastBackupAt', new Date().toISOString());
            toast('백업 파일을 저장했습니다');
          },
        },
        icon('download', 18),
        '백업 파일 저장',
      ),
      h('button.btn.btn-ghost', { type: 'button', onclick: () => fileInput.click() }, icon('upload', 18), '백업 불러오기'),
      h(
        'button.btn.btn-ghost',
        {
          type: 'button',
          onclick: async () => {
            const [vs, ps] = await Promise.all([allVisits(), allPlaces()]);
            download(`현장노트-${isoLocalDate()}.csv`, toCSV(vs, ps), 'text/csv;charset=utf-8');
            toast('엑셀에서 열 수 있는 CSV를 저장했습니다');
          },
        },
        '엑셀(CSV) 내보내기',
      ),
      fileInput,
    ),
  );

  // 데모
  const demo = section(
    '데모 데이터',
    { desc: '가상의 방문 64건으로 성적표·지도가 어떻게 보이는지 미리 봅니다. 데모 기록만 골라 지울 수 있습니다.' },
    h(
      'div.btn-row',
      h(
        'button.btn.btn-ghost',
        {
          type: 'button',
          disabled: demoCount > 0,
          onclick: async () => {
            await bulkPut(generateDemo());
            toast('데모 데이터를 넣었습니다');
            location.hash = '#/report';
          },
        },
        demoCount ? `데모 ${demoCount}건 들어 있음` : '데모 데이터 넣기',
      ),
      demoCount
        ? h(
            'button.btn.btn-ghost',
            {
              type: 'button',
              onclick: async () => {
                await deleteWhere((x) => x.demo);
                toast('데모 데이터를 지웠습니다');
                rerender();
              },
            },
            '데모만 지우기',
          )
        : null,
    ),
  );

  const danger = section(
    '전체 삭제',
    { desc: `이 기기에 저장된 방문 ${visits.length}건, 장소 ${places.length}곳과 설정을 모두 지웁니다. 되돌릴 수 없습니다.` },
    h(
      'button.btn.btn-ghost',
      {
        type: 'button',
        style: { color: 'var(--bad-text)' },
        onclick: async () => {
          const ok = await confirmSheet({ title: '모든 기록을 지울까요?', body: '백업 파일이 없다면 복구할 수 없습니다.', ok: '모두 삭제', danger: true });
          if (!ok) return;
          await clearAll();
          await delKV('draft');
          await loadState();
          toast('모두 지웠습니다');
          rerender();
        },
      },
      icon('trash', 18),
      '모든 기록 삭제',
    ),
  );

  const about = section(
    '홈 화면에 추가',
    h('p.small.muted', '아이폰: Safari 공유 버튼 → ‘홈 화면에 추가’. 안드로이드: Chrome 메뉴 → ‘홈 화면에 추가’ 또는 ‘앱 설치’. 추가하면 앱처럼 열리고, 인터넷이 없어도 기록할 수 있습니다.'),
    h('p.small.muted', '현장노트 1.0 · 데이터는 이 기기의 브라우저 저장소(IndexedDB)에만 있습니다.'),
  );

  const node = h('div.page.page-narrow', privacy, auto, items, backup, demo, danger, about);
  return { title: '설정', node, keepScroll: false };
}
