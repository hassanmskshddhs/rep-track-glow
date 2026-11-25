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
const d = (n) => new Date(Date.now() - n*86400000).toISOString();
const sessions = [
  { id:'s1', user_id:'local', day:'push', title:null, performed_at:d(14) },
  { id:'s2', user_id:'local', day:'push', title:null, performed_at:d(7) },
  { id:'s3', user_id:'local', day:'push', title:'Heavy Push', performed_at:d(2) },
];
const logs = [
  { id:'l1', session_id:'s1', user_id:'local', exercise_name:'Incline DB Press', set_number:1, weight:26, reps:10, created_at:d(14) },
  { id:'l2', session_id:'s2', user_id:'local', exercise_name:'Incline DB Press', set_number:1, weight:28, reps:10, created_at:d(7) },
  { id:'l3', session_id:'s3', user_id:'local', exercise_name:'Incline DB Press', set_number:1, weight:30, reps:12, created_at:d(2) },
  { id:'l4', session_id:'s3', user_id:'local', exercise_name:'DB Lateral Raise', set_number:1, weight:15, reps:12, created_at:d(2) },
  { id:'l5', session_id:'s2', user_id:'local', exercise_name:'DB Lateral Raise', set_number:1, weight:12.5, reps:12, created_at:d(7) },
];
const days = [{ id:'push', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
  name:'Push', subtitle:'x', accent:'push', muscle_groups:['Chest'], exercises:['Incline DB Press'] }];
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
await p.locator('text=Settings').last().click({force:true});
await p.waitForTimeout(1200);
await p.locator('text=Export history (CSV)').scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await p.screenshot({path:'/downloads/NAT-60-Settings-export.png'});
await p.locator('text=Progress').last().click({force:true});
await p.waitForTimeout(1800);
await p.locator('text=PR Board').scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await p.screenshot({path:'/downloads/NAT-61-PR-board.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
