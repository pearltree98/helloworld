import { visitorId, nickname, adoptVisitorId } from './identity.js';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message ?? `요청 실패 (${status})`);
    this.status = status;
    this.body = body ?? {};
    this.errors = body?.errors ?? {};
  }
}

async function call(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Visitor-Id': visitorId(),
      'X-Visitor-Name': encodeURIComponent(nickname()),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  adoptVisitorId(res.headers.get('X-Visitor-Id'));
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

const qs = (obj) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== '' && v !== null) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  meta: () => call('GET', '/api/meta'),
  me: () => call('GET', '/api/me'),
  setMe: (nick) => call('POST', '/api/me', { nickname: nick }),
  stats: () => call('GET', '/api/stats'),
  cases: (params = {}) => call('GET', `/api/cases${qs(params)}`),
  case: (id) => call('GET', `/api/cases/${id}`),
  createCase: (data) => call('POST', '/api/cases', data),
  learn: (id) => call('POST', `/api/cases/${id}/lessons`),
  pinTicket: (id, data) => call('POST', `/api/cases/${id}/tickets`, data),
  tickets: (status) => call('GET', `/api/tickets${qs({ status })}`),
  takeTicket: (id) => call('POST', `/api/tickets/${id}/take`),
};

let metaCache;
export async function meta() {
  metaCache ??= await api.meta();
  return metaCache;
}
