import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
// 1. logged-out: splash -> welcome -> new login
let c = await b.newContext({viewport:{width:390,height:844}});
let p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await p.goto('http://localhost:8082/', {waitUntil:'domcontentloaded'});
await p.waitForTimeout(350);
await p.screenshot({path:'/downloads/NAT-85-Splash.png'});
await p.waitForTimeout(1800);
await p.locator('text=Get started').first().click({force:true});
await p.waitForTimeout(1300);
await p.screenshot({path:'/downloads/NAT-86-LoginV2.png'});
await c.close();
// 2. logged-in: Train home (tab bar + coach row + routines)
c = await b.newContext({viewport:{width:390,height:844}});
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
p = await c.newPage(); p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (r) => {
  const u = r.request().url();
  let body = [];
  if (u.includes('custom_workout_days')) body = [{ id:'push', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
    name:'Push', subtitle:'Chest & shoulders', accent:'push', muscle_groups:['Chest'], exercises:['Bench Press','Incline DB Press'] },
    { id:'pull', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
    name:'Pull', subtitle:'Back & arms', accent:'pull', muscle_groups:['Back'], exercises:['Barbell Row','Lat Pulldown'] }];
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(2200);
await p.screenshot({path:'/downloads/NAT-87-TrainPolish.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
