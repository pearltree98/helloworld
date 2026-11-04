/**
 * 초기 사례. 실제 사건에서 배운 일반 원리로 적되, 피해자·장소를 특정하지 않는다.
 * (원칙: 탓하지 않는다. 사람을 지키는 '구조'를 기록한다.)
 */
import { openDb } from './db.js';
import { validateCase } from './domain/validate.js';

const TEAM_ID = 'miribom-team';

export const SEED_CASES = [
  {
    title: '교차로에서 우회전하는 대형 트럭 옆에 서 있던 보행자',
    category: 'road',
    outcome: 'observed',
    severity: 5,
    likelihood: 3,
    situation:
      '사거리 횡단보도. 보행 신호가 바뀌는 순간 대형 트럭이 우회전을 시작했고, 인도 가장자리에서 트럭 우측 바로 옆에 서 있던 보행자가 뒷바퀴에 역과되는 사고 영상을 보았다. 운전자는 보행자를 보지 못했다.',
    hazard: '대형 차량의 우측 사각지대와 내륜차(앞바퀴보다 뒷바퀴가 안쪽으로 도는 현상). 운전석에서 우측 아래는 거의 보이지 않는다.',
    exposure: '횡단보도 앞 연석 끝, 트럭의 우측면과 1m 이내에 서 있는 상태. 신호가 바뀌자마자 출발하려는 자세.',
    avoidance:
      '대형차가 내 옆에서 깜빡이를 켜고 있으면 한 걸음 물러나 완전히 지나갈 때까지 기다린다. 신호가 바뀌어도 "차가 멈춘 것"을 눈으로 확인한 뒤 건넌다. 운전자와 눈이 마주치지 않았다면 그 차는 나를 못 본 것으로 간주한다.',
    risky_habit: '신호 대기 중 스마트폰을 보다가 신호가 바뀌자마자 고개를 들지 않고 출발하는 것.',
    location_text: '도심 사거리 횡단보도 (우회전 차로 옆)',
  },
  {
    title: '고속도로 1차선에 정차해 있던 작업 차량을 추돌',
    category: 'road',
    outcome: 'observed',
    severity: 5,
    likelihood: 2,
    situation:
      '고속도로 1차선에 도로 작업 차량이 정차해 있었다. 뒤따르던 승용차가 속도를 줄이지 못하고 그대로 추돌해 운전자가 숨졌다. 영상에서는 충돌 직전까지 제동 흔적이 거의 없었다.',
    hazard: '주행 차로 위에 정지해 있는 물체. 100km/h에서 정지 물체는 1초에 28m씩 다가온다. 3초만 전방을 안 보면 80m가 사라진다.',
    exposure: '1차선에서 정속 주행하며 시선이 바로 앞차 범퍼나 스마트폰에 고정된 상태. 야간·터널 출구·곡선 구간이면 더 심해진다.',
    avoidance:
      '1차선은 추월에만 쓰고 바로 2차선으로 복귀한다. 시선은 멀리(앞차의 앞차)까지 둔다. 전방에 비상등·사인보드·주황색 불빛이 보이면 원인을 파악하기 전에 먼저 감속하고 차로를 바꾼다. 크루즈 컨트롤 중에도 발은 브레이크 근처에 둔다.',
    risky_habit: '고속도로에서 1차선 정속 주행 + 스마트폰 흘끗 보기. "앞이 뻥 뚫려 있으니 괜찮다"는 생각.',
    location_text: '고속도로 1차선',
  },
  {
    title: '주차장에서 후진하는 차 뒤로 지나가던 아이',
    category: 'walk',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 3,
    situation:
      '마트 주차장. 후진등이 켜진 SUV 뒤로 아이가 뛰어갔고, 운전자가 급제동해 멈췄다. 차와 아이 사이는 한 뼘도 안 됐다.',
    hazard: '후진 차량의 후방 사각지대. 키가 작은 아이는 후방 카메라에도 늦게 잡힌다.',
    exposure: '후진등·후미등이 켜진 차량의 뒤쪽 2m 안을 걷거나 뛰는 상태. 보호자의 손을 놓은 상태.',
    avoidance:
      '후진등이 켜진 차 뒤로는 절대 지나가지 않고 멈춰서 기다린다. 주차장에서는 아이 손을 반드시 잡고, 차 사이를 지나갈 때는 아이를 바깥쪽이 아닌 내 안쪽에 둔다. 운전자는 후진 전에 한 바퀴 둘러보고, 후진 중 1초에 한 번 거울을 번갈아 본다.',
    risky_habit: '주차장을 "차가 느리니 안전한 곳"으로 여기고 보행자처럼 걷는 것.',
    location_text: '대형 마트 주차장',
  },
  {
    title: '소형 민간 제트기 추락, 탑승자 전원 사망',
    category: 'air',
    outcome: 'observed',
    severity: 5,
    likelihood: 1,
    situation:
      '민간 소형 제트기가 이륙 직후 추락해 탑승자 9명이 숨진 사고를 보도로 접했다. 정확한 원인은 조사 중이다. 여기서는 소형 항공기 전반에서 반복되는 구조만 적는다.',
    hazard: '소형 항공기는 대형 여객기보다 사고율이 훨씬 높다. 이착륙 단계, 기상 악화, 일정 압박("오늘 꼭 가야 한다")이 겹치면 판단이 흔들린다.',
    exposure: '체험 비행·전세기·경비행기 탑승 시 운항사와 조종사의 안전 기록을 확인하지 않은 상태. 악천후에도 출발을 요구하거나 받아들이는 상태.',
    avoidance:
      '소형기 탑승 전 운항사의 안전 기록과 정비 이력을 묻는다. 기상 때문에 출발이 취소되면 불평하지 않고 받아들인다. 조종사가 "오늘은 안 되겠다"고 말할 수 있는 분위기를 승객이 만들어 준다. 일정 압박이 느껴지면 그 자체를 위험 신호로 본다.',
    risky_habit: '"비싼 돈 냈으니", "일정이 있으니" 하는 압박으로 안전 판단을 뒤로 미루는 것. 항공뿐 아니라 운전·등산·바다에서도 같은 구조가 반복된다.',
    location_text: '소형 공항',
  },
  {
    title: '초록불 횡단보도에서 우회전 차량에 치일 뻔함',
    category: 'walk',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 4,
    situation:
      '보행 신호가 초록불이라 건너기 시작했는데 우회전하던 승용차가 멈추지 않고 들어왔다. 뒤로 물러서서 피했다.',
    hazard: '우회전 차량은 좌측(차량 흐름)을 보느라 우측 횡단보도 보행자를 늦게 본다.',
    exposure: '초록불만 믿고 차량이 멈췄는지 확인하지 않은 채 첫 발을 내딛는 상태.',
    avoidance:
      '초록불이어도 건너기 전에 우회전 차로를 먼저 본다. 첫 두 걸음은 "차가 서는 것"을 확인하며 천천히 뗀다. 야간엔 밝은 옷·반사 소재가 생존 확률을 바꾼다.',
    risky_habit: '초록불 = 안전하다는 등식. 이어폰 + 스마트폰 보며 건너기.',
    location_text: '교차로 우회전 횡단보도',
  },
  {
    title: '야간에 조명 없이 달리는 전동킥보드와 충돌 직전',
    category: 'road',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 3,
    situation:
      '밤 10시, 골목에서 큰길로 우회전하는데 검은 옷에 조명 없는 전동킥보드가 갑자기 나타났다. 급제동으로 간신히 멈췄다.',
    hazard: '조명 없고 소리도 없는 빠른 이동체. 야간 시인성이 거의 0에 가깝다.',
    exposure: '골목에서 큰길로 나갈 때 멈추지 않고 서행만 하며 합류하는 상태.',
    avoidance:
      '골목에서 큰길로 나갈 땐 "서행"이 아니라 "정지" 후 좌우를 두 번 본다. 킥보드를 탄다면 전조등·후미등은 필수, 밝은 옷을 입고 헬멧을 쓴다.',
    risky_habit: '골목길 합류 시 일시정지를 생략하는 습관.',
    location_text: '주택가 골목 → 간선도로 합류 지점',
  },
  {
    title: '욕실에서 미끄러져 넘어진 어르신',
    category: 'home',
    outcome: 'injury',
    severity: 4,
    likelihood: 3,
    situation:
      '샤워 후 물기 있는 타일 바닥에서 어머니가 미끄러져 고관절을 다쳤다. 잡을 곳이 없어 그대로 넘어졌다.',
    hazard: '젖은 타일 바닥. 고령자의 낙상은 고관절 골절 → 장기 와상으로 이어지는 경우가 많다.',
    exposure: '미끄럼 방지 매트와 손잡이가 없는 욕실을 맨발로 쓰는 상태. 밤에 불을 켜지 않고 이동하는 습관.',
    avoidance:
      '욕실 바닥에 미끄럼 방지 매트, 변기·욕조 옆에 손잡이를 설치한다(몇 만 원). 욕실 슬리퍼는 바닥이 거친 것으로 쓴다. 밤에는 센서등을 둔다.',
    risky_habit: '"우리 집에서 수십 년 살았는데 넘어질 리 없다"는 익숙함.',
    location_text: '가정 욕실',
  },
  {
    title: '가스레인지 위에 냄비 올려놓고 외출',
    category: 'home',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 2,
    situation:
      '국을 데우다 전화를 받고 그대로 나갔다. 돌아오니 냄비가 새까맣게 타 있었고 집 안이 연기로 가득했다.',
    hazard: '방치된 열원. 기름이면 발화, 물이면 과열 후 냄비 손상과 유독 가스.',
    exposure: '불을 켠 상태에서 주의가 다른 데로 옮겨가는 상태(전화·택배·아이).',
    avoidance:
      '불 위에 뭔가 있으면 집을 나서지 않는다는 규칙을 둔다. 타이머를 반드시 켠다. 가스 타이머 차단기(자동 소화 장치)를 단다. 현관을 나서기 전 "불·물·문" 세 가지를 입으로 말하며 확인한다.',
    risky_habit: '조리 중 "잠깐이면 돼"라며 자리를 비우는 것.',
    location_text: '가정 주방',
  },
  {
    title: '교량 위 블랙아이스에서 차가 미끄러짐',
    category: 'road',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 3,
    situation:
      '새벽, 기온 영상 1도. 교량에 진입하자마자 뒷바퀴가 미끄러졌다. 다행히 핸들을 급하게 꺾지 않아 차선 안에서 회복했다.',
    hazard: '블랙아이스. 교량·고가·터널 출구·그늘진 커브는 노면보다 먼저 얼고 눈으로 보이지 않는다.',
    exposure: '기온이 영상이라고 안심하고 평소 속도로 교량에 진입하는 상태.',
    avoidance:
      '겨울 새벽 기온이 3도 이하면 교량·고가·터널 출구 전에 미리 감속한다. 미끄러지면 급제동·급조향 대신 액셀에서 발을 떼고 가고 싶은 방향으로 부드럽게 핸들을 준다. 차간 거리를 평소의 두 배로.',
    risky_habit: '겨울철에도 여름 타이어로 교량을 평소 속도로 지나는 것.',
    location_text: '교량, 고가도로, 터널 출구',
  },
  {
    title: '계단을 내려가며 스마트폰을 보다 헛디딤',
    category: 'walk',
    outcome: 'near_miss',
    severity: 3,
    likelihood: 4,
    situation:
      '지하철 계단을 내려가며 메시지를 보다가 마지막 두 계단을 한 계단으로 착각했다. 난간을 잡고 있어서 넘어지지 않았다.',
    hazard: '시선이 떨어진 상태의 계단. 계단 낙상은 생각보다 자주 머리 부상으로 이어진다.',
    exposure: '계단에서 화면을 보며 손이 비어 있는 상태.',
    avoidance:
      '계단에서는 화면을 보지 않는다. 메시지는 계단 끝에서 본다. 내려갈 때 한 손은 난간에.',
    risky_habit: '"계단은 매일 다니니까 안 봐도 안다"는 자동 조종 상태.',
    location_text: '지하철 계단',
  },
  {
    title: '혼자 사다리에 올라 작업하다 사다리가 미끄러짐',
    category: 'work',
    outcome: 'injury',
    severity: 4,
    likelihood: 3,
    situation:
      '창고에서 A형 사다리 맨 위 칸에 올라 선반 정리를 하다 사다리가 옆으로 밀려 떨어졌다. 손목 골절.',
    hazard: '불안정한 높이 작업. 사다리 사고의 대부분은 2m 이하에서 일어난다.',
    exposure: '사다리 맨 위 두 칸에 서 있고, 아래에서 잡아 주는 사람이 없으며, 바닥이 고르지 않은 상태.',
    avoidance:
      '사다리 맨 위 두 칸에는 올라가지 않는다. 2인 1조로 한 명은 아래에서 잡는다. 몸을 옆으로 뻗지 말고 사다리를 옮긴다. 가능하면 사다리 대신 작업대를 쓴다.',
    risky_habit: '"잠깐이니까 혼자 해도 된다"는 판단.',
    location_text: '창고, 매장, 가정',
  },
  {
    title: '지하철 승강장 틈에 발이 빠짐',
    category: 'transit',
    outcome: 'injury',
    severity: 3,
    likelihood: 3,
    situation:
      '곡선 승강장에서 급하게 타다 열차와 승강장 사이 틈에 발이 빠져 정강이를 크게 다쳤다.',
    hazard: '곡선 승강장의 넓은 틈(10cm 이상인 곳도 있다). 뛰어 들어가는 순간 시선은 문에 가 있다.',
    exposure: '닫히는 문을 향해 뛰어 들어가는 상태.',
    avoidance:
      '"다음 열차"를 기본값으로 삼는다. 닫히는 문에는 뛰어들지 않는다. 곡선 승강장 안내 방송("발 빠짐 주의")이 나오면 발밑을 본다.',
    risky_habit: '열차 시간에 쫓겨 뛰는 습관. 2~3분을 아끼려다 몇 달을 잃는다.',
    location_text: '곡선 승강장',
  },
];

const SEED_TICKETS = [
  { caseIndex: 0, message: '대형차 옆에서는 한 걸음 뒤로. 이 한 문장이 누군가의 하루를 지키길.', pledge_krw: 5000 },
  { caseIndex: 1, message: '초보 운전자에게. 1차선은 잠깐 빌려 쓰는 차로입니다.', pledge_krw: 0 },
  { caseIndex: 2, message: '아이와 주차장을 지나는 모든 부모님께.', pledge_krw: 3000 },
  { caseIndex: 6, message: '부모님 댁 욕실에 손잡이 하나 달아 드리세요. 제가 늦게 배운 것입니다.', pledge_krw: 10000 },
];

export function seedIfEmpty(repo) {
  if (repo.stats().cases > 0) return false;
  repo.ensureVisitor(TEAM_ID, '미리봄 팀');
  const created = SEED_CASES.map((c) => repo.insertCase(validateCase(c), TEAM_ID));
  for (const t of SEED_TICKETS) {
    repo.insertTicket(created[t.caseIndex].id, TEAM_ID, { message: t.message, pledge_krw: t.pledge_krw });
    repo.addLesson(created[t.caseIndex].id, TEAM_ID);
  }
  return true;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const repo = openDb();
  const did = seedIfEmpty(repo);
  console.log(did ? `사례 ${SEED_CASES.length}건을 넣었습니다.` : '이미 데이터가 있어 건너뜁니다.');
  repo.close();
}
