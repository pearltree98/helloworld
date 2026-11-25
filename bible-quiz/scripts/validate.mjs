#!/usr/bin/env node
// 문항 데이터 검사: node scripts/validate.mjs            (요약)
//                  node scripts/validate.mjs --answers  (문항별 정답 선지까지 출력)
//
// 앱과 같은 규칙(js/schema.js)으로 data/ 를 검사한다.
// 오류가 있으면 종료 코드 1 → 배포 전에 돌려 보면 좋다.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkQuestion } from '../js/schema.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const NUM = ['①', '②', '③', '④', '⑤'];
const showAnswers = process.argv.includes('--answers');

async function readJSON(rel) {
  try {
    return JSON.parse(await readFile(path.join(root, rel), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return undefined;
    throw new Error(`${rel}: JSON 형식 오류 — ${err.message}`);
  }
}

let errorCount = 0;
let warnCount = 0;
let total = 0;
const ids = new Map();

const meta = await readJSON('data/eras.json');
if (!meta || !Array.isArray(meta.eras)) {
  console.error('✗ data/eras.json 을 읽을 수 없거나 "eras" 배열이 없습니다.');
  process.exit(1);
}

for (const era of meta.eras) {
  const files = Array.isArray(era.files) && era.files.length ? era.files : [`${era.id}.json`];
  let count = 0;
  const dist = [0, 0, 0, 0, 0];
  const lines = [];

  for (const file of files) {
    let data;
    try {
      data = await readJSON(`data/${file}`);
    } catch (err) {
      console.error(`✗ ${err.message}`);
      errorCount += 1;
      continue;
    }
    if (data === undefined) continue;
    const list = Array.isArray(data) ? data : data.questions;
    if (!Array.isArray(list)) {
      console.error(`✗ data/${file}: 문항 배열([ … ])이 아닙니다`);
      errorCount += 1;
      continue;
    }

    list.forEach((q, i) => {
      const where = `data/${file} ${i + 1}번째${q?.id ? ` (${q.id})` : ''}`;
      const { errors, warnings } = checkQuestion(q);
      if (q?.id) {
        if (ids.has(q.id)) errors.push(`id 중복 — ${ids.get(q.id)} 에도 있습니다`);
        else ids.set(q.id, where);
      }
      if (q?.era && q.era !== era.name) warnings.push(`era "${q.era}" ≠ 파일의 시대 "${era.name}"`);

      for (const e of errors) console.error(`✗ ${where}: ${e}`);
      for (const w of warnings) console.warn(`△ ${where}: ${w}`);
      errorCount += errors.length;
      warnCount += warnings.length;
      if (errors.length) return;

      count += 1;
      dist[q.answer] += 1;
      if (showAnswers) {
        lines.push(`   ${q.id}  [${q.type}]  정답 ${NUM[q.answer]} ${q.options[q.answer].keyword || ''} — ${q.options[q.answer].text}`);
      }
    });
  }

  total += count;
  const distText = count ? `  정답 분포 ${dist.map((n, k) => `${NUM[k]}${n}`).join(' ')}` : '';
  console.log(`${count ? '●' : '○'} ${era.name.padEnd(10)} ${String(count).padStart(3)}문항${distText}`);
  for (const l of lines) console.log(l);
}

console.log(`\n합계 ${total}문항 · 오류 ${errorCount} · 경고 ${warnCount}`);
process.exit(errorCount ? 1 : 0);
