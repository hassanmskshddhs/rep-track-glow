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
    // preload logs + targets so the dashboard shows data (AsyncStorage on web uses localStorage)
    localStorage.setItem('ironlog_macro_targets', JSON.stringify({calories:2600,protein:160,carbs:290,fat:72,goal:'Maintain'}));
    const today = new Date();
    const p = n => String(n).padStart(2,'0');
    const ds = `${today.getFullYear()}-${p(today.getMonth()+1)}-${p(today.getDate())}`;
    localStorage.setItem('ironlog_food_logs', JSON.stringify({[ds]: [
      {id:'a1',mealType:'Breakfast',foodId:'9',name:'Oats',quantity:80,unit:'g',calories:300,protein:10,carbs:54,fat:6},
      {id:'a2',mealType:'Breakfast',foodId:'10',name:'Whole Milk',quantity:250,unit:'ml',calories:150,protein:8,carbs:12,fat:8},
      {id:'a3',mealType:'Lunch',foodId:'2',name:'Chicken Breast (Cooked)',quantity:180,unit:'g',calories:297,protein:55.8,carbs:0,fat:6.5},
    ]}));
  } catch {}
});
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.route('**/rest/v1/**', r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(1500);
await p.locator('text=Fuel').first().click({force:true});
await p.waitForTimeout(1500);
await p.screenshot({path:'/downloads/NAT-25-Fuel.png'});
// open Add Food on Breakfast
await p.locator('text=+ Add Food').first().click({force:true});
await p.waitForTimeout(800);
await p.screenshot({path:'/downloads/NAT-26-Fuel-search.png'});
// pick a food
await p.locator('text=Chicken Breast (Cooked)').first().click({force:true});
await p.waitForTimeout(600);
await p.screenshot({path:'/downloads/NAT-27-Fuel-detail.png'});
await b.close();
console.log(JSON.stringify({errors}));
