import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH || '/snap/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
try {
 const profiles = process.env.PLANNER_PROFILES ? JSON.parse(process.env.PLANNER_PROFILES) : [{name:'desktop',width:1440,height:900,mobile:false},{name:'phone',width:390,height:844,mobile:true}];
 let run = 0;
 for (const profile of profiles) {
  run++;
  const {width,height,mobile} = profile;
  const stamp = `${process.env.PLANNER_REPORT_PREFIX || 'planner'}-${run}-${profile.name}`;
  const page = await browser.newPage();
  await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});
  await page.emulateTimezone(profile.timezone || 'America/Los_Angeles');
  const errors:string[]=[]; const requests:any[]=[]; let mode='success';
  const stops=[
   {id:50,nazwa:'Łąkowa',kod:'00500',lat:53.13,lon:18.03,lines:['71'],kierunek_opis:'Dworzec'},
   {id:51,nazwa:'Łąkowa',kod:'00501',lat:53.1301,lon:18.0301,lines:['71'],kierunek_opis:'Fordon'},
   {id:60,nazwa:'Dworzec Główny',kod:'00600',lat:53.14,lon:18.02,lines:['71']},
  ];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on('request',async request=>{
   try {
   const path=new URL(request.url()).pathname;
   const json=(body:unknown,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
   if(/\/map-style(?:-ciemny)?\.json$/.test(path)) await json({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#142b30'}}]});
   else if(path.endsWith('/api/stops'))await json(stops);
   else if(path.endsWith('/api/lines'))await json([{id:'71',number:'71',type:'BUS'}]);
   else if(path.endsWith('/api/announcements'))await json({ok:true,announcements:[{id:'test',title:'Zmiana trasy',shortDesc:'Komunikat o objazdach na liniach miejskich',createdAt:Date.now()}]});
   else if(path.endsWith('/api/polaczenia')){
    if(mode==='offline'){await request.abort('internetdisconnected');return;}
    if(mode==='malformed'){await request.respond({status:200,contentType:'application/json',body:'{'});return;}
    if(mode==='slow')await new Promise(resolve=>setTimeout(resolve,800));
    if(mode==='timeout')await new Promise(resolve=>setTimeout(resolve,22000));
    const payload=JSON.parse(request.postData()!);requests.push(payload);
    if(mode==='error')await json({ok:false,blad:'Przejściowy błąd rozkładów'},503);
    else await json({ok:true,polaczenia:mode==='empty'?[]:[{wyjscieMs:payload.whenMs,przyjazdMs:payload.whenMs+1200000,czasPodrozyMin:20,przesiadki:0,
     odcinki:[{rodzaj:'przejazd',linia:'71',cel:'Dworzec',zPrzystanku:stops.find(s=>s.id===payload.from.stopId),doPrzystanku:stops.find(s=>s.id===payload.to.stopId),odjazdMs:payload.whenMs,przyjazdMs:payload.whenMs+1200000,przystankow:4,ksztalt:[[53.13,18.03],[53.14,18.02]]}]}]});
   }else if(path.includes('/api/'))await json([]);else await request.continue();
   } catch(error) { if (!request.isInterceptResolutionHandled()) console.error('Interception:',String(error)); }
  });
  await page.goto(`${process.env.TEST_BASE_URL||'http://127.0.0.1:1500'}/bydgoszcz/`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#btnMapSearch');if(await page.$('#uiZgodaOk'))await page.click('#uiZgodaOk');
  await page.click('#btnMapSearch');await page.waitForSelector('#polPanel');
  assert.equal(await page.$eval('#plannerSearch',(n:any)=>n.disabled),true);
  const rect=await page.$eval('#polPanel',n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height,left:r.left,top:r.top,bottom:r.bottom,overflow:n.scrollWidth>n.clientWidth};});
  assert.equal(rect.overflow,false);assert.ok(mobile?Math.abs(rect.width-width)<=1&&Math.abs(rect.height-height)<=1:rect.width<400&&rect.left<30&&rect.top<30&&rect.bottom<=height);
  await page.screenshot({path:`/tmp/busearch-${stamp}-empty.png`});
  await page.type('#plannerFrom','lakowa');await page.waitForSelector('#plannerFromOptions [data-stop-id="50"]');
  assert.match(await page.$eval('#plannerFromOption0',n=>n.textContent||''),/00500.*Dworzec/);
  if(mobile)await page.tap('#plannerFromOptions [data-stop-id="50"]');else{await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');}
  await page.type('#plannerTo','dworzec');await page.waitForSelector('#plannerToOptions [data-stop-id="60"]');if(mobile)await page.tap('#plannerToOptions [data-stop-id="60"]');else await page.keyboard.press('Enter');
  assert.equal(await page.$eval('#plannerSearch',(n:any)=>n.disabled),false);
  await page.click('#plannerOptionsToggle');await page.select('#plannerMaxTransfers','0');await page.select('#plannerTransferMinutes','3');await page.select('#plannerWalkingSpeed','0.8');
  await page.click('#plannerTimeToggle');await page.click('#plannerScheduled');
  await page.$eval('#plannerDateTime',(n:any)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(n,'2026-10-06T08:30');n.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.click('#plannerTimeToggle');await page.click('#plannerTimeToggle');await page.click('#plannerScheduled');
  assert.equal(await page.$eval('#plannerDateTime',(n:any)=>n.value),'2026-10-06T08:30');
  await page.click('#plannerSearch');await page.waitForSelector('.planner-option');
  assert.equal(requests.at(-1).whenMs,Date.parse('2026-10-06T08:30:00+02:00'));assert.equal(requests.at(-1).maxPrzesiadki,0);
  assert.deepEqual(requests.at(-1).ustawienia,{minPrzesiadkaS:180,predkoscMarszu:0.8});
  assert.match(await page.$eval('.planner-option',n=>n.textContent||''),/08:30.*08:50.*20.*71.*Bez przesiadek/);
  await page.click('.planner-option');await page.waitForSelector('#plannerDetails');
  assert.match(await page.$eval('#plannerDetails',n=>n.textContent||''),/Łąkowa.*Linia 71.*Dworzec Główny/);
  await page.screenshot({path:`/tmp/busearch-${stamp}-results.png`});
  await page.click('#plannerDetails .planner-show-map');assert.equal(await page.$eval('#polPanel',n=>(n as HTMLElement).dataset.mapView),'1');
  if(mobile){assert.ok(await page.$eval('#polPanel',n=>n.getBoundingClientRect().height<=300));assert.ok(await page.$eval('#polPanel',n=>n.getBoundingClientRect().top>=innerHeight-301));assert.equal(await page.$eval('.planner-form',n=>getComputedStyle(n).display),'none');await page.screenshot({path:`/tmp/busearch-${stamp}-map.png`});}
  if(mobile&&height<=500)assert.equal(await page.$eval('#announceBanner',n=>getComputedStyle(n).display),'none');
  if(mobile){
    await page.setViewport({width:height,height:width,isMobile:true,hasTouch:true});
    await page.waitForFunction(()=>Math.abs(document.querySelector('#polPanel')!.getBoundingClientRect().width-innerWidth)<1);
    assert.equal(await page.$eval('#polPanel',n=>(n as HTMLElement).dataset.selected),'1');
    assert.equal(await page.$eval('#polPanel',n=>(n as HTMLElement).dataset.mapView),'1');
    assert.ok(await page.$eval('#polPanel',n=>n.scrollWidth<=n.clientWidth));
    await page.setViewport({width,height,isMobile:true,hasTouch:true});
    await page.waitForFunction(()=>Math.abs(document.querySelector('#polPanel')!.getBoundingClientRect().width-innerWidth)<1);
  }
  await page.click('.planner-navigation button:first-child');await page.click('#plannerSwap');
  assert.equal(await page.$eval('#plannerFrom',(n:any)=>n.value),'Dworzec Główny');assert.equal(await page.$('.planner-option'),null);
  mode='error';await page.click('#plannerSearch');await page.waitForSelector('#plannerError');assert.match(await page.$eval('#plannerError',n=>n.textContent||''),/Przejściowy błąd/);
  if(profile.timeout){mode='timeout';await page.click('#plannerError button');await page.waitForFunction(()=>document.querySelector('#plannerError')?.textContent?.includes('zbyt długo'),{timeout:30000});}
  mode='offline';await page.click('#plannerError button');await page.waitForFunction(()=>document.querySelector('#plannerError')?.textContent?.includes('internetem'));
  mode='malformed';await page.click('#plannerError button');await page.waitForFunction(()=>document.querySelector('#plannerError')?.textContent?.includes('odczytać'));
  mode='slow';await page.click('#plannerError button');await page.waitForSelector('.planner-loading');await page.click('#plannerSwap');
  await new Promise(resolve=>setTimeout(resolve,1100));assert.equal(await page.$('.planner-option'),null);assert.equal(await page.$('.planner-loading'),null);
  mode='empty';await page.click('#plannerSearch');await page.waitForSelector('#plannerEmpty');
  await page.click('[aria-label="Wyczyść pole Skąd"]');assert.equal(await page.$eval('#plannerSearch',(n:any)=>n.disabled),true);assert.equal(await page.$eval('#plannerFrom',(n:any)=>n.value),'');
  await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_success:unknown,fail:(error:unknown)=>void)=>fail({code:1})}}));
  await page.click('[aria-label="Wybierz najbliższy przystanek"]');
  await page.waitForFunction(()=>document.querySelector('.planner-inline-status')?.textContent?.includes('lokalizacji'));
  await page.type('#plannerFrom','nieistniejacy');
  assert.equal(await page.$('.planner-inline-status'),null);await page.waitForSelector('#plannerFromOptions [role="status"]');
  await page.keyboard.press('Escape');assert.ok(await page.$('#polPanel'));assert.equal(await page.$('#plannerFromOptions'),null);
  await page.evaluate(() => { Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: (success: (position: unknown) => void) => success({ coords: { latitude: 53.13, longitude: 18.03 } }),
  } }); });
  await page.click('[aria-label="Wybierz najbliższy przystanek"]');
  await page.waitForFunction(() => (document.querySelector('#plannerFrom') as HTMLInputElement)?.value === 'Łąkowa');
  assert.match(await page.$eval('.planner-stop-input__meta', n => n.textContent || ''), /00500/);
  await page.click('.planner-navigation button:nth-child(2)');await page.waitForSelector('#schedulesPanel');assert.equal(await page.$('#polPanel'),null);
  await page.click('#schedulesPanelClose');await page.click('#btnMapSearch');await page.keyboard.press('Escape');await page.waitForSelector('#polPanel',{hidden:true});
  await page.click('#btnMapSearch');
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.select('[aria-label="Miasto wyszukiwarki"]', 'torun')]);
  await page.waitForSelector('#polPanel');
  assert.ok(page.url().includes('/torun/?planner=1'));
  assert.equal(await page.$eval('[aria-label="Miasto wyszukiwarki"]', (n: any) => n.value), 'torun');
  assert.deepEqual(errors,[]);console.log(`PASS ${run}/${profiles.length} ${profile.name} ${width}x${height}: layout, keyboard stops, options, Polish time, results/details/map, swap, retry/empty/clear, Escape and schedules; no browser errors.`);await page.close();
 }
}finally{await browser.close();}
