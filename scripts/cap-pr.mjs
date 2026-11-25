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
const past = new Date(Date.now() - 3*86400000).toISOString();
const sessions = [{ id: 's1', user_id: 'local', day: 'push', title: null, performed_at: past }];
const logs = [
  { id:'l1', session_id:'s1', exercise_name:'Seated Low Row', set_number:1, weight:30, reps:10, created_at: past },
  { id:'l2', session_id:'s1', exercise_name:'Seated Low Row', set_number:2, weight:30, reps:8, created_at: past },
];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const req = route.request();
  const url = req.url();
  if (req.method() !== 'GET') return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
  let body = [];
  if (url.includes('custom_workout_days')) body = [];
  else if (url.includes('workout_sessions')) body = sessions;
  else if (url.includes('set_logs')) body = logs;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=/^Open /', {timeout: 20000});
await p.locator('text=/^Open /').first().click({force:true});
await p.waitForTimeout(1500);
await p.locator('input').nth(0).fill('35');
await p.locator('input').nth(1).fill('10');
await p.locator('text=+ Add set').first().click({force:true});
await p.waitForTimeout(300);
await p.locator('input').nth(2).fill('35');
await p.locator('input').nth(3).fill('8');
await p.locator('text=Review session').click({force:true});
await p.waitForTimeout(800);
await p.locator('text=/^(Save|Save workout)$/').last().click({force:true});
await p.waitForTimeout(2000);
await p.screenshot({path:'/downloads/NAT-43-PR-modal.png'});
await b.close();
console.log(JSON.stringify({errors}));
