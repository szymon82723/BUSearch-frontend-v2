import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { layoutVehicleMarkers } from '../src/config/vehicle-marker-layout';

const boxes = Array.from({length: 20}, (_, i) => ({id: String(i), x: 100, y: 100, width: 90, height: 50}));
const offsets = layoutVehicleMarkers(boxes);
assert.deepEqual(offsets, layoutVehicleMarkers([...boxes].reverse()));
for (const a of boxes) for (const b of boxes) {
  if (a.id === b.id) continue;
  const pa = offsets.get(a.id)!;
  const pb = offsets.get(b.id)!;
  assert.ok(Math.abs(pa[0] - pb[0]) >= 98 || Math.abs(pa[1] - pb[1]) >= 58);
}
assert.deepEqual(layoutVehicleMarkers([boxes[0]]).get('0'), [0, 0]);

const browser = await puppeteer.launch({executablePath: '/snap/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
try {
  for (const [width, height] of [[390,844], [844,390], [1440,900]]) {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.setViewport({width, height, isMobile: width !== 1440, hasTouch: width !== 1440});
    await page.evaluateOnNewDocument(() => {
      document.cookie = 'busearch_map_state_v1__bydgoszcz=' + encodeURIComponent(JSON.stringify({lat:53.117,lon:17.966,zoom:16.25,showOffline:false})) + '; Path=/';
    });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const path = new URL(request.url()).pathname;
      const json = (body: unknown) => request.respond({status:200, contentType:'application/json',body:JSON.stringify(body)});
      if (/\/map-style(?:-ciemny)?\.json$/.test(path)) await json({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#101010'}}]});
      else if (path.endsWith('/api/vehicles')) await json([52,53,54].map(line => ({nr_boczny:`TEST-${line}`, wiki_nr:String(line),linia:String(line),cel:'Błonie',lat:53.117,lon:17.966,predkosc:0})));
      else if (path.endsWith('/api/stops') || path.endsWith('/api/lines') || path.endsWith('/departures')) await json([]);
      else if (path.endsWith('/etas')) await json({ok:true,stops:[],currentIndex:-1,nextIndex:-1});
      else if (path.includes('/api/') && path.endsWith('/route')) await json({trayectos:[]});
      else await request.continue();
    });
    await page.goto(`${process.env.TEST_BASE_URL || 'http://127.0.0.1:1500'}/bydgoszcz/`, {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 3);
    if (await page.$('#uiZgodaOk')) await page.click('#uiZgodaOk');
    for (const line of [52,53,54]) {
      await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 3);
      const selector = `.veh-marker[data-line="${line}"]`;
      await page.waitForFunction(selector => {
        const element = document.querySelector(selector)!;
        const rect = element.getBoundingClientRect();
        return document.elementFromPoint(rect.x + rect.width/2,rect.y + rect.height/2)?.closest('.veh-marker') === element;
      }, {}, selector);
      if (width === 1440) await page.click(selector); else await page.tap(selector);
      await page.waitForFunction(line => document.querySelector('#routePanelTitleText')?.textContent?.includes(`TEST-${line}`), {}, line);
      await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 1);
      await page.click('#routePanelClose');
    }
    await page.waitForFunction(() => document.querySelectorAll('.veh-marker__tether').length === 2);
    await page.screenshot({path:`/tmp/busearch-overlap-${width}.png`});
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}x${height}: three coincident buses individually selectable`);
    await page.close();
  }
} finally { await browser.close(); }
