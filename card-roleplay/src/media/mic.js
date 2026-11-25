// Microphone access and a live level meter (Web Audio AnalyserNode).
import { levelFromRms } from '../core/onset.js';

export const hasMic = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/**
 * Automatic gain control is off on purpose: it would boost a quiet voice and
 * make the loudness meter say "fine" when a customer would not hear you.
 */
export function openMic() {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
  });
}

export function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Korean explanation for a getUserMedia failure. */
export function micErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return '마이크 권한이 꺼져 있습니다. 주소창 왼쪽 아이콘 › 권한 › 마이크를 "허용"으로 바꾼 뒤 다시 시도하세요.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return '마이크를 찾지 못했습니다. 이어폰 마이크나 기기 마이크가 연결되어 있는지 확인하세요.';
    case 'NotReadableError':
    case 'AbortError':
      return '다른 앱이 마이크를 쓰고 있습니다. 통화·녹음 앱을 닫고 다시 시도하세요.';
    default:
      return `마이크를 열지 못했습니다. (${err?.name || err?.message || '알 수 없는 오류'})`;
  }
}

/**
 * Reads the stream's level every `intervalMs` and passes (level 0–100, time ms)
 * to subscribers. Returns null when Web Audio is unavailable.
 */
export function createLevelMonitor(stream, { intervalMs = 50 } = {}) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const listeners = new Set();
  let level = 0;

  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    level = levelFromRms(Math.sqrt(sum / buf.length));
    const now = performance.now();
    listeners.forEach((fn) => fn(level, now));
  }, intervalMs);

  return {
    get level() {
      return level;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    resume: () => (ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()),
    close() {
      clearInterval(timer);
      listeners.clear();
      source.disconnect();
      ctx.close().catch(() => {});
    },
  };
}

export const hasRecorder = () => typeof window !== 'undefined' && 'MediaRecorder' in window;

function pickMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || '';
}

/** MediaRecorder over the session's mic stream. stop() resolves with a Blob, or null if nothing was recorded. */
export function createRecorder(stream) {
  if (!hasRecorder()) return null;
  const mimeType = pickMimeType();
  let rec = null;
  let chunks = [];

  return {
    start() {
      chunks = [];
      try {
        rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      } catch {
        rec = null;
        return false;
      }
      rec.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      rec.start(250);
      return true;
    },
    stop() {
      return new Promise((resolve) => {
        if (!rec || rec.state === 'inactive') return resolve(null);
        const r = rec;
        rec = null;
        r.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: r.mimeType || mimeType || 'audio/webm' }) : null);
        r.onerror = () => resolve(null);
        try {
          r.stop();
        } catch {
          resolve(null);
        }
      });
    },
    discard() {
      if (rec && rec.state !== 'inactive') {
        rec.ondataavailable = null;
        rec.onstop = null;
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
      }
      rec = null;
      chunks = [];
    },
  };
}
