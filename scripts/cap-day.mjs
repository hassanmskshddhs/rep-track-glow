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
    exercises: ['Incline DB Press','DB Lateral Raise','Cable Extension'] },
];
const past = new Date(Date.now() - 3*86400000).toISOString();
const sessions = [{ id: 's1', user_id: 'local', day: 'push', title: null, performed_at: past }];
const logs = [
  { id:'l1', session_id:'s1', exercise_name:'Incline DB Press', set_number:1, weight:30, reps:12, created_at: past },
  { id:'l2', session_id:'s1', exercise_name:'Incline DB Press', set_number:2, weight:30, reps:12, created_at: past },
  { id:'l3', session_id:'s1', exercise_name:'DB Lateral Raise', set_number:1, weight:10, reps:10, created_at: past },
];
const notes = [{ exercise_name: 'Incline DB Press', note: 'slow eccentric on last set' }];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) body = days;
  else if (url.includes('workout_sessions')) body = sessions;
  else if (url.includes('set_logs')) body = logs;
  else if (url.includes('exercise_notes')) body = notes;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(1800);
await p.locator('text=Push').first().click({force:true});
await p.waitForTimeout(1800);
await p.screenshot({path:'/downloads/NAT-22-Day.png'});
// fill a set to trigger PR badge (best was 30, enter 32.5)
await p.locator('input').nth(0).fill('32.5');
await p.locator('input').nth(1).fill('12');
await p.waitForTimeout(600);
await p.screenshot({path:'/downloads/NAT-23-Day-PR.png'});
// exercise menu
await p.locator('text=⋯').nth(1).click({force:true});
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-24-Day-menu.png'});
await b.close();
console.log(JSON.stringify({errors}));
