import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
const c = await b.newContext({viewport:{width:390,height:844}});
await c.addInitScript(() => { try { localStorage.setItem('ironlog:onboarded:local','1'); } catch {} });
const p = await c.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:8081/', {waitUntil:'networkidle'});
await p.getByRole('link',{name:/Open Push/i}).click();
await p.waitForTimeout(1500);
await p.getByRole('button',{name:/Start Workout/i}).click();
await p.waitForTimeout(1200);
// Reset dialog
await p.getByRole('button',{name:/^Reset$/}).click();
await p.waitForTimeout(700);
await p.screenshot({path:'/downloads/DLG-1-Reset.png'});
await p.getByRole('button',{name:/^Cancel$/}).click();
await p.waitForTimeout(400);
// Remove-exercise dialog via card menu
await p.locator('button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-more-vertical)').first().click();
await p.waitForTimeout(400);
await p.getByRole('menuitem',{name:/Remove exercise/}).click();
await p.waitForTimeout(700);
await p.screenshot({path:'/downloads/DLG-2-Remove.png'});
await p.close(); await c.close(); await b.close();
console.log(JSON.stringify({errors}));
