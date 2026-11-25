// Settings defaults and validation. Pure: no browser APIs, so Node tests can import it.

export const DEFAULT_SETTINGS = Object.freeze({
  reactionLimitSec: 3, // ① 반응 타이머: 질문이 끝나고 말을 시작할 때까지
  answerLimitSec: 20, // ② 답변 타이머: 말을 시작하고 끝낼 때까지
  sessionSize: 5,
  voiceURI: '', // '' = 기기의 첫 한국어 음성
  rate: 1,
  quietLevel: 45, // 답변 평균 음량이 이 값 미만이면 "조금 더 크게"
  speechLevel: 30, // 음량이 이 값 이상으로 0.15초 이어지면 "말 시작"
  recordingCap: 50,
  transcribe: true,
});

export const SETTING_RANGES = Object.freeze({
  reactionLimitSec: { min: 1, max: 10, step: 0.5 },
  answerLimitSec: { min: 5, max: 60, step: 1 },
  sessionSize: { min: 1, max: 20, step: 1 },
  rate: { min: 0.9, max: 1.1, step: 0.05 },
  quietLevel: { min: 5, max: 95, step: 1 },
  speechLevel: { min: 5, max: 95, step: 1 },
  recordingCap: { min: 5, max: 200, step: 5 },
});

export function clampToRange(value, { min, max, step }, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const snapped = Math.round((n - min) / step) * step + min;
  return Math.min(max, Math.max(min, Number(snapped.toFixed(4))));
}

export function normalizeSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = { ...DEFAULT_SETTINGS };
  for (const [key, range] of Object.entries(SETTING_RANGES)) {
    if (key in src) out[key] = clampToRange(src[key], range, DEFAULT_SETTINGS[key]);
  }
  if (typeof src.voiceURI === 'string') out.voiceURI = src.voiceURI;
  if (typeof src.transcribe === 'boolean') out.transcribe = src.transcribe;
  return out;
}
