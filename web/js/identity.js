/**
 * v1 visitor identity: the browser mints an id, keeps it in localStorage and sends it as a header.
 * This is not a login; it only assumes "same browser = same person". (Roadmap: real accounts.)
 */
const ID_KEY = 'stepback.visitor';
const NAME_KEY = 'stepback.nickname';

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode etc. */ }
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
  return read(NAME_KEY) || 'Anonymous';
}

export function setNickname(name) {
  const clean = (name ?? '').trim().slice(0, 20) || 'Anonymous';
  write(NAME_KEY, clean);
  return clean;
}
