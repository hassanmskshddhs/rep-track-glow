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
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=Settings', {timeout: 20000});
await p.locator('text=Settings').last().click({force:true});
await p.waitForTimeout(1200);
// Scroll the settings sheet to the Your Data section
await p.locator('text=YOUR DATA').scrollIntoViewIfNeeded();
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-64-CsvImport.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
