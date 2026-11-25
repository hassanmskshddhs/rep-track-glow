import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
const c = await b.newContext({viewport:{width:390,height:844}});
await c.addInitScript(() => {
  try {
    localStorage.setItem('sb-oeqwcpnfndatxrmmemyw-auth-token', JSON.stringify({
      access_token: 'fake', refresh_token: 'fake', expires_at: 4102444800,
      token_type: 'bearer', user: { id: 'local', email: 'hassan@example.com', aud: 'authenticated' }
    }));
  } catch {}
});

const days = [
  { id: 'push', user_id: 'local', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    name: 'Push', subtitle: 'Chest · Shoulders · Triceps', accent: 'push',
    muscle_groups: ['Chest','Shoulders','Triceps'],
    exercises: ['Incline DB Press','Bar Flat Machine Press','Decline Machine Fly (Panatta)','DB Lateral Raise','Front Rope Raise','Cable Extension','V-Grip Overhead Extension'] },
  { id: 'pull', user_id: 'local', created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    name: 'Pull', subtitle: 'Back · Biceps · Rear Delts', accent: 'pull',
    muscle_groups: ['Back','Biceps','Shoulders'],
    exercises: ['Seated Low Row','Lat Pulldown Wide Grip','Straight Arm Pulldown','Cable Face-away Curl','DB Hammer Curl','Reverse Pec Fly','Back Extension'] },
  { id: 'legs', user_id: 'local', created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z',
    name: 'Legs + Abs', subtitle: 'Quads · Hams · Calves · Core', accent: 'legs',
    muscle_groups: ['Quads','Hamstrings','Glutes','Calves','Core'],
    exercises: ['Leg Extension','Super Hack Squat','Seated Leg Curl','Adduction','Abduction','Standing Calf Raise Machine','Hanging Leg Raise','Abdominal Machine','Plank'] },
];

const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) body = days;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(1800);
await p.locator('text=Plan').first().click();
await p.waitForTimeout(1500);
await p.screenshot({path:'/downloads/NAT-15-Plan.png'});
// week schedule picker
await p.locator('[aria-label="Mon routine"]').click();
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-16-Plan-picker.png'});
await p.locator('text=Push').first().click({force:true});
await p.waitForTimeout(400);
// open a menu
await p.locator('[aria-label="More options for Push"]').click({force:true});
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-17-Plan-menu.png'});
await b.close();
console.log(JSON.stringify({errors}));
