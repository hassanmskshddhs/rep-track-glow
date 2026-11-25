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

const now = Date.now();
const sessions = [
  { id: 's1', user_id: 'local', day: 'push', title: null, performed_at: new Date(now - 86400000).toISOString() },
  { id: 's2', user_id: 'local', day: 'pull', title: 'Evening pull', performed_at: new Date(now - 3*86400000).toISOString() },
  { id: 's3', user_id: 'local', day: 'push', title: null, performed_at: new Date(now - 7*86400000).toISOString() },
];
const logs = [
  { id:'l1', session_id:'s1', exercise_name:'Incline DB Press', set_number:1, weight:30, reps:10 },
  { id:'l2', session_id:'s1', exercise_name:'Incline DB Press', set_number:2, weight:32.5, reps:8 },
  { id:'l3', session_id:'s1', exercise_name:'DB Lateral Raise', set_number:1, weight:12, reps:14 },
  { id:'l4', session_id:'s1', exercise_name:'DB Lateral Raise', set_number:2, weight:12, reps:12 },
  { id:'l5', session_id:'s2', exercise_name:'Lat Pulldown Wide Grip', set_number:1, weight:60, reps:10 },
  { id:'l6', session_id:'s2', exercise_name:'DB Hammer Curl', set_number:1, weight:14, reps:10 },
  { id:'l7', session_id:'s3', exercise_name:'Incline DB Press', set_number:1, weight:27.5, reps:10 },
];

const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) body = [];
  else if (url.includes('workout_sessions')) body = sessions;
  else if (url.includes('set_logs')) body = logs;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(1800);
// tap History tab
await p.getByText('History', {exact:true}).first().click().catch(async () => {
  await p.locator('text=History').first().click();
});
await p.waitForTimeout(1500);
await p.screenshot({path:'/downloads/NAT-9-History.png', fullPage:false});
await p.evaluate(() => window.scrollTo(0, 800));
await p.waitForTimeout(400);
await p.screenshot({path:'/downloads/NAT-10-History-scrolled.png'});
// rename modal
await p.locator('[aria-label="Rename session"]').first().click();
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-11-History-rename.png'});
await p.close(); await c.close(); await b.close();
console.log(JSON.stringify({errors}));
