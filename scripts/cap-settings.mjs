import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});

async function shot(profile, path, clickEdit) {
  const c = await b.newContext({viewport:{width:390,height:844}});
  await c.addInitScript((prof) => {
    try {
      localStorage.setItem('sb-oeqwcpnfndatxrmmemyw-auth-token', JSON.stringify({
        access_token: 'fake', refresh_token: 'fake', expires_at: 4102444800,
        token_type: 'bearer', user: { id: 'local', email: 'hassan@example.com', aud: 'authenticated' }
      }));
      localStorage.setItem('ironlog:onboarded:local', '1');
      if (prof) localStorage.setItem('ironlog.profile.v1', JSON.stringify(prof));
    } catch {}
  }, profile);
  const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/rest/v1/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
  await p.waitForSelector('text=Settings', {timeout: 20000});
  await p.locator('text=Settings').last().click({force:true});
  await p.waitForTimeout(1200);
  if (clickEdit) {
    await p.locator('text=Edit').first().click({force:true});
    await p.waitForTimeout(400);
  }
  await p.screenshot({path});
  console.log(path.split('/').pop(), 'errors:', errors.slice(0,3));
  await c.close();
}

await shot({firstName:'Hassan', displayName:'Hassan', age:'21', weight:'78', height:'178'}, '/downloads/NAT-67-Settings-summary.png', false);
await shot({firstName:'Hassan', displayName:'Hassan', age:'21', weight:'78', height:'178'}, '/downloads/NAT-68-Settings-edit.png', true);
await b.close();
