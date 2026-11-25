import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
const c = await b.newContext({viewport:{width:390,height:844},recordVideo:{dir:'/tmp/motion-video',size:{width:390,height:844}}});
await c.addInitScript(() => { try { localStorage.setItem('ironlog:onboarded:local','1'); } catch {} });
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:8081/', {waitUntil:'networkidle'});
await p.waitForTimeout(1400); // Train hub rise-in
await p.screenshot({path:'/downloads/M2-1-Train.png'});
// Plan
await p.getByRole('link',{name:/Plan/i}).first().click();
await p.waitForTimeout(1400); // day cards stagger
await p.screenshot({path:'/downloads/M2-2-Plan.png'});
// Fuel
await p.getByRole('link',{name:/Fuel/i}).first().click();
await p.waitForTimeout(1600); // macro rings count-up + meal cards rise-in
await p.screenshot({path:'/downloads/M2-3-Fuel.png'});
// Progress
await p.getByRole('link',{name:/Progress/i}).first().click();
await p.waitForTimeout(1400);
await p.screenshot({path:'/downloads/M2-4-Progress.png'});
// Back to Train for page-enter
await p.getByRole('link',{name:/Train/i}).first().click();
await p.waitForTimeout(900);
await p.close();
await c.close(); await b.close();
console.log(JSON.stringify({errors}));
