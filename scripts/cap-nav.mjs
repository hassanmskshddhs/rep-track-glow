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
await p.route('**/rest/v1/**', r => r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(2500);
await p.screenshot({path:'/downloads/NAT-44-Nav-fab.png'});
await p.mouse.click(358, 788); // FAB bottom-right
await p.waitForTimeout(1200);
await p.screenshot({path:'/downloads/NAT-45-Nav-menu.png'});
// navigate to Progress from menu
await p.locator('text=Progress').last().click({force:true});
await p.waitForTimeout(1200);
await p.screenshot({path:'/downloads/NAT-46-Nav-progress.png'});
await b.close();
console.log(JSON.stringify({errors}));
