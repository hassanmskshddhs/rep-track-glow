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
    localStorage.setItem('ironlog.profile.v1:local', JSON.stringify({firstName:'Hassan', displayName:'Hassan', age:'21', weight:'78', height:'181'}));
    localStorage.setItem('ironlog_macro_targets:local', JSON.stringify({calories:2600, protein:180, carbs:280, fat:80, goal:'Maintain'}));
  } catch {}
});
const days = [{ id:'push', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
  name:'Push', subtitle:'x', accent:'push', muscle_groups:['Chest'], exercises:['Decline Machine Fly (Panatta)','Incline DB Press'] }];
const past = new Date(Date.now() - 4*86400000).toISOString();
const logs = [
  { id:'l1', session_id:'s1', user_id:'local', exercise_name:'Decline Machine Fly (Panatta)', set_number:1, weight:60, reps:10, created_at: past },
  { id:'l2', session_id:'s1', user_id:'local', exercise_name:'Decline Machine Fly (Panatta)', set_number:2, weight:60, reps:10, created_at: past },
];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  let body = [];
  if (url.includes('custom_workout_days')) body = days;
  else if (url.includes('set_logs')) body = logs;
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForSelector('text=/^Open /', {timeout: 20000});
await p.waitForTimeout(1000);
// 1. Open the workout, log a set, then leave via "All workouts" -> banner
await p.locator('text=/^Open /').first().click({force:true});
await p.waitForTimeout(1500);
// type a weight into the first set's KG field and tap the done circle if present
const kg = p.locator('input').first();
await kg.click({force:true}); await kg.fill('60');
await p.waitForTimeout(400);
await p.locator('text=← All workouts').first().click({force:true});
await p.waitForTimeout(1800);
await p.screenshot({path:'/downloads/NAT-72-ResumeBanner.png'});
// 2. Resume restores the logger with the timer and typed weight
await p.locator('text=tap to resume').first().click({force:true});
await p.waitForTimeout(1200);
await p.screenshot({path:'/downloads/NAT-73-Resumed.png'});
// 3. Nutrition: Fuel tab + Add Food sheet (FlatList)
await p.locator('text=← All workouts').first().click({force:true});
await p.waitForTimeout(800);
await p.locator('text=Fuel').first().click({force:true});
await p.waitForTimeout(1200);
await p.screenshot({path:'/downloads/NAT-74-Fuel.png'});
await p.locator('text=+ Add Food').first().click({force:true});
await p.waitForTimeout(900);
await p.screenshot({path:'/downloads/NAT-75-FoodSearch.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
