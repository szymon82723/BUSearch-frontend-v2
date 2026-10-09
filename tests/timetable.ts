import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH||'/snap/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try {
 for (const width of [1440,390]) {
  const page=await browser.newPage(); const errors:string[]=[]; const queries:URL[]=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.setViewport({width,height:width===390?844:1000});
  await page.emulateTimezone('Pacific/Honolulu');
  await page.evaluateOnNewDocument(()=>{
    const OriginalDate=Date;
    const fixed=OriginalDate.parse('2026-10-04T23:15:00Z');
    class WarsawTestDate extends OriginalDate { constructor(value?:any) { super(value===undefined?fixed:value); } static now() {return fixed;} }
    (window as any).Date=WarsawTestDate;
  });
  const stop={id:42,nazwa:'Urząd Gminy',kod:'42',lat:53.134,lon:18.01,lines:['43']};
  const timetable={linia:'43',przystanek:{id:'42',nazwa:stop.nazwa},warianty:[{idx:0,litera:null,kierunek:'Alpha'},{idx:1,litera:'X',kierunek:'Beta',opis:'Kurs wydłużony'}],dni:[
    {klucz:'robocze',nazwa:'Dni powszednie',data:'2026-10-05',godziny:[{h:1,m:[{min:30,w:0},{min:10,w:0},{min:35,w:1}]},{h:4,m:[{min:0,w:0}]}]},
    {klucz:'sobota',nazwa:'Sobota',data:'2026-10-10',godziny:[{h:5,m:[{min:50,w:0}]}]},
    {klucz:'niedziela',nazwa:'Niedziela',data:'2026-10-11',godziny:[{h:7,m:[{min:30,w:0}]}]},
  ],objasnienia:['X – kurs przez osiedle'],wazny_od:'20260922',wazny_do:'20261031'};
  let failure: false|'http'|'json'|'shape'=false;
  let terminal=false;
  const courseQueries: URL[] = [];
  let courseFailure = false;
  await page.setRequestInterception(true);
  page.on('request',async request=>{
    const url=new URL(request.url()); const path=url.pathname;
    const json=(body:unknown,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
    if (/\/map-style(?:-ciemny)?\.json$/.test(path)) await json({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#101010'}}]});
    else if (path.endsWith('/api/stops')) await json([stop]);
    else if (path.endsWith('/api/lines')) await json([{id:'43',number:'43',type:'BUS'}]);
    else if (path.endsWith('/api/line/43/route')) await json({linia:'43',trayectos:[{trayecto_id:11,direccion:1,nazwa:'Alpha',tekst_kierunkowy:'Alpha',punkty:[[53.134,18.01],[53.135,18.011]],przystanki:[stop]}]});
    else if (path.endsWith('/timetable')) {
      queries.push(url);
      if (failure==='http') await json({error:'Tablica chwilowo niedostępna'},503);
      else if(failure==='json') await request.respond({status:200,contentType:'application/json',body:'{invalid'});
      else if(failure==='shape') await json({...timetable,dni:[{klucz:'robocze',nazwa:'Dni powszednie',godziny:'invalid'}]});
      else if(terminal) await json({...timetable,dni:[],powod:'Przystanek końcowy — tylko przyjazdy.'});
      else {const date=url.searchParams.get('date'); await json({...timetable,dni:date?timetable.dni.filter(day=>day.data===date):timetable.dni});}
    }
    else if(path.endsWith('/trip-run')) {
      courseQueries.push(url);
      await json(courseFailure ? {error:'Nie znaleziono tego kursu'} : {linia:'43',kierunek:url.searchParams.get('kierunek'),odjazd:url.searchParams.get('time'),dzien:{klucz:url.searchParams.get('day'),nazwa:'Wybrany dzień',data:url.searchParams.get('date')},przystanki:[{id:42,nazwa:'Urząd Gminy',czas:url.searchParams.get('time'),lat:53.134,lon:18.01,wybrany:true},{id:43,nazwa:'Koniec wariantu',czas:'02:00',lat:53.17,lon:18.07}],punkty:[[53.134,18.01],[53.17,18.07]]},courseFailure?404:200);
    }
    else if(path.endsWith('/departures')) await json([{linia:'43',cel:'Alpha',czas:'5 min',atMs:Date.now()+300000}]);
    else if(path.includes('/api/')) await json([]);
    else await request.continue();
  });
  await page.goto(`${process.env.TEST_BASE_URL||'http://127.0.0.1:1500'}/bydgoszcz/?line=43`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#linePanelStrip [data-stop-id="42"]');
  if(await page.$('#uiZgodaOk')) await page.click('#uiZgodaOk');
  await page.click('#linePanelStrip [data-stop-id="42"]');
  await page.waitForSelector('#timetableHours .line-tt__min');
  assert.equal(queries[0].searchParams.get('stop'),'42');
  assert.equal(queries[0].searchParams.get('name'),stop.nazwa);
  assert.equal(await page.$eval('#timetableDate',(el:any)=>el.value),'2026-10-05');
  assert.equal(await page.$eval('#timetableDays [data-active="1"]',el=>el.getAttribute('data-day-key')),'robocze');
  assert.equal(await page.$eval('#timetableVariants [data-active="1"]',el=>el.getAttribute('data-variant-id')),'0');
  assert.deepEqual(await page.$$eval('#timetableHours [data-time]',els=>els.map(el=>el.getAttribute('data-time'))),['01:10','01:30','04:00']);
  assert.equal(await page.$eval('#timetableHours [data-next="1"]',el=>el.getAttribute('data-time')),'01:30');
  assert.match(await page.$eval('.line-tt__foot',el=>el.textContent||''),/22\.09\.2026.*31\.10\.2026/);
  await page.click('#timetableVariants [data-variant-id="1"]');
  assert.deepEqual(await page.$$eval('#timetableHours [data-time]',els=>els.map(el=>el.getAttribute('data-time'))),['01:35']);
  assert.equal(await page.$eval('.line-tt__mark',el=>el.textContent),'X');
  await page.focus('#timetableHours [data-time="01:35"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#timetableCourse [data-stop-id="43"]');
  assert.equal(courseQueries.at(-1)!.searchParams.get('date'),'2026-10-05');
  assert.equal(courseQueries.at(-1)!.searchParams.get('kierunek'),'Beta');
  assert.equal(courseQueries.at(-1)!.searchParams.get('wariant'),'X');
  assert.equal(await page.$eval('#timetableCourse [data-active="1"]',el=>el.getAttribute('data-stop-id')),'42');
  await page.click('#timetableBack');
  await page.waitForFunction(()=>!document.querySelector('#timetableCourse'));
  assert.equal(await page.$eval('#timetableVariants [data-active="1"]',el=>el.getAttribute('data-variant-id')),'1');
  await page.click('#timetableVariants button:first-child');
  assert.equal(await page.$$eval('#timetableHours [data-time]',els=>els.length),4);
  await page.click('#timetableDays [data-day-key="sobota"]');
  assert.equal(await page.$('#timetableHours [data-next="1"]'),null);
  assert.equal(await page.$eval('#timetableHours [data-time]',el=>el.getAttribute('data-time')),'05:50');
  const pickDate=async(date:string)=>{
    await page.$eval('#timetableDate',(el:any,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));},date);
    await page.click('.timetable-panel__date button[type="submit"]');
  };
  await pickDate('2026-10-10');
  await page.waitForSelector('#timetableDefaultDays');
  await page.waitForSelector('#timetableHours [data-time="05:50"]');
  assert.equal(queries.at(-1)!.searchParams.get('date'),'2026-10-10');
  assert.equal(await page.$$eval('#timetableDays button',els=>els.length),1);
  courseFailure=true;
  await page.click('#timetableHours [data-time="05:50"]');
  await page.waitForSelector('#timetableCourseRetry');
  assert.equal(courseQueries.at(-1)!.searchParams.get('date'),'2026-10-10');
  assert.equal(courseQueries.at(-1)!.searchParams.get('wariant'),'');
  courseFailure=false;await page.click('#timetableCourseRetry');
  await page.waitForSelector('#timetableCourse [data-stop-id="43"]');
  await page.click('#timetableBack');
  await page.waitForFunction(()=>!document.querySelector('#timetableCourse'));
  failure='http';await pickDate('2026-10-11');
  await page.waitForSelector('#timetableRetry');
  assert.ok((await page.$eval('#timetablePanel',el=>el.textContent||'')).includes('Tablica chwilowo niedostępna'));
  for(const invalid of ['json','shape'] as const){
    failure=invalid;
    const response=page.waitForResponse(res=>new URL(res.url()).pathname.endsWith('/timetable'));
    await page.click('#timetableRetry');await response;await page.waitForSelector('#timetableRetry');
    assert.deepEqual(errors,[]);
  }
  failure=false;await page.click('#timetableRetry');
  await page.waitForSelector('#timetableHours [data-time="07:30"]');
  assert.equal(await page.$('#timetableHours [data-next="1"]'),null);
  await page.click('#timetableDefaultDays');
  await page.waitForFunction(()=>document.querySelectorAll('#timetableDays button').length===3);
  await page.screenshot({path:`/tmp/busearch-timetable-${width}.png`});
  assert.ok(await page.$eval('#timetablePanel',el=>el.scrollWidth<=el.clientWidth));
  await page.waitForFunction(() => {
    const pin = document.querySelector('.stop-marker--selected')?.getBoundingClientRect();
    const sheet = document.querySelector('#timetablePanel')?.getBoundingClientRect();
    const top = document.querySelector('#topbar')?.getBoundingClientRect();
    return pin && sheet && top && pin.bottom < sheet.top && pin.top > top.bottom;
  });
  await page.click('#timetableLive');
  await page.waitForSelector('#stopPanelTitle');
  assert.equal(await page.$('#timetablePanel'),null);
  assert.equal(await page.$eval('#linePanel',el=>getComputedStyle(el).display),'none');
  await page.click('#stopPanelClose');
  await page.waitForFunction(()=>document.querySelector('#linePanel')?.getAttribute('data-open')==='1');
  terminal=true;await page.click('#linePanelStrip [data-stop-id="42"]');
  await page.waitForFunction(()=>document.querySelector('#timetableHours')?.textContent?.includes('tylko przyjazdy'));
  assert.equal(await page.$('#timetableRetry'),null);
  await page.click('#timetableBack');
  await page.waitForFunction(()=>document.querySelector('#linePanel')?.getAttribute('data-open')==='1');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: course date/direction/letter, keyboard selection, failure/retry and return; timetable stop ID, Warsaw clock in Hawaii, default direction and day, nearest departure, variants/legend, date query, failure/retry, empty terminus, live departures and return to line.`);
  await page.close();
 }
}finally{await browser.close();}
