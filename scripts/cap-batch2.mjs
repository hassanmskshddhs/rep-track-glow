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
const d = (n) => new Date(Date.now() - n*86400000).toISOString();
const sessions = [
  { id:'s1', user_id:'local', day:'push', title:null, performed_at:d(14) },
  { id:'s2', user_id:'local', day:'push', title:null, performed_at:d(7) },
  { id:'s3', user_id:'local', day:'push', title:'Heavy Push', performed_at:d(2) },
];
const logs = [
  { id:'l1', session_id:'s1', user_id:'local', exercise_name:'Incline DB Press', set_number:1, weight:26, reps:10, created_at:d(14) },
  { id:'l2', session_id:'s2', user_id:'local', exercise_name:'Incline DB Press', set_number:1, weight:28, reps:10, created_at:d(7) },
  { id:'l3', session_id:'s3', user_id:'local', exercise_name:'Incline DB Press', set_number:1, weight:30, reps:12, created_at:d(2) },
  { id:'l4', session_id:'s3', user_id:'local', exercise_name:'DB Lateral Raise', set_number:1, weight:15, reps:12, created_at:d(2) },
  { id:'l5', session_id:'s2', user_id:'local', exercise_name:'DB Lateral Raise', set_number:1, weight:12.5, reps:12, created_at:d(7) },
];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const req = route.request(); const url = req.url();
  if (req.method() === 'DELETE') { route.fulfill({status:204, body:''}); return; }
  let body = [];
  if (url.includes('custom_workout_days')) body = days;
  else if (url.includes('workout_sessions')) body = sessions;
  else if (url.includes('set_logs')) body = logs;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=/^Open /', {timeout: 20000});
// Settings
await p.locator('text=Settings').last().click({force:true});
await p.waitForTimeout(1200);
await p.mouse.wheel(0, 500);
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-56-Settings-coach-export.png'});
// Progress
await p.locator('text=Progress').last().click({force:true});
await p.waitForTimeout(1800);
await p.mouse.wheel(0, 700);
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/NAT-57-Progress-board.png'});
// History + undo
await p.locator('text=History').last().click({force:true});
await p.waitForTimeout(1500);
await p.locator('[aria-label="Delete session"]').first().click({force:true});
await p.waitForTimeout(600);
await p.getByText('Delete', {exact:true}).last().click({force:true});
await p.waitForTimeout(800);
await p.screenshot({path:'/downloads/NAT-58-History-undo.png'});
await p.locator('text=Undo').click({force:true});
await p.waitForTimeout(600);
await p.screenshot({path:'/downloads/NAT-59-History-restored.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
