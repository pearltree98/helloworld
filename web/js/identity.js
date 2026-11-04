/**
 * v1 방문자 식별: 브라우저가 만든 id를 localStorage 에 두고 요청 헤더로 보낸다.
 * 로그인이 아니므로 "같은 브라우저 = 같은 사람"이라는 가정만 한다. (로드맵: 실제 계정)
 */
const ID_KEY = 'miribom.visitor';
const NAME_KEY = 'miribom.nickname';

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* 사생활 보호 모드 등 */ }
}

export function visitorId() {
  let id = read(ID_KEY);
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = crypto.randomUUID();
    write(ID_KEY, id);
  }
  return id;
}

export function adoptVisitorId(id) {
  if (id && /^[A-Za-z0-9_-]{8,64}$/.test(id)) write(ID_KEY, id);
}

export function nickname() {
  return read(NAME_KEY) || '익명';
}

export function setNickname(name) {
  const clean = (name ?? '').trim().slice(0, 20) || '익명';
  write(NAME_KEY, clean);
  return clean;
}
