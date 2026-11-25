// Vercel serverless function: POST /api/followup
//
// 2단계 자리 (아직 구현하지 않음). Stage 1 has no backend; this file only fixes
// the shape of the endpoint so stage 2 can fill it in.
//
//   request:  { question: string, transcript: string, personaId: 'busy'|'owner'|'veteran' }
//   response: { followup: string }   one follow-up question in the persona's voice
//
// Rules for stage 2:
//   - The Anthropic API key lives only in the Vercel env var ANTHROPIC_API_KEY.
//     Never send it to the client, never prefix it with VITE_.
//   - Runs only when FEATURE_AI_FOLLOWUP=on (and the client flag VITE_FEATURE_AI_FOLLOWUP=on).
//   - Cap input length and rate-limit before calling the model.

export default function handler(req, res) {
  if (process.env.FEATURE_AI_FOLLOWUP !== 'on') {
    res.status(404).json({ error: 'disabled' });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  res.status(501).json({ error: 'not_implemented' });
}
