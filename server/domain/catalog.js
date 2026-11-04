/** Fixed keys. Human-readable labels come from /locales/*.json (see locales.js). */
export const CATEGORY_KEYS = ['road', 'walk', 'home', 'work', 'transit', 'air', 'water', 'outdoors', 'other'];
export const OUTCOME_KEYS = ['near_miss', 'observed', 'injury', 'fatal'];

export const CATEGORY_SET = new Set(CATEGORY_KEYS);
export const OUTCOME_SET = new Set(OUTCOME_KEYS);
