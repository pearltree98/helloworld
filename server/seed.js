/**
 * Starter cases. Each is written as a general pattern learned from real events,
 * without naming victims or places. (Principle: no blame. We record the structure that protects people.)
 */
import { openDb } from './db.js';
import { validateCase } from './domain/validate.js';

const TEAM_ID = 'stepback-team';

export const SEED_CASES = [
  {
    title: 'Pedestrian standing beside a large truck turning right at an intersection',
    category: 'road',
    outcome: 'observed',
    severity: 5,
    likelihood: 3,
    situation:
      'A city crosswalk. The moment the pedestrian signal changed, a heavy truck began its right turn. A pedestrian waiting at the curb, right beside the truck\'s passenger side, was pulled under the rear wheels. The driver never saw them. (Footage of a fatal crash.)',
    hazard: 'The passenger-side blind spot of a large vehicle, plus off-tracking: the rear wheels cut inside the path of the front wheels on a turn. From the cab, the area low and to the right is nearly invisible.',
    exposure: 'Standing at the very edge of the curb within about 1 m of the truck\'s side, poised to step off the moment the light changes.',
    avoidance:
      'When a large vehicle beside you has its indicator on, take one step back and wait until it has fully passed. Even on a green signal, cross only after you have seen the vehicle stop. If you have not made eye contact with the driver, assume the driver has not seen you.',
    risky_habit: 'Looking at your phone while waiting, then stepping off the instant the signal changes without looking up.',
    location_text: 'Urban intersection, crosswalk next to a right-turn lane',
  },
  {
    title: 'Rear-ending a maintenance vehicle stopped in the fast lane of a highway',
    category: 'road',
    outcome: 'observed',
    severity: 5,
    likelihood: 2,
    situation:
      'A road-maintenance vehicle was stopped in the left-hand lane of a highway. A following car did not slow down and struck it at speed; the driver died. The footage shows almost no braking before impact.',
    hazard: 'A stationary object in a live traffic lane. At 100 km/h (62 mph) a stopped object closes at 28 m per second. Three seconds of not looking ahead erases 80 m.',
    exposure: 'Cruising in the fast lane with your eyes locked on the bumper ahead, or on a phone. Night, tunnel exits and curves make it worse.',
    avoidance:
      'Use the fast lane only to pass, then move back. Look far ahead, past the car in front. If you see hazard lights, an arrow board or amber lights ahead, slow down and change lanes before you work out what it is. Keep a foot near the brake even with cruise control on.',
    risky_habit: 'Sitting in the fast lane at a steady speed and glancing at your phone, because "the road ahead looks clear".',
    location_text: 'Highway, left-hand lane',
  },
  {
    title: 'A child running behind a reversing car in a parking lot',
    category: 'walk',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 3,
    situation:
      'Supermarket parking lot. A child ran behind an SUV whose reversing lights were on. The driver slammed the brakes and stopped with a hand\'s width to spare.',
    hazard: 'The rear blind zone of a reversing vehicle. A small child appears late even on a backup camera.',
    exposure: 'Walking or running within 2 m behind a vehicle whose reversing or brake lights are on. A child not holding an adult\'s hand.',
    avoidance:
      'Never walk behind a car with its reversing lights on; stop and wait. Hold children\'s hands in parking lots and keep them on your inside, away from traffic. Drivers: walk around the car before reversing, and alternate mirrors every second while backing up.',
    risky_habit: 'Treating a parking lot as a "slow, safe place" and walking through it like a sidewalk.',
    location_text: 'Large retail parking lot',
  },
  {
    title: 'Small private jet crashes after takeoff, everyone on board killed',
    category: 'air',
    outcome: 'observed',
    severity: 5,
    likelihood: 1,
    situation:
      'A small private jet crashed shortly after takeoff, killing all nine people on board. The exact cause is under investigation. What is recorded here is the pattern that repeats across general aviation.',
    hazard: 'Small aircraft have a far higher accident rate than airliners. Takeoff and landing phases, deteriorating weather and schedule pressure ("we have to get there today") stack up and distort judgment.',
    exposure: 'Boarding a charter, sightseeing or light aircraft without asking about the operator\'s and pilot\'s safety record. Pressing for departure, or accepting departure, in bad weather.',
    avoidance:
      'Before a small-aircraft flight, ask about the operator\'s safety record and maintenance history. When weather cancels a flight, accept it without complaint. As a passenger, make it easy for the pilot to say "not today". Treat the feeling of schedule pressure itself as a warning sign.',
    risky_habit: 'Letting "we paid for this" or "we have a schedule" push a safety decision later. The same structure shows up in driving, hiking and boating.',
    location_text: 'Small airfield',
  },
  {
    title: 'Nearly hit by a right-turning car while crossing on a green signal',
    category: 'walk',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 4,
    situation:
      'The pedestrian signal was green so I started crossing. A car turning right did not stop and came into the crosswalk. I stepped back and it missed me.',
    hazard: 'A turning driver is watching the traffic they are merging into and sees the pedestrian on their other side late.',
    exposure: 'Trusting the green signal and taking the first step without checking whether cars have actually stopped.',
    avoidance:
      'Even on green, look at the turn lane before stepping off. Take the first two steps slowly while confirming the car is stopping. At night, light clothing or a reflective strip changes your odds of survival.',
    risky_habit: 'Equating "green" with "safe". Crossing with earphones in and eyes on the phone.',
    location_text: 'Intersection crosswalk beside a turn lane',
  },
  {
    title: 'An unlit e-scooter appears out of the dark',
    category: 'road',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 3,
    situation:
      '10 pm, turning from a side street onto a main road. An e-scooter rider in dark clothing with no lights appeared out of nowhere. I stopped just in time.',
    hazard: 'A fast, silent, unlit vehicle. At night its visibility is close to zero.',
    exposure: 'Rolling from a side street into a main road while only slowing down, not stopping.',
    avoidance:
      'When joining a main road from a side street, come to a full stop and look both ways twice, not a rolling slow-down. If you ride a scooter: front and rear lights are non-negotiable, wear bright clothing and a helmet.',
    risky_habit: 'Skipping the full stop when merging from a side street.',
    location_text: 'Residential side street joining an arterial road',
  },
  {
    title: 'An elderly parent slips in the bathroom',
    category: 'home',
    outcome: 'injury',
    severity: 4,
    likelihood: 3,
    situation:
      'After a shower my mother slipped on the wet tile floor and fractured her hip. There was nothing to grab, so she went straight down.',
    hazard: 'Wet tile. For older adults, a fall often means a hip fracture, which often means months in bed.',
    exposure: 'Using a bathroom with no non-slip mat and no grab bars, barefoot. Moving around at night without turning on a light.',
    avoidance:
      'Put a non-slip mat on the bathroom floor and grab bars beside the toilet and tub (a few dollars each). Use bathroom slippers with rough soles. Install a motion-sensor night light.',
    risky_habit: '"I have lived in this house for decades, I will not fall" — the familiarity that hides the hazard.',
    location_text: 'Home bathroom',
  },
  {
    title: 'Leaving the house with a pot on the stove',
    category: 'home',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 2,
    situation:
      'I was heating soup, took a phone call and walked out. When I came back the pot was scorched black and the apartment was full of smoke.',
    hazard: 'An unattended heat source. Oil ignites; water boils off and the pot overheats and gives off toxic fumes.',
    exposure: 'Having a burner on while your attention moves elsewhere: a call, a delivery, a child.',
    avoidance:
      'Make it a rule: nothing on the stove when you leave the house. Always set a timer. Fit an automatic stove shut-off. Before stepping out the door, say "stove, water, door" out loud and check each one.',
    risky_habit: '"It will only take a second" while something is cooking.',
    location_text: 'Home kitchen',
  },
  {
    title: 'Car slides on black ice on a bridge',
    category: 'road',
    outcome: 'near_miss',
    severity: 4,
    likelihood: 3,
    situation:
      'Early morning, air temperature just above freezing. The rear wheels slid the moment I drove onto a bridge. I did not yank the wheel, so the car recovered within the lane.',
    hazard: 'Black ice. Bridges, overpasses, tunnel exits and shaded curves freeze before the rest of the road, and you cannot see it.',
    exposure: 'Driving onto a bridge at normal speed because the thermometer says it is above freezing.',
    avoidance:
      'On winter mornings below about 3 °C (37 °F), slow down before bridges, overpasses and tunnel exits. If you slide, do not brake or steer hard: ease off the accelerator and steer gently where you want to go. Double your following distance.',
    risky_habit: 'Crossing bridges at summer speed on summer tires in winter.',
    location_text: 'Bridges, overpasses, tunnel exits',
  },
  {
    title: 'Missing a step on the stairs while reading a message',
    category: 'walk',
    outcome: 'near_miss',
    severity: 3,
    likelihood: 4,
    situation:
      'Walking down the subway stairs while reading a message, I mistook the last two steps for one. I was holding the handrail, so I did not fall.',
    hazard: 'Stairs with your eyes down. Stair falls turn into head injuries more often than people expect.',
    exposure: 'Looking at a screen on the stairs with both hands busy.',
    avoidance: 'No screen on the stairs. Read the message at the bottom. One hand on the rail on the way down.',
    risky_habit: '"I take these stairs every day, I do not need to look" — autopilot.',
    location_text: 'Subway or office stairs',
  },
  {
    title: 'Working alone on a ladder when it slides out',
    category: 'work',
    outcome: 'injury',
    severity: 4,
    likelihood: 3,
    situation:
      'In a storeroom I stood on the top rung of a step ladder to tidy a shelf. The ladder slid sideways and I fell. Fractured wrist.',
    hazard: 'Unstable work at height. Most ladder injuries happen below 2 m.',
    exposure: 'Standing on the top two rungs, nobody footing the ladder, uneven floor.',
    avoidance:
      'Never stand on the top two rungs. Work in pairs with one person footing the ladder. Move the ladder instead of leaning sideways. Use a work platform instead of a ladder where you can.',
    risky_habit: '"It will only take a minute, I can do it alone."',
    location_text: 'Storeroom, shop, home',
  },
  {
    title: 'Foot slips into the gap between train and platform',
    category: 'transit',
    outcome: 'injury',
    severity: 3,
    likelihood: 3,
    situation:
      'Rushing onto a train at a curved platform, my foot went into the gap between the train and the platform edge and I badly gashed my shin.',
    hazard: 'The wide gap at curved platforms, sometimes over 10 cm (4 in). When you run for the door, your eyes are on the door.',
    exposure: 'Running toward closing doors.',
    avoidance:
      'Make "the next train" your default. Never run for closing doors. When you hear "mind the gap", actually look down at the gap.',
    risky_habit: 'Running because you are late. Trying to save two minutes and losing months.',
    location_text: 'Curved platform',
  },
];

const SEED_TICKETS = [
  { caseIndex: 0, message: 'Next to a big truck, one step back. May this one sentence protect someone\'s day.', pledge_amount: 5 },
  { caseIndex: 1, message: 'To every new driver: the fast lane is borrowed, not owned.', pledge_amount: 0 },
  { caseIndex: 2, message: 'For every parent walking a child through a parking lot.', pledge_amount: 3 },
  { caseIndex: 6, message: 'Put a grab bar in your parents\' bathroom. I learned this too late.', pledge_amount: 10 },
];

export function seedIfEmpty(repo) {
  if (repo.stats().cases > 0) return false;
  repo.ensureVisitor(TEAM_ID, 'Stepback team');
  const created = SEED_CASES.map((c) => repo.insertCase(validateCase(c), TEAM_ID));
  for (const t of SEED_TICKETS) {
    repo.insertTicket(created[t.caseIndex].id, TEAM_ID, { message: t.message, pledge_amount: t.pledge_amount });
    repo.addLesson(created[t.caseIndex].id, TEAM_ID);
  }
  return true;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const repo = openDb();
  const did = seedIfEmpty(repo);
  console.log(did ? `Seeded ${SEED_CASES.length} cases.` : 'Database already has data; skipping.');
  repo.close();
}
