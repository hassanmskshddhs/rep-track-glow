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
const days = [{ id:'push', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
  name:'Push', subtitle:'Chest · Shoulders · Triceps', accent:'push',
  muscle_groups:['Chest','Shoulders','Triceps'], exercises:['Incline DB Press','DB Lateral Raise'] }];
const parsed = { name:'Pull Day', subtitle:'Back · Biceps · Rear Delts', muscleGroups:['Back','Biceps','Forearms'],
  exercises:[
    {name:'Lat Pulldown (Wide Grip)', sets:4, reps:'8-10', weight:null},
    {name:'Barbell Row', sets:4, reps:'8', weight:'60kg'},
    {name:'Face Pull', sets:3, reps:'12-15', weight:null},
    {name:'Incline DB Curl', sets:3, reps:'10-12', weight:null},
  ]};
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) {
    if (route.request().method() === 'POST') { route.fulfill({status:201, contentType:'application/json', body:'{}'}); return; }
    body = days;
  }
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.route('**/api/import', (route) => {
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(parsed) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=/^Open /', {timeout: 20000});
// go to Plan tab
await p.locator('text=Plan').last().click({force:true});
await p.waitForTimeout(1000);
await p.screenshot({path:'/downloads/NAT-49-Plan-import-btn.png'});
await p.locator('text=Import').first().click({force:true});
await p.waitForTimeout(800);
await p.locator('textarea, input[placeholder*="Push Day"], [contenteditable]').first().fill('Pull Day\nLat Pulldown 4x8-10\nBarbell Row 4x8 @60kg\nFace Pull 3x12-15\nIncline DB Curl 3x10-12').catch(async () => {
  await p.locator('div').filter({hasText:'Paste any workout plan'}).last().locator('..').locator('textarea').fill('Pull Day\nLat Pulldown 4x8-10');
});
await p.waitForTimeout(400);
await p.screenshot({path:'/downloads/NAT-50-Import-input.png'});
await p.locator('text=Parse with AI').click({force:true});
await p.waitForTimeout(1500);
await p.screenshot({path:'/downloads/NAT-51-Import-preview.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
