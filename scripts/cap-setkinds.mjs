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
const days = [{ id:'pull', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
  name:'Pull', subtitle:'Back · Biceps', accent:'pull',
  muscle_groups:['Back','Biceps'], exercises:['Seated Low Row','Lat Pulldown Wide Grip'] }];
const past = new Date(Date.now() - 3*86400000).toISOString();
const sessions = [{ id: 's1', user_id: 'local', day: 'pull', title: null, performed_at: past }];
const logs = [{ id:'l1', session_id:'s1', exercise_name:'Seated Low Row', set_number:1, weight:32.5, reps:12, created_at: past }];
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
await p.waitForTimeout(1500);
// add two more sets on first exercise
await p.locator('text=+ Add set').first().click({force:true});
await p.waitForTimeout(250);
await p.locator('text=+ Add set').first().click({force:true});
await p.waitForTimeout(400);
// set-number buttons: first div child of each row containing an input
const numOfRow = (i) => p.locator('input').nth(i*2).locator('xpath=..').locator('div').first();
await numOfRow(0).click({force:true}); // row 1 -> W
await p.waitForTimeout(200);
await numOfRow(1).click({force:true}); // row 2 -> W
await p.waitForTimeout(200);
await numOfRow(2).click({force:true}); // row 3 -> W
await p.waitForTimeout(200);
await numOfRow(2).click({force:true}); // row 3 -> D
await p.waitForTimeout(200);
await numOfRow(2).click({force:true}); // row 3 -> F
await p.waitForTimeout(400);
await p.screenshot({path:'/downloads/NAT-37-SetKinds.png'});
// check counter: '1 sets ready' should show (2 W + 1 F with no values = 0... F empty so 0 filled)
// fill F row values to show numbering
await p.locator('input').nth(4).fill('30');
await p.locator('input').nth(5).fill('8');
await p.waitForTimeout(400);
await p.screenshot({path:'/downloads/NAT-38-SetKinds-filled.png'});
await b.close();
console.log(JSON.stringify({errors}));
