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
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(2000);
await p.getByText('Open Push').click();
await p.waitForTimeout(1500);
await p.screenshot({path:'/downloads/NAT-6-Logger.png'});
// fill two sets
const inputs = p.locator('input');
await inputs.nth(0).fill('30');
await inputs.nth(1).fill('10');
await inputs.nth(2).fill('32.5');
await inputs.nth(3).fill('8');
await p.getByText('+ Add set').first().click();
await p.waitForTimeout(300);
await p.screenshot({path:'/downloads/NAT-7-Logger-filled.png'});
await p.getByText('Review session').click();
await p.waitForTimeout(800);
await p.screenshot({path:'/downloads/NAT-8-Review.png'});
await p.close(); await c.close(); await b.close();
console.log(JSON.stringify({errors}));
