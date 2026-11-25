// What this browser can do, for notices and the settings screen.
import { hasTTS, koreanVoices } from './tts.js';
import { hasSTT } from './stt.js';
import { hasMic, hasRecorder } from './mic.js';
import { hasIDB } from '../core/recordings.js';

export function supportReport() {
  return [
    { label: '음성 읽기 (TTS)', ok: hasTTS(), fix: '자막으로만 진행됩니다.' },
    { label: '한국어 음성', ok: koreanVoices().length > 0, value: `${koreanVoices().length}개`, fix: '안드로이드 설정 › 텍스트 음성 변환 › Google 음성 엔진 › 한국어 데이터 설치' },
    { label: '전사 (음성 인식)', ok: hasSTT(), fix: '크롬에서 열면 전사가 됩니다.' },
    { label: '마이크', ok: hasMic(), fix: 'HTTPS 주소에서 크롬으로 여세요.' },
    { label: '녹음', ok: hasRecorder(), fix: '녹음 없이 반응 시간만 기록합니다.' },
    { label: '음량 측정', ok: typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext), fix: '말 시작은 전사로만 잡습니다.' },
    { label: '녹음 보관 (IndexedDB)', ok: hasIDB(), fix: '녹음은 결과 화면에서만 들을 수 있습니다.' },
  ];
}

export const isSamsungInternet = () => typeof navigator !== 'undefined' && /SamsungBrowser/i.test(navigator.userAgent);
