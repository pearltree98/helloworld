// Text-to-speech through the Web Speech API (SpeechSynthesis, ko-KR).
// If the engine never starts (no Korean voice, blocked, unsupported), speak()
// falls back to a timed simulation so the subtitle and the lip movement still
// run for about as long as the sentence would take to say.

export const hasTTS = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

const isKorean = (voice) => /^ko([-_]|$)/i.test(voice.lang || '');

export function koreanVoices() {
  return hasTTS() ? window.speechSynthesis.getVoices().filter(isKorean) : [];
}

/** Voices load asynchronously in Chrome; wait for them, but not forever. */
export function waitForVoices(timeoutMs = 1500) {
  if (!hasTTS()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) return Promise.resolve(synth.getVoices());
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', done);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(done, timeoutMs);
    synth.addEventListener('voiceschanged', done);
  });
}

export function pickVoice(voiceURI) {
  const list = koreanVoices();
  return (
    list.find((v) => v.voiceURI === voiceURI) ||
    list.find((v) => v.default) ||
    list.find((v) => v.localService) ||
    list[0] ||
    null
  );
}

export const estimateDurationMs = (text, rate = 1) => Math.max(1200, ([...text].length * 160) / rate);

// Chrome can garbage-collect an utterance mid-sentence and never fire onend; keep a reference.
let current = null;

/**
 * Speaks `text`. Callbacks: onStart({ simulated }), onBoundary(event), onEnd(how).
 * onEnd fires exactly once, unless cancel() is called first.
 * Returns { cancel(), simulated }.
 */
export function speak(text, { voiceURI = '', rate = 1, pitch = 1, onStart, onBoundary, onEnd } = {}) {
  let finished = false;
  let simulated = false;
  let started = false;
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers.clear();
  };
  const estimate = estimateDurationMs(text, rate);

  const finish = (how) => {
    if (finished) return;
    finished = true;
    clearTimers();
    current = null;
    onEnd?.(how);
  };

  const simulate = (reason) => {
    if (finished || simulated) return;
    simulated = true;
    if (hasTTS()) window.speechSynthesis.cancel();
    if (!started) {
      started = true;
      onStart?.({ simulated: true, reason });
    }
    later(() => finish('simulated'), estimate);
  };

  const handle = {
    cancel() {
      if (finished) return;
      finished = true;
      clearTimers();
      current = null;
      if (hasTTS()) window.speechSynthesis.cancel();
    },
    get simulated() {
      return simulated;
    },
  };

  if (!hasTTS()) {
    later(() => simulate('unsupported'), 0);
    return handle;
  }

  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  const voice = pickVoice(voiceURI);
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = pitch;
  u.onstart = () => {
    if (finished || simulated) return;
    started = true;
    onStart?.({ simulated: false });
    later(() => finish('timeout'), estimate * 3 + 4000); // onend sometimes never comes
  };
  u.onboundary = (event) => {
    if (!finished && !simulated) onBoundary?.(event);
  };
  u.onend = () => {
    if (!simulated) finish('tts');
  };
  u.onerror = (event) => {
    if (finished || simulated) return;
    if (event.error === 'interrupted' || event.error === 'canceled') return;
    if (started) finish('error');
    else simulate(event.error || 'error');
  };
  current = u;

  const go = () => {
    if (finished) return;
    synth.resume();
    synth.speak(u);
    later(() => {
      if (!started) simulate('no-start');
    }, 2500);
  };
  if (synth.speaking || synth.pending) {
    synth.cancel();
    later(go, 80);
  } else {
    go();
  }
  return handle;
}

export function cancelSpeech() {
  if (hasTTS()) window.speechSynthesis.cancel();
  current = null;
}
