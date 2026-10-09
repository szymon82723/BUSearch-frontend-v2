import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({executablePath: process.env.CHROMIUM_PATH || '/snap/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.setViewport({width, height: width === 390 ? 844 : 1000});
    const stops = [
      {id: 1, nazwa: 'Środek', kod: '01', lat: 53.134, lon: 18.013, lines: ['43', '44']},
      {id: 2, nazwa: 'Urząd Gminy', kod: '02', lat: 53.133, lon: 18.01, lines: ['43']},
      {id: 3, nazwa: 'Urząd Gminy', kod: '03', lat: 53.15, lon: 18.1, lines: ['43']},
    ];
    const variants = [
      {trayecto_id: 11, direccion: 1, nazwa: 'Do Złejwsi', tekst_kierunkowy: 'Zławieś Wielka', punkty: [[53.133,18.01],[53.134,18.013]], przystanki: [{...stops[0],kolejnosc: 1}, {...stops[1],kolejnosc: 0}, {...stops[1],kolejnosc: 2}, {id: 4,nazwa:'Tylko w wariancie',lat:53.134,lon:18.012,kolejnosc:3}]},
      {trayecto_id: 21, direccion: 2, nazwa: 'Powrót', tekst_kierunkowy: 'Przylesie', punkty: [[53.15,18.1],[53.15,18.104]], przystanki: [{...stops[2],kolejnosc:0}]},
    ];
    let failRoute: false | 'http' | 'shape' | 'json' | 'stops' = false;
    let routeRequests = 0;
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const path = new URL(request.url()).pathname;
      const json = (body: unknown, status = 200) => request.respond({status, contentType:'application/json', body:JSON.stringify(body)});
      if (/\/map-style(?:-ciemny)?\.json$/.test(path)) await json({version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#101010'}}]});
      else if (path.endsWith('/api/vehicles')) await json([
        {nr_boczny:'BUS43',linia:'43',lat:53.134,lon:18.012,cel:'Zławieś',predkosc:10},
        {nr_boczny:'BUS44',linia:'44',lat:53.134,lon:18.013,cel:'Inny',predkosc:10},
      ]);
      else if (path.endsWith('/api/stops')) await json(stops);
      else if (path.endsWith('/api/lines')) await json([{id:'43',number:'43',type:'BUS'},{id:'44',number:'44',type:'BUS'}]);
      else if (path.endsWith('/api/line/43/route')) {
        routeRequests++;
        if (failRoute === 'json') await request.respond({status: 200, contentType: 'application/json', body: '{broken'});
        else await json(failRoute === 'stops' ? {linia:'43',trayectos:[{...variants[0],przystanki:{invalid:true}}]} : failRoute ? {} : {linia:'43',trayectos:variants},failRoute === 'http' ? 503 : 200);
      }
      else if (path.endsWith('/api/line/44/route')) await json({linia:'44',trayectos:[{...variants[0],trayecto_id:31,tekst_kierunkowy:'Inny kierunek',przystanki:[stops[0]]}]});
      else if (path.endsWith('/timetable')) await json({linia:'43',przystanek:{id:'4',nazwa:'Tylko w wariancie'},warianty:[{idx:0,litera:null,kierunek:'Zławieś Wielka'}],dni:[{klucz:'robocze',nazwa:'Dni powszednie',data:'2026-10-05',godziny:[{h:14,m:[{min:5,w:0}]}]}]});
      else if (path.includes('/api/')) await json([]);
      else await request.continue();
    });
    await page.goto(`${process.env.TEST_BASE_URL || 'http://127.0.0.1:1500'}/bydgoszcz/?line=43`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#linePanelStrip [data-stop-id]');
    if (await page.$('#uiZgodaOk')) await page.click('#uiZgodaOk');
    const ids = () => page.$$eval('#linePanelStrip [data-stop-id]', elements => elements.map(el => Number(el.getAttribute('data-stop-id'))));
    assert.deepEqual(await ids(),[2,1,2,4]);
    assert.match(await page.$eval('#linePanelMeta',el => el.textContent || ''),/4 przystanków.*1\/2/);
    const waitLongitude = (min:number,max:number) => page.waitForFunction((low,high) => {
      const entry=document.cookie.split('; ').find(item=>item.startsWith('busearch_map_state_v1__bydgoszcz='));
      if (!entry) return false;
      const lon=JSON.parse(decodeURIComponent(entry.slice(entry.indexOf('=')+1))).lon;
      return lon>low&&lon<high;
    },{},min,max);
    await waitLongitude(18.0,18.02);
    await page.waitForSelector('.veh-marker[data-line="43"]');
    assert.equal(await page.$('.veh-marker[data-line="44"]'), null);
    await page.click('#linePanelDir');
    await page.waitForFunction(()=>document.querySelector('#linePanelTitleText')?.textContent==='Przylesie');
    assert.deepEqual(await ids(),[3]);
    await waitLongitude(18.09,18.12);
    await page.click('#linePanelDir');
    assert.deepEqual(await ids(),[2,1,2,4]);
    await page.click('#linePanel .ui-routepanel__handle');
    await page.waitForFunction(()=>document.querySelector('#linePanel')?.getAttribute('data-expanded')==='1');
    await page.focus('#linePanelStrip [data-stop-id="4"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.stop-marker--selected[data-stop-id="4"]');
    assert.match(await page.$eval('#timetablePanelTitle',el=>el.textContent||''),/Tylko w wariancie/);
    assert.equal(await page.$eval('#linePanel', el => getComputedStyle(el).display), 'none');
    await page.click('#timetableBack');
    await page.waitForFunction(() => document.querySelector('#linePanel')?.getAttribute('data-open') === '1');
    assert.equal(await page.$eval('#linePanel', el => el.getAttribute('data-expanded')), '1');
    assert.deepEqual(await ids(), [2,1,2,4]);
    await page.type('#searchLine','43');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#linePanelDir');
    await page.click('#linePanelDir');
    await page.$eval('#searchLine',(el:any)=>{el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.click('#searchLine');
    await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
    await page.type('#searchLine','44'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#linePanelTitleText')?.textContent==='Inny kierunek');
    assert.deepEqual(await ids(),[1]);
    await page.waitForSelector('.veh-marker[data-line="44"]');
    assert.equal(await page.$('.veh-marker[data-line="43"]'), null);
    failRoute = 'http';
    await page.click('#searchLine'); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
    await page.type('#searchLine','43'); await page.keyboard.press('Enter');
    await page.waitForSelector('#linePanelStrip .line-strip__empty button');
    assert.deepEqual(await ids(),[]);
    for (const invalid of ['shape', 'json', 'stops'] as const) {
      failRoute = invalid;
      const response = page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/api/line/43/route'));
      await page.click('#linePanelStrip .line-strip__empty button');
      await response;
      await page.waitForSelector('#linePanelStrip .line-strip__empty button');
      assert.deepEqual(await ids(), []);
      assert.deepEqual(errors, []);
    }
    const beforeRetry=routeRequests; failRoute=false;
    await page.click('#linePanelStrip .line-strip__empty button');
    await page.waitForSelector('#linePanelStrip [data-stop-id]');
    assert.equal(routeRequests,beforeRetry+1);
    assert.deepEqual(await ids(),[2,1,2,4]);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`/tmp/busearch-line-variant-${width}.png`});
    console.log(`PASS ${width}px: direction controls ordered platform IDs and map bounds, preserves repeated stops, opens missing-list stop timetable by keyboard and returns to expanded line, resets on another line and retries route failure.`);
    await page.close();
  }
} finally {await browser.close();}
