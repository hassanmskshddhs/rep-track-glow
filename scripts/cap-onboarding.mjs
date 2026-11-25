import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
const c = await b.newContext({viewport:{width:390,height:844}});
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:8081/');
await p.getByRole('dialog',{name:'Welcome to IronLog'}).waitFor({timeout:15000});
await p.waitForTimeout(1300); // let entrance animation settle
await p.screenshot({path:'/downloads/OB-1-Welcome.png'});
await p.getByRole('button',{name:/Get started/}).click();
await p.waitForTimeout(800);
await p.screenshot({path:'/downloads/OB-2-Goal.png'});
await p.getByRole('radio',{name:/Build muscle/}).click();
await p.waitForTimeout(500);
await p.screenshot({path:'/downloads/OB-2-Goal-selected.png'});
await p.getByRole('button',{name:/Continue/}).click();
await p.waitForTimeout(800);
await p.screenshot({path:'/downloads/OB-3-Body.png'});
await p.getByRole('button',{name:/Continue/}).click();
await p.waitForTimeout(900);
await p.screenshot({path:'/downloads/OB-4-Done.png'});
await p.getByRole('button',{name:/Start training/}).click();
await p.getByRole('heading',{name:'Your next rep.'}).waitFor({timeout:15000});
await p.waitForTimeout(700);
await p.screenshot({path:'/downloads/OB-5-Train-after.png'});
const flags = await p.evaluate(()=>({onboarded: localStorage.getItem('ironlog:onboarded:local'), targets: localStorage.getItem('ironlog_macro_targets'), goal: localStorage.getItem('ironlog:goal')}));
// Fuel tab should pick up the saved targets (diary view, not setup wizard)
await p.goto('http://localhost:8081/nutrition');
await p.waitForTimeout(1200);
await p.screenshot({path:'/downloads/OB-6-Fuel-after.png'});
// Reload root: onboarding must NOT reappear
await p.goto('http://localhost:8081/'); await p.waitForTimeout(1000);
const dialogGone = await p.getByRole('dialog',{name:'Welcome to IronLog'}).count();
console.log(JSON.stringify({errors, flags, dialogGone},null,2)); await b.close();
