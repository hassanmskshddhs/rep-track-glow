import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
const c = await b.newContext({viewport:{width:390,height:844}});
await c.addInitScript(() => {
  try {
    localStorage.setItem('sb-oeqwcpnfndatxrmmemyw-auth-token', JSON.stringify({
      access_token: 'fake', refresh_token: 'fake', expires_at: 4102444800,
      token_type: 'bearer', user: { id: 'local', email: 'hassan@example.com', aud: 'authenticated', user_metadata: { full_name: 'Hassan Amr' } }
    }));
  } catch {}
});
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(1800);
await p.locator('text=Settings').first().click();
await p.waitForTimeout(1500);
await p.screenshot({path:'/downloads/NAT-18-Settings.png'});
await p.mouse.move(195, 500);
await p.mouse.wheel(0, 1200);
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-19-Settings-scrolled.png'});
await b.close();
console.log(JSON.stringify({errors}));
