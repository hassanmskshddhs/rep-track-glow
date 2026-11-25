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
const day = 86400000;
const sessions = [];
const logs = [];
let lid = 0;
// 3 weeks of sessions, 3x/week, weights trending up
for (let i = 21; i >= 0; i--) {
  const d = new Date(now - i * day);
  if (d.getDay() % 2 === 0) continue; // every other day
  const sid = 's' + i;
  sessions.push({ id: sid, user_id: 'local', day: 'push', title: null, performed_at: d.toISOString() });
  const base = 20 + (21 - i) * 0.8;
  for (const [ex, mult] of [['Incline DB Press', 1], ['DB Lateral Raise', 0.45], ['Cable Extension', 0.6]]) {
    for (let s = 1; s <= 3; s++) {
      logs.push({ id: 'l' + (lid++), session_id: sid, exercise_name: ex, set_number: s,
        weight: Math.round(base * mult * 2) / 2, reps: 12 - s, created_at: d.toISOString() });
    }
  }
}

const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) body = [];
  else if (url.includes('workout_sessions')) body = [...sessions].reverse();
  else if (url.includes('set_logs')) body = logs;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(1800);
await p.locator('text=Progress').first().click();
await p.waitForTimeout(1800);
await p.screenshot({path:'/downloads/NAT-12-Progress.png', fullPage:false});
await p.evaluate(() => window.scrollTo(0, 900));
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-13-Progress-scrolled.png'});
await p.close(); await c.close(); await b.close();
console.log(JSON.stringify({errors}));
