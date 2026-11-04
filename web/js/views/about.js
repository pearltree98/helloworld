import { h, clear } from '../ui.js';
import { locale } from '../i18n.js';

const en = `
<section class="hero">
  <h1>Why Stepback</h1>
  <p>None of us decides when we leave this world. But stepping back from an avoidable hazard is something we can do today.</p>
</section>

<blockquote>Nothing happening is the biggest win.<br>
Even when the other person made the mistake, getting out of the way and having nothing happen beats an insurance claim or an excuse to rest. Every time.</blockquote>

<h2>Three words</h2>
<table>
  <tr><th>Hazard</th><td>The <b>source</b> of potential harm. A truck's right-side blind spot, a wet tile floor, a stopped vehicle in a live lane.</td></tr>
  <tr><th>Exposure</th><td>The <b>state</b> that puts you in its path. Standing within 1 m of the truck's side; glancing at your phone in the fast lane.</td></tr>
  <tr><th>Risk</th><td>Severity × likelihood. You rarely get to remove the hazard, but <b>breaking the exposure</b> is a choice you can make. That is why the key field in every case is "Avoidance".</td></tr>
</table>

<h2>Economics: a structure where everyone ends up better off</h2>
<p>In some cafés there are vouchers pinned to the wall. A customer pays a little extra and a voucher goes up; a student takes one down and eats for free. The owner gets business, the giver gets joy, the student gets a meal. Nobody loses and everybody gains a little: a <b>positive-sum</b> structure. Naples' <i>caffè sospeso</i> and Korea's "Mirinae" shops run on the same principle.</p>
<div class="loop">
  <div><b>The recorder</b>Your close call becomes a case. You can see how many people took the lesson.</div>
  <div><b>The giver</b>"This lesson protected me." You pin a ticket with a note for the next person, and can pledge to a safety fund.</div>
  <div><b>The taker</b>You take a ticket off the wall and the lesson is yours, along with a note someone left for you.</div>
  <div><b>The community</b>Pledges go back out as "avoiding tools": reflective strips, bathroom grab bars, rear warning lights.</div>
</div>
<p>It matters that a ticket is one-time. A "like" copies forever and hands nothing to anyone. A ticket can be taken by exactly one person, and once it is gone you feel like pinning one for the next person. That small device is what creates <b>reciprocity</b>.</p>

<h2>Sociology: a no-blame reporting culture</h2>
<p>Aviation cut its accident rate dramatically. One reason is <b>confidential, non-punitive near-miss reporting</b>. A pilot can report "I nearly entered the wrong runway today" without punishment, so reports pile up, and piled-up reports change the system. Heinrich's ratio (1 serious injury : 29 minor : 300 near misses) says the same thing: to prevent the big one, collect the near misses.</p>
<p>So Stepback <b>does not blame</b>. You never have to name the driver, the victim or the place. We record structures, not people. "That driver was reckless" protects nobody. "Next to a turning truck, take one step back" protects someone.</p>
<p>The other lever is <b>social proof</b>. "17 people have taken this lesson" makes the norm visible, so the safe move reads as "normal" instead of "fussy".</p>

<h2>Marketing: what spreads is an action, not fear</h2>
<p>Crash footage spreads as fear, and fear does not change behaviour. Stepback's unit of sharing is <b>one sentence of avoiding action</b>. One card, one sentence, one link. It travels only if the reader can do it tomorrow.</p>

<h2>What you can do right now</h2>
<ol>
  <li>Read one case and press "I take this lesson".</li>
  <li>If a lesson has protected you, pin a ticket on the wall.</li>
  <li>If you have had a close call, record it. Three fields are enough: the source, the state, the avoiding action.</li>
</ol>
`;

const ko = `
<section class="hero">
  <h1>왜 Stepback인가</h1>
  <p>사람이 세상을 떠나는 때는 우리가 정하지 못합니다. 그러나 피할 수 있는 위험 앞에서 한 걸음 물러서는 일은 오늘 우리가 할 수 있습니다.</p>
</section>

<blockquote>아무 일도 일어나지 않은 것이 가장 큰 승리입니다.<br>
상대가 실수했더라도, 내가 피해서 아무 일이 없는 편이 — 보험 처리나 쉴 명분보다 — 언제나 낫습니다.</blockquote>

<h2>세 가지 용어</h2>
<table>
  <tr><th>위해 요인 (Hazard)</th><td>해를 끼칠 수 있는 <b>원천</b>. 대형 트럭의 우측 사각지대, 젖은 타일 바닥, 주행 차로 위의 정지 물체.</td></tr>
  <tr><th>노출 상태 (Exposure)</th><td>그 원천 앞에 내가 놓이게 되는 <b>상태</b>. 트럭 우측 1m 안에 서 있음, 1차선에서 스마트폰을 흘끗 봄.</td></tr>
  <tr><th>위험도 (Risk)</th><td>심각도 × 가능성. 위해 요인은 없애기 어렵지만, <b>노출을 끊는 행동</b>은 내가 고를 수 있습니다. 그래서 모든 사례의 핵심 칸은 "피하는 행동"입니다.</td></tr>
</table>

<h2>경제학: 서로를 윤택하게 하는 구조</h2>
<p>어떤 식당 벽에는 식권이 붙어 있습니다. 어른이 식사하며 자발적으로 조금 더 내면 식권이 벽에 붙고, 학생이 그걸 떼어 가면 무료로 먹습니다. 사장은 장사가 되고, 낸 사람은 기쁘고, 아이는 배부릅니다. 누구도 손해 보지 않고 모두가 조금씩 나아지는 <b>포지티브섬</b> 구조입니다. 나폴리의 카페 소스페소, 한국의 '미리내 가게' 운동도 같은 원리입니다.</p>
<div class="loop">
  <div><b>기록하는 사람</b>내 아찔했던 순간이 사례가 됩니다. 몇 명이 교훈을 받았는지 보입니다.</div>
  <div><b>티켓을 붙이는 사람</b>"이 교훈이 나를 지켰다"는 감사를 티켓으로 벽에 붙입니다. 안전 기금을 약정할 수도 있습니다.</div>
  <div><b>티켓을 받는 사람</b>벽에서 티켓 한 장을 가져가며 교훈을 받습니다. 누군가 나를 위해 남긴 한마디가 같이 옵니다.</div>
  <div><b>공동체</b>약정된 기금은 반사띠·욕실 손잡이·후방 경고등처럼 "피하는 도구"로 돌아갑니다.</div>
</div>
<p>티켓이 벽에서 사라지는 1회성이라는 점이 중요합니다. 무한히 복사되는 '좋아요'와 달리, 한 장을 가져가면 다음 사람을 위해 다시 붙이고 싶어집니다. 이것이 <b>호혜</b>를 만드는 작은 장치입니다.</p>

<h2>사회학: 탓하지 않는 보고 문화</h2>
<p>항공 산업은 사고율을 극적으로 낮췄습니다. 비결 중 하나는 <b>비처벌·익명 아차 사고 보고 제도</b>입니다. 조종사가 "오늘 활주로를 잘못 들어갈 뻔했다"고 보고해도 처벌받지 않기 때문에 보고가 쌓이고, 쌓인 보고가 구조를 바꿉니다. 하인리히 법칙(중상 1 : 경상 29 : 아차 300)이 말하듯, 큰 사고를 줄이려면 아차 사고를 모아야 합니다.</p>
<p>그래서 Stepback은 <b>탓하지 않습니다</b>. 가해자·피해자·장소를 특정하지 않아도 됩니다. 우리가 기록하는 것은 사람이 아니라 구조입니다. "그 운전자가 나빴다"는 아무도 지키지 못하지만, "우회전 대형차 옆에서는 한 걸음 물러선다"는 누군가를 지킵니다.</p>
<p>또 하나는 <b>사회적 증거</b>입니다. "17명이 이 교훈을 받았습니다"라는 숫자는 규범을 눈에 보이게 만듭니다. 안전한 행동이 '유난'이 아니라 '보통'이 되도록.</p>

<h2>마케팅: 공유되는 것은 공포가 아니라 행동</h2>
<p>사고 영상은 공포로 퍼지지만 공포는 행동을 바꾸지 못합니다. 공유 단위는 <b>"피하는 행동 한 문장"</b>입니다. 카드 하나, 문장 하나, 링크 하나. 받는 사람이 내일 당장 할 수 있는 것이어야 전달됩니다.</p>

<h2>지금 할 수 있는 것</h2>
<ol>
  <li>사례를 하나 읽고 "이 교훈을 받습니다"를 누릅니다.</li>
  <li>나를 지켜 준 교훈이 있다면 티켓 한 장을 벽에 붙입니다.</li>
  <li>아찔했던 순간이 있다면 기록합니다. 세 칸만 채우면 됩니다: 원천, 상태, 피하는 행동.</li>
</ol>
`;

const PAGES = { en, ko };

export function aboutView(root) {
  clear(root).append(h('article', { class: 'prose', html: PAGES[locale] ?? en }));
}
