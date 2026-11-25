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
let posted = null;
const parsed = { name:'Pull Day', subtitle:'Back · Biceps · Rear Delts', muscleGroups:['Back','Biceps','Forearms'],
  exercises:[{name:'Lat Pulldown (Wide Grip)', sets:4, reps:'8-10', weight:null},{name:'Barbell Row', sets:4, reps:'8', weight:'60kg'}]};
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const req = route.request();
  if (req.url().includes('custom_workout_days') && req.method() === 'POST') {
    posted = req.postDataJSON();
    route.fulfill({status:201, contentType:'application/json', body:'{}'}); return;
  }
  route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
await p.route('**/api/import', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(parsed) }));
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=/^Open |Your routines/', {timeout: 20000});
await p.locator('text=Plan').last().click({force:true});
await p.waitForTimeout(900);
await p.locator('text=Import').first().click({force:true});
await p.waitForTimeout(700);
await p.locator('textarea').first().fill('Pull Day\nLat Pulldown 4x8-10\nBarbell Row 4x8 @60kg');
await p.locator('text=Parse with AI').click({force:true});
await p.waitForTimeout(1200);
await p.locator('text=Save split').click({force:true});
await p.waitForTimeout(1500);
await p.screenshot({path:'/downloads/NAT-52-Import-saved.png'});
console.log('posted:', JSON.stringify(posted));
console.log('errors:', errors.slice(0,3));
await b.close();
