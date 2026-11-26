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
const days = [{ id:'push', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
  name:'Push', subtitle:'x', accent:'push', muscle_groups:['Chest'], exercises:['Decline Machine Fly (Panatta)','Incline DB Press'] }];
const past = new Date(Date.now() - 4*86400000).toISOString();
const logs = [
  // Decline: 60x10 -> hold branch
  { id:'l1', session_id:'s1', user_id:'local', exercise_name:'Decline Machine Fly (Panatta)', set_number:1, weight:60, reps:10, created_at: past },
  { id:'l2', session_id:'s1', user_id:'local', exercise_name:'Decline Machine Fly (Panatta)', set_number:2, weight:60, reps:10, created_at: past },
  // Incline: 32.5x12 all hit -> jump branch
  { id:'l3', session_id:'s1', user_id:'local', exercise_name:'Incline DB Press', set_number:1, weight:32.5, reps:12, created_at: past },
  { id:'l4', session_id:'s1', user_id:'local', exercise_name:'Incline DB Press', set_number:2, weight:32.5, reps:12, created_at: past },
];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) body = days;
  else if (url.includes('exercise_notes')) body = [{ user_id:'local', exercise_name:'Decline Machine Fly (Panatta)', note:'Machine and handles on 4' }];
  else if (url.includes('set_logs')) body = logs;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=/^Open /', {timeout: 20000});
// 1. Train home with floating tab bar
await p.waitForTimeout(1200);
await p.screenshot({path:'/downloads/NAT-69-TabBar.png'});
// 2. Logger: coach hold branch + tools row + note line
await p.locator('text=/^Open /').first().click({force:true});
await p.waitForTimeout(1800);
await p.screenshot({path:'/downloads/NAT-70-LoggerTools.png'});
// 3. intensity switch shows a different call (savage on hold branch)
await p.locator('text=Savage').first().click({force:true});
await p.waitForTimeout(400);
await p.screenshot({path:'/downloads/NAT-71-CoachSavage.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
