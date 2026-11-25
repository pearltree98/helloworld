// The three default customers. Scenes follow the content rules: branch booth,
// a visit the customer agreed to in advance, or an introduction through
// someone they know. Never street solicitation.

export const PERSONAS = [
  {
    id: 'busy',
    name: '김 과장',
    label: '바쁜 직장인',
    situation: '40대 직장인, 카드 이미 2장 · 점심시간 지점 부스 앞',
    pitch: 1.05,
    look: {
      bg: '#dbe7ff',
      skin: '#f2c9a5',
      skinShade: '#e0b08a',
      hair: '#2b2622',
      hairStyle: 'short',
      outfit: '#2f3b52',
      shirt: '#ffffff',
      tie: '#c0392b',
      glasses: false,
    },
  },
  {
    id: 'owner',
    name: '박 사장님',
    label: '꼼꼼한 자영업 사장님',
    situation: '50대 식당 운영, 조건을 꼼꼼히 따짐 · 미리 약속한 매장 방문',
    pitch: 1.0,
    look: {
      bg: '#ffe9d6',
      skin: '#eebf98',
      skinShade: '#d9a37c',
      hair: '#4a3328',
      hairStyle: 'bob',
      outfit: '#7a4b8c',
      shirt: '#f6efe6',
      tie: null,
      glasses: true,
    },
  },
  {
    id: 'veteran',
    name: '최 선생님',
    label: '카드 많은 50대',
    situation: '50대, 카드 5장 보유 · 지인 소개로 만난 자리',
    pitch: 0.85,
    look: {
      bg: '#dff3e6',
      skin: '#e8b896',
      skinShade: '#d39f7b',
      hair: '#9a9a9a',
      hairStyle: 'receding',
      outfit: '#3f6b54',
      shirt: '#e9efe9',
      tie: null,
      glasses: false,
    },
  },
];

export const PERSONA_IDS = PERSONAS.map((p) => p.id);

export function getPersona(id) {
  return PERSONAS.find((p) => p.id === id) || null;
}

/** The question's persona, or a random one when the question doesn't name one. */
export function resolvePersona(question, random = Math.random) {
  return getPersona(question?.persona) || PERSONAS[Math.floor(random() * PERSONAS.length)];
}
