// 문항 데이터 불러오기
//
// data/eras.json 의 시대 목록을 읽고, 시대마다 data/<id>.json 을 불러온다.
// (시대에 "files": ["a.json", "b.json"] 을 적으면 여러 파일로 나눌 수 있다.)
// 파일이 없으면(404) 그 시대는 '준비 중'으로 표시된다. 앱 코드는 고칠 필요가 없다.

import { checkQuestion } from './schema.js';

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function loadDB() {
  const meta = await getJSON('data/eras.json');
  if (!meta || !Array.isArray(meta.eras)) {
    throw new Error('data/eras.json을 읽을 수 없습니다');
  }

  const problems = []; // 형식 오류로 빠진 문항
  const loadErrors = []; // 네트워크 등으로 못 읽은 파일

  const eras = await Promise.all(
    meta.eras.map(async (era) => {
      const files = Array.isArray(era.files) && era.files.length ? era.files : [`${era.id}.json`];
      const lists = await Promise.all(
        files.map(async (file) => {
          try {
            const data = await getJSON(`data/${file}`);
            if (data == null) return [];
            const list = Array.isArray(data) ? data : data.questions;
            if (!Array.isArray(list)) {
              problems.push({ where: file, msg: '문항 배열([ … ])이 아닙니다' });
              return [];
            }
            return list.map((q, i) => ({ q, file, i }));
          } catch (err) {
            loadErrors.push({ file, msg: err.message });
            return [];
          }
        }),
      );
      return { ...era, raw: lists.flat() };
    }),
  );

  // 시대 순서 → 파일 순서대로 번호를 매기고, 형식 검사와 id 중복 검사를 한다.
  const byId = new Map();
  let order = 0;
  for (const era of eras) {
    era.questions = [];
    for (const { q, file, i } of era.raw) {
      const where = `${file} ${i + 1}번째${q?.id ? ` (${q.id})` : ''}`;
      const { errors, warnings } = checkQuestion(q);
      if (errors.length) {
        problems.push({ where, msg: errors.join(' / ') });
        continue;
      }
      if (byId.has(q.id)) {
        problems.push({ where, msg: `id 중복: ${q.id}` });
        continue;
      }
      if (q.era && q.era !== era.name) warnings.push(`era "${q.era}"가 파일의 시대 "${era.name}"와 다릅니다`);
      for (const w of warnings) console.warn(`[문항 확인] ${where}: ${w}`);

      const item = { ...q, _era: era.id, _eraName: era.name, _order: order++ };
      era.questions.push(item);
      byId.set(q.id, item);
    }
    delete era.raw;
  }

  // 유형 목록: 처음 나온 순서대로
  const typeMap = new Map();
  for (const era of eras) {
    for (const q of era.questions) {
      if (!typeMap.has(q.type)) typeMap.set(q.type, []);
      typeMap.get(q.type).push(q);
    }
  }
  const types = [...typeMap].map(([name, questions]) => ({ name, questions }));

  if (problems.length) console.warn('[문항 형식 오류]', problems);
  if (loadErrors.length) console.warn('[데이터 파일을 읽지 못함]', loadErrors);

  return { eras, types, byId, problems, loadErrors };
}
