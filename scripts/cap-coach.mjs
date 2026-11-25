import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
const c = await b.newContext({viewport:{width:390,height:844}});
await c.addInitScript(() => {
  try {
    localStorage.setItem('sb-oeqwcpnfndatxrmmemyw-auth-token', JSON.stringify({
      access_token: 'fake', refresh_token: 'fake', expires_at: 4102444800,
      token_type: 'bearer', user: { id: 'local', email: 'hassan@example.com', aud: 'authenticated' }
    }));
    localStorage.setItem('ironlog:onboarded:local','1');
    localStorage.setItem('ironlog.profile.v1', JSON.stringify({firstName:'Hassan',displayName:'Hassan',age:'21',weight:'82',height:'180'}));
  } catch {}
});
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
// mock coach SSE
await p.route('**/api/coach', async (route) => {
  const reply = "Solid question champ 💪 Based on your log, your bench is progressing well. Next session: add **2.5kg** and aim for 3x8. Hit it and we go again.";
  const chunks = reply.split(' ').map(w => `data: ${JSON.stringify({choices:[{delta:{content:w+' '}}]})}\n\n`);
  const body = chunks.join('') + 'data: [DONE]\n\n';
  route.fulfill({status:200, contentType:'text/event-stream', body});
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(1500);
await p.locator('text=Ask IronCoach about your training').click({force:true});
await p.waitForTimeout(1000);
await p.screenshot({path:'/downloads/NAT-29-Coach-list.png'});
await p.locator('text=+ New chat').click({force:true});
await p.waitForTimeout(800);
await p.screenshot({path:'/downloads/NAT-30-Coach-empty.png'});
await p.locator('textarea, input').fill('How do I break my bench plateau?');
await p.locator('textarea, input').locator('xpath=..').locator('div').last().click({force:true});
await p.waitForTimeout(1500);
await p.screenshot({path:'/downloads/NAT-31-Coach-chat.png'});
await b.close();
console.log(JSON.stringify({errors}));
