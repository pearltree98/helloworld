// Speech-to-text with webkitSpeechRecognition (ko-KR, interim results).
// Android Chrome ends recognition after each pause, so it is restarted until
// stop() is called, and the final text of every run is kept.

const Recognition = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);

export const hasSTT = () => Recognition() != null;

const isAndroid = () => /Android/i.test(navigator.userAgent);

// Errors after which retrying is pointless for this session.
const FATAL = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported', 'bad-grammar']);

export function sttErrorMessage(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '이 브라우저에서 음성 인식이 막혀 있습니다. 크롬에서 열면 전사가 됩니다.';
    case 'audio-capture':
      return '녹음과 전사를 동시에 할 수 없는 기기입니다. 전사 없이 녹음·음량만 기록합니다.';
    case 'network':
      return '음성 인식 서버에 연결하지 못했습니다(인터넷 확인). 전사 없이 진행합니다.';
    case 'unsupported':
      return '이 브라우저는 전사를 지원하지 않습니다. 크롬에서 열면 전사가 됩니다. 녹음과 음량 측정은 그대로 됩니다.';
    default:
      return `전사가 중단되었습니다 (${code}). 녹음과 음량 측정은 계속됩니다.`;
  }
}

/**
 * callbacks:
 *   onText(text)        running transcript (finals + current interim)
 *   onFirstResult(t)    performance.now() of the first non-empty result
 *   onFatal(code)       recognition gave up (see FATAL)
 * returns { start(), stop(): Promise<string>, abort(), text() }
 */
export function createRecognizer({ lang = 'ko-KR', onText, onFirstResult, onFatal } = {}) {
  const SR = Recognition();
  if (!SR) return null;

  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = !isAndroid(); // Android repeats results in continuous mode
  rec.maxAlternatives = 1;

  let active = false;
  let committed = []; // final text of earlier runs
  let finals = []; // final results of the current run, by index
  let interim = '';
  let firstAt = null;
  let restarts = [];
  let stopWaiter = null;

  const text = () => [...committed, ...finals.filter(Boolean), interim].join(' ').replace(/\s+/g, ' ').trim();

  rec.onresult = (event) => {
    interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const chunk = result[0]?.transcript || '';
      if (result.isFinal) finals[i] = chunk;
      else interim += chunk;
    }
    const current = text();
    if (firstAt == null && current) {
      firstAt = performance.now();
      onFirstResult?.(firstAt);
    }
    onText?.(current);
  };

  rec.onerror = (event) => {
    if (FATAL.has(event.error)) {
      active = false;
      onFatal?.(event.error);
    }
    // 'no-speech' and 'aborted' are routine; onend decides whether to restart.
  };

  rec.onend = () => {
    committed = [...committed, ...finals.filter(Boolean)];
    finals = [];
    if (stopWaiter) {
      // keep whatever interim text was still pending when the user stopped
      const result = [...committed, interim].join(' ').replace(/\s+/g, ' ').trim();
      interim = '';
      stopWaiter(result);
      stopWaiter = null;
      return;
    }
    interim = '';
    if (!active) return;
    const now = performance.now();
    restarts = restarts.filter((t) => now - t < 3000);
    restarts.push(now);
    if (restarts.length > 6) {
      active = false;
      onFatal?.('restart-loop');
      return;
    }
    try {
      rec.start();
    } catch {
      /* already started */
    }
  };

  return {
    start() {
      active = true;
      try {
        rec.start();
      } catch {
        /* already started */
      }
    },
    /** Stops listening and resolves with the transcript (waits briefly for the final result). */
    stop() {
      if (!active && !stopWaiter) return Promise.resolve(text());
      active = false;
      return new Promise((resolve) => {
        const fallback = text();
        const timer = setTimeout(() => {
          stopWaiter = null;
          resolve(fallback);
        }, 1200);
        stopWaiter = (finalText) => {
          clearTimeout(timer);
          resolve(finalText || fallback);
        };
        try {
          rec.stop();
        } catch {
          stopWaiter(fallback);
        }
      });
    },
    abort() {
      active = false;
      stopWaiter = null;
      rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* not running */
      }
    },
    text,
  };
}
