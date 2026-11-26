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
const daysAgo = (n) => new Date(Date.now() - n*86400000).toISOString();
const sessionDays = [40, 36, 33, 29, 26, 22, 19, 12, 5, 2];
const sessions = sessionDays.map((d, i) => ({ id: 's'+(i+1), performed_at: daysAgo(d) }));
const logs = [];
let lid = 0;
sessionDays.forEach((d, i) => {
  const wk = 55 + i*2.5, bp = 60 + i*1.25;
  [['Barbell Back Squat', wk, 8], ['Barbell Back Squat', wk, 7], ['Barbell Bench Press', bp, 10], ['Barbell Bench Press', bp, 9]]
    .forEach(([ex, w, r], si) => logs.push({ id: 'l'+(++lid), session_id: 's'+(i+1), user_id: 'local', exercise_name: ex, set_number: si+1, weight: w, reps: r, created_at: daysAgo(d) }));
});
const days = [{ id:'push', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
  name:'Push', subtitle:'x', accent:'push', muscle_groups:['Chest'], exercises:['Barbell Bench Press'] }];
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
await p.waitForTimeout(800);
// Progress: scroll to Personal records via DOM
await p.locator('text=Progress').first().click({force:true});
await p.waitForTimeout(1800);
const pr = p.locator('text=Personal records').first();
await pr.scrollIntoViewIfNeeded();
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-77-ProgressPRs.png'});
// Settings: account card + photo sheet
await p.locator('text=Settings').first().click({force:true});
await p.waitForTimeout(1400);
await p.screenshot({path:'/downloads/NAT-80-SettingsPhoto.png'});
await p.getByLabel('Change profile photo').click({force:true});
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-81-PhotoSheet.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
