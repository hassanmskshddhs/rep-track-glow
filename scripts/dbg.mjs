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
const p = await c.newPage();
p.on('pageerror',e=>console.log('PAGEERROR:',e.message.slice(0,300)));
p.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE:',m.text().slice(0,200)); });
await p.route('**/rest/v1/**', r => r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(3000);
await p.screenshot({path:'/downloads/dbg.png'});
await b.close();
console.log('done');
