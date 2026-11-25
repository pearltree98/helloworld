// Hash routing helpers: #/name/param?query

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || '', params: parts.slice(1), query: new URLSearchParams(query) };
}

export function navigate(path, { replace = false } = {}) {
  const target = '#/' + path.replace(/^[#/]+/, '');
  if (location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (replace) {
    location.replace(target);
  } else {
    location.hash = target;
  }
}
