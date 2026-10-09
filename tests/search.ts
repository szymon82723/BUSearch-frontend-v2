import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser=await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH||'/snap/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try {
 for(const width of [1440,390]) {
  const page=await browser.newPage();const requests:number[]=[];const errors:string[]=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewport({width,height:width===390?844:1000,isMobile:width===390,hasTouch:width===390});
  const stops=[
   {id:2002,nazwa:'Zławieś Wielka - Urząd Gminy',kod:'13337',lat:53.096,lon:18.331,lines:['43'],kierunek_opis:'Zławieś Wielka'},
   {id:2003,nazwa:'Zławieś Wielka - Urząd Gminy',kod:'13338',lat:53.0962,lon:18.3312,lines:['43'],linie_kierunki:[{linia:'43',kierunek:'Przylesie pętla'}]},
   {id:50,nazwa:'Łąkowa',kod:'00500',lat:53.13,lon:18.03,lines:['11']},
  ];
  await page.setRequestInterception(true);
  page.on('request',async request=>{
   const path=new URL(request.url()).pathname;
   const json=(body:unknown)=>request.respond({status:200,contentType:'application/json',body:JSON.stringify(body)});
   if(/\/map-style(?:-ciemny)?\.json$/.test(path)) await json({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#111'}}]});
   else if(path.endsWith('/api/stops')) await json(stops);
   else if(path.endsWith('/api/lines')) await json([{id:'11',number:'11',type:'BUS'},{id:'1',number:'1',type:'TRAM'},{id:'2',number:'2',type:'TRAM'}]);
   else if(/\/line\/\d+\/route$/.test(path)) await json({linia:path.split('/').at(-2),trayectos:[{trayecto_id:1,direccion:0,nazwa:'Test',tekst_kierunkowy:'Test',punkty:[[53.13,18.03],[53.14,18.04]],przystanki:[stops[2]]}]});
   else if(/\/stop\/\d+\/departures$/.test(path)){requests.push(Number(path.split('/').at(-2)));await json([{linia:'43',cel:'Wybrany kierunek',czas:'5 min',atMs:Date.now()+300000}]);}
   else if(path.includes('/api/'))await json([]);
   else await request.continue();
  });
  await page.goto(`${process.env.TEST_BASE_URL||'http://127.0.0.1:1500'}/bydgoszcz/`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#searchLine');
  if(await page.$('#uiZgodaOk'))await page.click('#uiZgodaOk');
  const type=async(q:string)=>{await page.focus('#searchLine');await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.type(q);};
  await type('1');await page.waitForSelector('#searchLineLista [role="option"]');
  assert.match(await page.$eval('#search-result-0',n=>n.textContent||''),/^1\s*Linia tramwajowa/);
  await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
  assert.equal(await page.$eval('#searchLine',n=>n.getAttribute('aria-activedescendant')),'search-result-1');
  assert.equal(await page.$eval('#search-result-1',n=>n.getAttribute('aria-selected')),'true');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#linePanelBadge')?.textContent==='11');
  assert.equal(await page.$('#searchLineLista'),null);
  await type('zlawies wielka');await page.waitForSelector('#searchLineLista [data-stop-id="2003"]');
  assert.match(await page.$eval('#searchLineLista [data-stop-id="2003"]',n=>n.textContent||''),/Kod 13338.*Przylesie/);
  await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#stopPanelMeta')?.textContent?.includes('2003'));
  assert.ok(requests.includes(2003));assert.ok(!requests.includes(2002));
  await type('13337');await page.waitForSelector('#searchLineLista [data-stop-id="2002"]');
  if(width===390)await page.tap('#searchLineLista [data-stop-id="2002"]');else await page.click('#searchLineLista [data-stop-id="2002"]');
  await page.waitForFunction(()=>document.querySelector('#stopPanelMeta')?.textContent?.includes('2002'));
  assert.ok(requests.includes(2002));
  await type('lakowa');await page.waitForSelector('#searchLineLista [data-stop-id="50"]');
  await page.keyboard.press('Escape');assert.equal(await page.$('#searchLineLista'),null);
  await page.keyboard.press('ArrowUp');await page.waitForSelector('#searchLineLista [aria-selected="true"]');
  assert.equal(await page.$eval('#searchLine',n=>n.getAttribute('aria-activedescendant')),'search-result-0');
  await page.$eval('#searchLine',n=>n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true})));
  assert.ok(await page.$('#searchLineLista'));
  await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#stopPanelMeta')?.textContent?.includes('50'));
  await type('urzad zlawies');await page.waitForSelector('#searchLineLista [data-stop-id="2002"]');
  await page.keyboard.press('Tab');assert.equal(await page.$('#searchLineLista'),null);
  await type('nieistniejacyprzystanek');await page.waitForSelector('#searchLineLista [role="status"]');
  assert.equal(await page.$eval('#searchLine',n=>n.getAttribute('aria-activedescendant')),null);
  await page.click('[aria-label="Wyczyść wyszukiwanie"]');
  assert.equal(await page.$eval('#searchLine',(n:any)=>n.value),'');
  assert.equal(await page.$('#searchLineLista'),null);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'searchLine');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: exact line ranking, arrow/Enter selection, same-name platform ID/code/direction, touch/click, Polish letters, token search, Escape/reopen, IME, Tab, no results and clear/focus.`);
  await page.close();
 }
}finally{await browser.close();}
