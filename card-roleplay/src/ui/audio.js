import { h } from './dom.js';

/**
 * <audio> for a recording. Chrome's MediaRecorder writes WebM without a
 * duration, so the player shows 0:00 / Infinity; seeking far past the end
 * once makes Chrome scan the file and learn the real length.
 */
export function audioPlayer(url) {
  const audio = h('audio', { controls: true, preload: 'metadata', src: url });
  audio.addEventListener(
    'loadedmetadata',
    () => {
      if (audio.duration !== Infinity) return;
      const rewind = () => {
        audio.removeEventListener('timeupdate', rewind);
        audio.currentTime = 0;
      };
      audio.addEventListener('timeupdate', rewind);
      audio.currentTime = 1e101;
    },
    { once: true },
  );
  return audio;
}
