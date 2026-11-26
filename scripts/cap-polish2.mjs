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
    const ds = new Date().toISOString().slice(0,10);
    localStorage.setItem('ironlog_food_logs:local', JSON.stringify({[ds]:[
      {id:'a', mealType:'Breakfast', foodId:'x', name:'Oats + whey', quantity:1, unit:'serving', calories:520, protein:42, carbs:58, fat:12},
      {id:'b', mealType:'Lunch', foodId:'y', name:'Chicken + rice', quantity:1, unit:'serving', calories:740, protein:55, carbs:80, fat:16}
    ]}));
  } catch {}
});
const days = [{ id:'push', user_id:'local', created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z',
  name:'Push', subtitle:'Chest & shoulders', accent:'push', muscle_groups:['Chest'], exercises:['Bench Press'] }];
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', (route) => {
  const u = route.request().url();
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(u.includes('custom_workout_days') ? days : []) });
});
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(2000);
// Fuel tab with animated rings (let the sweep finish)
await p.locator('text=Fuel').first().click({force:true});
await p.waitForTimeout(1600);
await p.screenshot({path:'/downloads/NAT-88-FuelRings.png'});
// Welcome screen polish: fresh context
const c2 = await b.newContext({viewport:{width:390,height:844}});
const p2 = await c2.newPage();
await p2.route('**/rest/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await p2.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p2.waitForTimeout(1600);
await p2.screenshot({path:'/downloads/NAT-89-WelcomeV2.png'});
console.log('errors:', errors.slice(0,3));
await b.close();
