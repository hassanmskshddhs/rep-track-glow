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
  name:'Push', subtitle:'x', accent:'push', muscle_groups:['Chest'], exercises:['Incline DB Press','Shoulder Press'] }];
const past = new Date(Date.now() - 4*86400000).toISOString();
const logs = [
  { id:'l1', session_id:'s1', user_id:'local', exercise_name:'Incline DB Press', set_number:1, weight:30, reps:12, created_at: past },
];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  const method = route.request().method();
  let body = [];
  if (method === 'POST' && url.includes('workout_sessions')) body = [{ id:'s2', user_id:'local', day_id:'push', day_name:'Push', started_at:past, ended_at:past, created_at:past }];
  else if (method === 'POST' && url.includes('set_logs')) body = [];
  else if (url.includes('custom_workout_days')) body = days;
  else if (url.includes('set_logs')) body = logs;
  route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=/^Open /', {timeout: 20000});
await p.locator('text=/^Open /').first().click({force:true});
await p.waitForTimeout(1800);
// Fill first two sets of first exercise: weight then reps (placeholders are "—")
const inputs = p.locator('input[placeholder="—"]');
await inputs.nth(0).fill('32.5');
await inputs.nth(1).fill('10');
await inputs.nth(2).fill('32.5');
await inputs.nth(3).fill('9');
await p.waitForTimeout(400);
await p.locator('text=Review session').click({force:true});
await p.waitForTimeout(600);
await p.locator('text=Save workout').click({force:true});
await p.waitForTimeout(1500);
await p.screenshot({path:'/downloads/NAT-63-ShareCard.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
