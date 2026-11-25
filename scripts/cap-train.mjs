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
await p.screenshot({path:'/downloads/NAT-4-Train.png', fullPage:false});
await p.evaluate(() => window.scrollTo(0, 700));
await p.waitForTimeout(400);
await p.screenshot({path:'/downloads/NAT-5-Train-routines.png'});
await p.close(); await c.close(); await b.close();
console.log(JSON.stringify({errors}));
