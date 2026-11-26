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
    localStorage.setItem('ironlog.profile.v1:local', JSON.stringify({firstName:'Hassan', displayName:'Hassan', age:'21', weight:'78', height:'181'}));
  } catch {}
});
const now = Date.now();
const sessions = [
  { id: 's1', user_id: 'local', day: 'push', title: null, performed_at: new Date(now - 86400000).toISOString() },
  { id: 's3', user_id: 'local', day: 'push', title: null, performed_at: new Date(now - 7*86400000).toISOString() },
];
const logs = [
  { id:'l1', session_id:'s1', exercise_name:'Incline DB Press', set_number:1, weight:30, reps:10 },
  { id:'l2', session_id:'s1', exercise_name:'Incline DB Press', set_number:2, weight:32.5, reps:8 },
  { id:'l3', session_id:'s1', exercise_name:'DB Lateral Raise', set_number:1, weight:12, reps:14 },
  { id:'l7', session_id:'s3', exercise_name:'Incline DB Press', set_number:1, weight:27.5, reps:10 },
];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
p.setDefaultTimeout(8000);
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) body = [];
  else if (url.includes('workout_sessions')) body = sessions;
  else if (url.includes('set_logs')) body = logs;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'load'});
await p.waitForTimeout(3200);
await p.locator('text=History').first().click({force:true});
await p.waitForTimeout(2200);
await p.screenshot({path:'/downloads/NAT-91-HistoryPR.png'});
await p.close(); await c.close(); await b.close();
console.log(JSON.stringify({errors: errors.slice(0,3)}));
