// 질문 공급자 (Question provider)
//
// The practice screen only talks to this interface, so the static bank can
// later be swapped for, or combined with, an AI provider (stage 2).
//
// @typedef {{ id: string, question: string, persona: string|null,
//             modelAnswer: string, needsCheck: boolean, tags: string[] }} Question
//
// @typedef {Object} QuestionProvider
// @property {string} kind
// @property {(opts: { mode: 'normal'|'retry', size: number }) => Promise<Question[]>} nextSession
import { loadBank, loadProgress } from '../core/store.js';
import { pickSession } from '../core/leitner.js';

/** 정적 질문 공급자: the local question bank, drawn with Leitner priority. */
export function createStaticProvider({ getBank = loadBank, getProgress = loadProgress } = {}) {
  return {
    kind: 'static',
    async nextSession({ mode = 'normal', size = 5 } = {}) {
      return pickSession(getBank(), getProgress(), { mode, size });
    },
  };
}
