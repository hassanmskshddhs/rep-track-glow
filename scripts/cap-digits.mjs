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
  name:'Push', subtitle:'x', accent:'push', muscle_groups:['Chest'], exercises:['Incline DB Press'] }];
const p = await c.newPage();
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.includes('custom_workout_days') ? days : []) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=/^Open /', {timeout: 20000});
await p.locator('text=/^Open /').first().click({force:true});
await p.waitForTimeout(1500);
const w = p.locator('input').nth(0);
await w.fill('٣٢٫٥');
await p.waitForTimeout(300);
const val = await w.inputValue();
const r = p.locator('input').nth(1);
await r.fill('١٢');
await p.waitForTimeout(300);
const val2 = await r.inputValue();
console.log('weight:', JSON.stringify(val), 'reps:', JSON.stringify(val2));
await b.close();
