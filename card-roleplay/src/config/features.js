// Feature flags. Stage-2 features stay off until they are built and reviewed.
// Client flags come from Vite env vars at build time (Vercel › Settings › Environment Variables).

export const features = Object.freeze({
  // 2단계 AI 꼬리 질문. The server also has to allow it (FEATURE_AI_FOLLOWUP=on in api/followup.js).
  aiFollowup: import.meta.env?.VITE_FEATURE_AI_FOLLOWUP === 'on',
});
