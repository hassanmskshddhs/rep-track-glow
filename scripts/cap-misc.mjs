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
const days = [
  { id: 'push', user_id: 'local', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    name: 'Push', subtitle: 'Chest · Shoulders · Triceps', accent: 'push',
    muscle_groups: ['Chest','Shoulders','Triceps'], exercises: ['Incline DB Press','DB Lateral Raise'] },
];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) body = days;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(1800);
// onboarding should show (no ironlog:onboarded key)
await p.screenshot({path:'/downloads/NAT-32-Onboarding.png'});
await p.locator('text=Get started').click({force:true});
await p.waitForTimeout(600);
await p.locator('text=Build muscle').click({force:true});
await p.locator('text=Continue →').click({force:true});
await p.waitForTimeout(600);
await p.locator('text=Continue →').click({force:true});
await p.waitForTimeout(600);
await p.screenshot({path:'/downloads/NAT-33-Onboarding-targets.png'});
await p.locator('text=Set my targets').click({force:true});
await p.waitForTimeout(1500);
// open the Push day to see plates
await p.locator('text=Open Push').first().click({force:true});
await p.waitForTimeout(1500);
await p.locator('input').nth(0).fill('100');
await p.locator('input').nth(1).fill('8');
await p.locator('text=🧮 Plates').first().click({force:true});
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-34-Plates.png'});
await b.close();
console.log(JSON.stringify({errors}));
