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
  name:'Push', subtitle:'Chest & shoulders', accent:'push', muscle_groups:['Chest'], exercises:['Bench Press','Overhead Press'] }];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
p.setDefaultTimeout(8000);
await p.route('**/rest/v1/**', (route) => {
  const u = route.request().url();
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(u.includes('custom_workout_days') ? days : []) });
});
await p.goto('http://localhost:8082/', {waitUntil:'load'});
await p.waitForTimeout(3500);
await p.locator('text=Open Push').first().click({force:true}).catch(e=>console.log('open fail', e.message.slice(0,80)));
await p.waitForTimeout(2500);
await p.screenshot({path:'/downloads/NAT-90a-LoggerOpen.png'});
const inputs = p.locator('input:visible');
console.log('inputs', await inputs.count());
await inputs.nth(0).fill('80').catch(e=>console.log('fill0', e.message.slice(0,60)));
await inputs.nth(1).fill('8').catch(e=>console.log('fill1', e.message.slice(0,60)));
const checks = p.locator('svg.lucide-check');
console.log('checks', await checks.count());
await checks.nth(0).click({force:true}).catch(e=>console.log('chk0', e.message.slice(0,60)));
await p.waitForTimeout(600);
await checks.nth(1).click({force:true}).catch(e=>console.log('chk1', e.message.slice(0,60)));
await p.waitForTimeout(1200);
await p.screenshot({path:'/downloads/NAT-90-LoggerDone.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
