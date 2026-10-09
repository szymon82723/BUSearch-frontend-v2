import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// Requires the running beta/Vite server. Notification writes are intercepted.
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:1500';
const browser = await puppeteer.launch({executablePath: process.env.CHROMIUM_PATH || '/snap/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  const departureUrls: string[] = [];
  let failDepartures = false;
  let watches: Record<string, unknown>[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'share', {value: undefined});
    Object.defineProperty(navigator, 'clipboard', {value: {writeText: async (url: string) => { (window as any).__sharedUrl = url; }}});
    (window as any).AndroidLogin = {getFcmToken: () => 'test-token', requestNotificationPermission: () => {}};
  });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) => request.respond({status, contentType: 'application/json', body: JSON.stringify(body)});
    if (/\/api\/stop\/\d+\/departures$/.test(url.pathname)) {
      departureUrls.push(url.toString());
      await json(failDepartures ? {error: 'test outage'} : Array.from({length: 8}, (_, index) => ({linia: '3', cel: 'Testowy kierunek', czas: `${index + 3} min`, atMs: Date.now() + (index + 3) * 60000, source: 'gtfs'})), failDepartures ? 503 : 200);
    } else if (url.pathname.endsWith('/api/push/fcm-subscribe')) {
      await json({ok: true});
    } else if (url.pathname.includes('/api/notify-watches')) {
      if (request.method() === 'POST') watches = [{...JSON.parse(request.postData()!), id: 'test-watch'}];
      if (request.method() === 'DELETE') watches = [];
      await json({ok: true, watches});
    } else await request.continue();
  });
  await page.goto(`${base}/bydgoszcz/?stop=482`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#stopPanelTitle');
  if (await page.$('#uiZgodaOk')) await page.click('#uiZgodaOk');
  assert.match(await page.$eval('#stopPanelTitle', node => node.textContent || ''), /Garbary/);
  for (const id of ['stopPanelFav', 'stopPanelAtTime', 'stopPanelShare', 'stopPanelBell', 'stopPanelClose']) assert.ok(await page.$(`#${id}`), id);
  await page.waitForFunction(() => document.querySelector('#stopPanelList')?.children.length === 8);
  await page.waitForFunction(() => { const panel = document.querySelector('#stopPanel'); return panel && getComputedStyle(panel).opacity === '1'; });
  const visibleRows = () => page.$$eval('#stopPanelList .stop-panel__row', nodes => nodes.filter(node => getComputedStyle(node).display !== 'none' && getComputedStyle(node).opacity !== '0').length);
  assert.equal(await visibleRows(), 2);
  await page.click('#stopPanelHandle');
  assert.equal(await visibleRows(), 8);
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.ok(await page.$eval('#stopPanel', el => el.getBoundingClientRect().height > 300));
  await page.click('#stopPanelHandle');
  assert.equal(await visibleRows(), 2);
  await new Promise(resolve => setTimeout(resolve, 350));
  await page.click('#stopPanelHandle');
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.equal(await page.$eval('#stopPanel', el => el.getAttribute('data-expanded')), '1');
  assert.equal(await visibleRows(), 8);
  await page.click('#stopPanelFav');
  assert.equal(await page.$eval('#stopPanelFav', node => node.getAttribute('aria-pressed')), 'true');
  await page.click('#stopPanelShare');
  await page.waitForFunction(() => Boolean((window as any).__sharedUrl));
  assert.equal(new URL(await page.evaluate(() => (window as any).__sharedUrl)).searchParams.get('stop'), '482');
  await page.click('#stopPanelAtTime');
  await page.$eval('#stopPanelDateTime', (input: any) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; setter.call(input, '2026-10-05T12:00'); input.dispatchEvent(new Event('input', {bubbles: true})); });
  await page.click('.stop-panel__time-form button[type=submit]');
  await page.waitForSelector('#stopPanelScheduleBack');
  await page.waitForFunction(() => document.querySelector('#stopPanelList')?.textContent?.includes('Testowy kierunek'));
  assert.ok(departureUrls.some(url => new URL(url).searchParams.get('schedule') === '1' && new URL(url).searchParams.has('after')));
  await page.click('#stopPanelScheduleBack');
  await page.waitForSelector('#stopPanelScheduleBack', {hidden: true});
  await page.click('#stopPanelBell');
  await page.waitForSelector('#notifySetBtn');
  await page.click('#notifySetBtn');
  await page.waitForSelector('#notifyRemoveBtn');
  assert.equal(watches.length, 1);
  assert.equal(watches[0].stopId, 482);
  await page.click('#notifyRemoveBtn');
  await page.waitForSelector('#notifyRemoveBtn', {hidden: true});
  assert.equal(watches.length, 0);
  await page.click('#stopPanelBell');
  failDepartures = true;
  await page.waitForFunction(() => document.querySelector('#stopPanel')?.textContent?.includes('Nie udało się pobrać odjazdów'), {timeout: 12000});
  failDepartures = false;
  await page.click('.stop-panel__tracking-error button');
  await page.waitForFunction(() => !document.querySelector('.stop-panel__tracking-error') && document.querySelector('#stopPanelList')?.textContent?.includes('Testowy kierunek'));
  await page.focus('#stopPanelHandle');
  const before = await page.$eval('#stopPanel', node => (node as HTMLElement).dataset.expanded);
  await page.keyboard.press('Enter');
  assert.notEqual(await page.$eval('#stopPanel', node => (node as HTMLElement).dataset.expanded), before);
  assert.deepEqual(errors, []);
  console.log('PASS: deep link, five stop actions, favourite, sharing, selected time, mocked notification creation/removal, API failure/retry, keyboard handle; no browser errors.');
  for (const stopId of [2002, 2003]) {
    const zlawies = await browser.newPage();
    await zlawies.setViewport({width: 390, height: 844});
    await zlawies.setRequestInterception(true);
    const linkedRequests: number[] = [];
    const destination = stopId === 2002 ? 'Zławieś Wielka - Urząd Gminy' : 'Przylesie pętla';
    const linkedDestination = stopId === 2002 ? 'Zławieś Wielka - Urząd Gminy' : 'Uniwersytet';
    zlawies.on('request', async request => {
      const path = new URL(request.url()).pathname;
      const json = (body: unknown) => request.respond({status: 200, contentType: 'application/json', body: JSON.stringify(body)});
      if (/\/map-style(?:-ciemny)?\.json$/.test(path)) await json({version: 8, sources: {}, layers: [{id: 'background', type: 'background', paint: {'background-color': '#101010'}}]});
      else if (path.endsWith('/api/stops')) await json([{id: stopId, nazwa: 'Zławieś Wielka - Urząd Gminy', kod: stopId === 2002 ? '13337' : '13338', lat: 53.096, lon: 18.331, lines: ['43']}]);
      else if (/\/torun\/api\/stop\/\d+\/departures$/.test(path)) {
        linkedRequests.push(Number(path.match(/stop\/(\d+)/)![1]));
        await json([{linia: '132', cel: linkedDestination, czas: '10 min', atMs: Date.now() + 600000}, {linia: '43', cel: 'Nie ten słupek', czas: '10 min'}]);
      } else if (path.endsWith('/departures')) await json(Array.from({length: 5}, (_, i) => ({linia: '43', cel: destination, czas: `${i + 5} min`, atMs: Date.now() + (i + 5) * 60000})));
      else if (path.includes('/api/')) await json([]);
      else await request.continue();
    });
    await zlawies.goto(`${base}/bydgoszcz/?stop=${stopId}`, {waitUntil: 'domcontentloaded'});
    await zlawies.waitForFunction(() => document.querySelector('#stopPanelList')?.textContent?.includes('132'));
    assert.deepEqual([...new Set(linkedRequests)], [stopId === 2002 ? 2234 : 2233]);
    assert.equal(await zlawies.$$eval('#stopPanelList .stop-panel__row', rows => rows.filter(row => getComputedStyle(row).opacity !== '0').length), 2);
    assert.ok(!(await zlawies.$eval('#stopPanelList', el => el.textContent || '')).includes('Nie ten słupek'));
    if (await zlawies.$('#uiZgodaOk')) await zlawies.click('#uiZgodaOk');
    assert.equal(await zlawies.$('#stopPanelExpand'), null);
    const handle = await zlawies.$('#stopPanelHandle');
    const bounds = (await handle!.boundingBox())!;
    await zlawies.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await zlawies.mouse.down();
    await zlawies.mouse.move(bounds.x + bounds.width / 2, bounds.y - 180, {steps: 12});
    await zlawies.mouse.up();
    await zlawies.waitForFunction(() => document.querySelector('#stopPanel')?.getAttribute('data-expanded') === '1');
    assert.equal(await zlawies.$$eval('#stopPanelList .stop-panel__row', rows => rows.filter(row => getComputedStyle(row).opacity !== '0').length), 6);
    assert.ok((await zlawies.$eval('#stopPanelList', el => el.textContent || '')).includes(linkedDestination));
    await zlawies.close();
  }
  for (const stopId of [2234, 2233]) {
    const torun = await browser.newPage();
    await torun.setViewport({width: 390, height: 844});
    await torun.setRequestInterception(true);
    const requests: string[] = [];
    const atMs = Date.now() + 600000;
    const destination43 = stopId === 2234 ? 'Zławieś Wielka - Urząd Gminy' : 'Przylesie pętla';
    const destination132 = stopId === 2234 ? 'Zławieś Wielka - Urząd Gminy' : 'Uniwersytet';
    const row43 = {linia: '43', cel: destination43, czas: '10 min', atMs, sourceCity: 'bydgoszcz'};
    const row132 = {linia: '132', cel: destination132, czas: '10 min', atMs};
    torun.on('request', async request => {
      const path = new URL(request.url()).pathname;
      const json = (body: unknown) => request.respond({status: 200, contentType: 'application/json', body: JSON.stringify(body)});
      if (/\/map-style(?:-ciemny)?\.json$/.test(path)) await json({version: 8, sources: {}, layers: [{id: 'background', type: 'background', paint: {'background-color': '#101010'}}]});
      else if (path.endsWith('/api/stops')) await json([{id: stopId, nazwa: 'ZŁAWIEŚ WIELKA - Urząd Gminy', kod: stopId === 2234 ? '99225' : '99226', lat: 53.096, lon: 18.331, lines: ['43', '132']}]);
      else if (path.endsWith('/departures')) {
        requests.push(path);
        await json(path.startsWith('/bydgoszcz/') ? [row43] : [row43, row132]);
      }
      else if (path.includes('/api/')) await json([]);
      else await request.continue();
    });
    await torun.goto(`${base}/torun/?stop=${stopId}`, {waitUntil: 'domcontentloaded'});
    await torun.waitForFunction(() => document.querySelector('#stopPanelList')?.textContent?.includes('132'));
    assert.deepEqual([...new Set(requests)].sort(), [`/bydgoszcz/api/stop/${stopId === 2234 ? 2002 : 2003}/departures`, `/torun/api/stop/${stopId}/departures`].sort());
    assert.equal(await torun.$$eval('#stopPanelList .stop-panel__row', rows => rows.length), 2);
    const contents = await torun.$eval('#stopPanelList', el => el.textContent || '');
    assert.ok(contents.includes(destination43) && contents.includes(destination132));
    if (stopId === 2234) assert.ok(!contents.includes('Przylesie') && !contents.includes('Uniwersytet'));
    else assert.ok(!contents.includes('Zławieś Wielka'));
    await torun.close();
  }
  console.log('PASS: Toruń 2234/2233 request only matching poles, preserve direction and deduplicate shared line 43 by source city.');
  console.log('PASS: Zławieś 2002/2003 link the matching line 132 platform, discard foreign line 43, and expand all departures by dragging the handle without an extra button.');
} finally { await browser.close(); }
