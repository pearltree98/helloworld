// Speech-onset detection from meter readings: the voice has started when the
// level stays at or above `threshold` for `holdMs`. Returns the time the run
// began, so the reaction time isn't inflated by the hold window. Pure.

export function createOnsetDetector({ threshold, holdMs = 150 }) {
  let since = null;
  let fired = false;
  return {
    /** Feed one reading; returns the onset time once, then null. */
    push(level, t) {
      if (fired) return null;
      if (level >= threshold) {
        if (since == null) since = t;
        if (t - since >= holdMs) {
          fired = true;
          return since;
        }
      } else {
        since = null;
      }
      return null;
    },
    get fired() {
      return fired;
    },
  };
}

/** RMS amplitude (0–1) → meter level 0–100, where −60 dBFS is 0 and 0 dBFS is 100. */
export function levelFromRms(rms) {
  if (!(rms > 0)) return 0;
  const db = 20 * Math.log10(rms);
  return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
}
