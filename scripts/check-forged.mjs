import { chromium } from 'playwright';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
await context.addInitScript(()=>{try{localStorage.setItem('ironlog:onboarded:local','1')}catch(e){}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8081/');await page.getByRole('heading',{name:'Your next rep.'}).waitFor();await page.getByText('Next in your rotation').waitFor();
await page.waitForTimeout(600);await page.screenshot({path:'/downloads/forged-built-train.png',fullPage:true});
await page.getByRole('link',{name:'Plan',exact:true}).click();await page.getByRole('heading',{name:'Your routines'}).waitFor();await page.waitForTimeout(600);await page.screenshot({path:'/downloads/forged-built-plan.png',fullPage:true});
await page.getByLabel('Mon routine').selectOption('push');await page.reload();await page.getByLabel('Mon routine').waitFor();if(await page.getByLabel('Mon routine').inputValue()!=='push')throw Error('Schedule did not persist');
await page.goto('http://localhost:8081/day/push');await page.getByRole('heading',{name:'Push',exact:true}).waitFor();
await page.getByLabel('Incline DB Press set 1 weight in kilograms').fill('22');await page.getByLabel('Incline DB Press set 1 repetitions').fill('10');
await page.getByRole('button',{name:'Complete set and start rest'}).click();
await page.reload();await page.getByLabel('Incline DB Press set 1 weight in kilograms').waitFor();
if(await page.getByLabel('Incline DB Press set 1 weight in kilograms').inputValue()!=='22')throw Error('Draft lost');
if(await page.getByRole('button',{name:'Mark set not done'}).getAttribute('aria-pressed')!=='true')throw Error('Completion lost');
await page.getByRole('button',{name:'Start Workout',exact:true}).click();
await page.waitForTimeout(600);await page.screenshot({path:'/downloads/forged-built-logger.png',fullPage:true});
await page.getByRole('button',{name:'Review session',exact:true}).click();await page.getByRole('heading',{name:'Session review'}).waitFor();await page.waitForTimeout(600);await page.screenshot({path:'/downloads/forged-built-review.png'});
await page.getByRole('button',{name:'Keep training',exact:true}).click();
await page.getByRole('button',{name:'Next exercise',exact:true}).click();if(await page.getByRole('combobox',{name:'Current exercise'}).inputValue()!=='1')throw Error('Next failed');
await page.goto('http://localhost:8081/nutrition');await page.getByRole('heading',{name:'Fuel setup'}).waitFor();await page.waitForTimeout(600);await page.screenshot({path:'/downloads/forged-built-fuel.png',fullPage:true});
for(const width of [320,390,1280]){
 await page.setViewportSize({width,height:900});
 for(const route of ['/','/plan','/day/push','/nutrition','/progress','/history','/settings','/custom/new']){
  await page.goto('http://localhost:8081'+route);await page.waitForTimeout(1000);
  const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  if(result.scroll>result.width){console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).map(e=>({tag:e.tagName,c:String(e.className),text:e.textContent?.slice(0,60),r:e.getBoundingClientRect().right,l:e.getBoundingClientRect().left})).filter(e=>e.r>innerWidth+.5||e.l<-.5)));throw Error('Overflow '+width+' '+route+' '+JSON.stringify(result));};
 }
}
await page.goto('http://localhost:8081/day/push');await page.getByRole('button',{name:'Review session',exact:true}).waitFor();await page.getByRole('button',{name:'Review session',exact:true}).click();await page.getByRole('button',{name:'Save workout',exact:true}).click();await page.waitForTimeout(700);
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ironlog_workout_sessions')||'[]'));
if(saved.length!==1)throw Error('Expected one local guest session');
const logs=await page.evaluate(()=>JSON.parse(localStorage.getItem('ironlog_set_logs')||'[]'));
if(logs.length!==1 || logs[0].weight!==22 || logs[0].reps!==10)throw Error('Saved rows differ');
console.log(JSON.stringify({result:'PASS: guest navigation, draft reload with done/kind flags, schedule reload, next exercise, review/cancel, 24 route-width checks',errors},null,2));
await browser.close();
