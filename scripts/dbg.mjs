import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.goto('http://localhost:8082/', {waitUntil:'networkidle'});
await p.waitForTimeout(4000);
console.log('TEXT:', (await p.textContent('body'))?.slice(0,300));
console.log('ERRS:', JSON.stringify(errs.slice(0,3)));
await b.close();
