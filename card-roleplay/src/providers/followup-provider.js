// 2단계 자리: AI 꼬리 질문 공급자 (structure only, not wired into the UI yet).
//
// Contract: given the question, what the trainee said (transcript) and the
// customer persona, return ONE follow-up question in that customer's voice,
// or null. The model call happens on the server (/api/followup) so the API
// key never reaches the browser.
//
// Where it plugs in later: practice.js, after the result card is shown,
// `if (followup.enabled)` → ask the follow-up as a new item with the same persona.
import { features } from '../config/features.js';

/**
 * @typedef {Object} FollowupProvider
 * @property {boolean} enabled
 * @property {(input: { question: string, transcript: string, personaId: string }) => Promise<string|null>} followup
 */

/** @returns {FollowupProvider} */
export function createFollowupProvider({ enabled = features.aiFollowup, fetchImpl = globalThis.fetch } = {}) {
  return {
    enabled,
    async followup({ question, transcript, personaId }) {
      if (!enabled || !transcript?.trim()) return null;
      try {
        const res = await fetchImpl('/api/followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, transcript, personaId }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data.followup === 'string' && data.followup.trim() ? data.followup.trim() : null;
      } catch {
        return null;
      }
    },
  };
}
