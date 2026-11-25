import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
const c = await b.newContext({viewport:{width:390,height:844}});
await c.addInitScript(() => {
  try {
    localStorage.setItem('sb-oeqwcpnfndatxrmmemyw-auth-token', JSON.stringify({
      access_token: 'fake', refresh_token: 'fake', expires_at: 4102444800,
      token_type: 'bearer', user: { id: 'local', email: 'hassan@example.com', aud: 'authenticated' }
    }));
    localStorage.setItem('ironlog:onboarded:local', '1');
  } catch {}
});
const days = [{ id:'push', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
  name:'Push', subtitle:'Chest · Shoulders · Triceps', accent:'push',
  muscle_groups:['Chest','Shoulders','Triceps'], exercises:['Incline DB Press','DB Lateral Raise'] }];
const past = new Date(Date.now() - 4*86400000).toISOString();
const sessions = [];
const logs = [
  { id:'l1', session_id:'s1', user_id:'local', exercise_name:'Incline DB Press', set_number:1, weight:30, reps:12, created_at: past },
  { id:'l2', session_id:'s1', user_id:'local', exercise_name:'Incline DB Press', set_number:2, weight:30, reps:12, created_at: past },
  { id:'l3', session_id:'s1', user_id:'local', exercise_name:'Incline DB Press', set_number:3, weight:30, reps:12, created_at: past },
  { id:'l4', session_id:'s1', user_id:'local', exercise_name:'DB Lateral Raise', set_number:1, weight:15, reps:10, created_at: past },
  { id:'l5', session_id:'s1', user_id:'local', exercise_name:'DB Lateral Raise', set_number:2, weight:15, reps:9, created_at: past },
  { id:'l6', session_id:'s1', user_id:'local', exercise_name:'DB Lateral Raise', set_number:3, weight:15, reps:8, created_at: past },
];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) body = days;
  else if (url.includes('workout_sessions')) body = sessions;
  else if (url.includes('set_logs')) body = logs;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=/^Open /', {timeout: 20000});
await p.locator('text=/^Open /').first().click({force:true});
await p.waitForTimeout(2000);
await p.screenshot({path:'/downloads/NAT-53-CoachCall.png'});
// tap Savage intensity
await p.locator('text=Savage').first().click({force:true});
await p.waitForTimeout(600);
await p.screenshot({path:'/downloads/NAT-54-CoachCall-savage.png'});
// tap the apply button
await p.locator('text=/^Use /').first().click({force:true});
await p.waitForTimeout(600);
await p.screenshot({path:'/downloads/NAT-55-CoachCall-applied.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
