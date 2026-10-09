import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH || '/snap/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => { errors.push(String(error)); console.error(error); });
    await page.setViewport({ width, height: width === 390 ? 844 : 1000 });
    const stops = Array.from({ length: 12 }, (_, id) => ({ id: id + 1, name: `Przystanek ${id + 1} 01`, lat: 53.13 + id * .001, lon: 18.01 + id * .002, plannedTime: `14:${String(id).padStart(2, '0')}`, actualTime: `14:${String(id + 2).padStart(2, '0')}`, etaMin: id * 2, delayMin: 2, passed: id === 0 }));
    // Two platforms share a name; selecting the second must preserve its ID.
    stops[2].name = stops[1].name;
    await page.evaluateOnNewDocument(() => {
      document.cookie = 'busearch_map_state_v1__bydgoszcz=' + encodeURIComponent(JSON.stringify({ lat: 53.1345, lon: 18.0209, zoom: 16.25, showOffline: false })) + '; Path=/';
      Object.defineProperty(navigator, 'share', { value: undefined });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (url: string) => { (window as any).__sharedUrl = url; } } });
    });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const path = new URL(request.url()).pathname;
      const json = (data: unknown) => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      if (/\/map-style(?:-ciemny)?\.json$/.test(path)) await json({ version: 8, glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf', sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#101010' } }] });
      else if (path.endsWith('/api/vehicles')) await json([{ nr_boczny: 'TEST-3', wiki_nr: '323', linia: '3', cel: 'Motoarena', lat: 53.1345, lon: 18.0209, predkosc: 0, layover_until_ms: Date.now() + 300000, trayecto: '1', opoznienie_s: 120, ts: '14:51:04' }, { nr_boczny: 'TEST-52', linia: '52', cel: 'Dworzec', lat: 53.1375, lon: 18.019, predkosc: 15 }]);
      else if (path.endsWith('/api/stops')) await json(stops.filter(stop => stop.id !== 6).map(stop => ({ id: stop.id, nazwa: stop.name, kod: '01', lat: stop.lat, lon: stop.lon, lines: ['3'], tram: false, kierunek: 270, kierunek_opis: 'Uniwersytet' })));
      else if (path.endsWith('/api/lines')) await json([{ id: '3', number: '3', type: 'TRAM' }]);
      else if (path.endsWith('/api/line/3/route')) await json({ linia: '3', trayectos: [{ trayecto_id: 1, nazwa: 'Motoarena', punkty: stops.map(stop => [stop.lat, stop.lon]) }] });
      else if (path.endsWith('/etas')) await json({ ok: true, stops, currentIndex: -1, nextIndex: 1 });
      else if (path.endsWith('/departures')) await json([]);
      else await request.continue();
    });
    await page.goto(`${process.env.TEST_BASE_URL || 'http://127.0.0.1:1500'}/bydgoszcz/?vehicle=TEST-3`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#routePanel .ui-routepanel__stop');
    await page.waitForSelector('.veh-marker--selected', { timeout: 60000 });
    if (await page.$('#uiZgodaOk')) await page.click('#uiZgodaOk');
    await page.waitForFunction(() => document.querySelector('#routePanel')?.getAttribute('data-open') === '1');
    assert.equal(await page.$$eval('.veh-marker', nodes => nodes.length), 1);
    await page.waitForSelector('.vehicle-map-card');
    assert.match(await page.$eval('.vehicle-map-card', el => el.textContent || ''), /ID pojazdu: TEST-3/);
    assert.equal(await page.$eval('.veh-marker--selected .veh-marker__fleet', el => el.textContent), '#323');
    assert.match(await page.$eval('.vehicle-map-card', el => el.textContent || ''), /Aktualizacja: 14:51:04/);
    assert.match(await page.$eval('.vehicle-map-card', el => el.textContent || ''), /Odjazd za 5 minut/);
    assert.equal(await page.$eval('[aria-label="Wyłącz śledzenie pojazdu"]', el => el.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$eval('#routePanelTitleText', el => el.textContent), 'Linia 3 • TEST-3');
    assert.equal(await page.$$eval('.stop-marker', nodes => nodes.length), 0);
    assert.equal(await page.$eval('#routePanelMeta', el => el.textContent), 'Motoarena');
    assert.equal(await page.$eval('#routePanelStops', el => el.children.length), 11);
    assert.ok(await page.$eval('#routePanel', el => el.scrollWidth <= el.clientWidth));
    assert.equal(await page.$$eval('#routePanel .ui-routepanel__stop', nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length), 2);
    await page.click('[aria-label="Wyłącz śledzenie pojazdu"]');
    await page.click('[aria-label="Śledź pojazd"]');
    assert.equal(await page.$eval('[aria-label="Wyłącz śledzenie pojazdu"]', el => el.getAttribute('aria-pressed')), 'true');
    await page.click('[aria-label="Wyłącz śledzenie pojazdu"]');
    await page.click('[aria-label="Udostępnij pojazd"]');
    await page.waitForFunction(() => Boolean((window as any).__sharedUrl));
    assert.equal(new URL(await page.evaluate(() => (window as any).__sharedUrl)).searchParams.get('vehicle'), 'TEST-3');
    await page.focus('#routePanelHandle');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#routePanel', el => (el as HTMLElement).dataset.expanded), '1');
    assert.equal(await page.$eval('#routePanelStops', el => el.children.length), 11);
    await page.keyboard.press('Enter');
    // Allow the map tiles and panel animation to settle before the visual check.
    await new Promise(resolve => setTimeout(resolve, 3000));
    assert.equal(await page.evaluate(() => { const cookie = document.cookie.split('; ').find(entry => entry.startsWith('busearch_map_state_v1__bydgoszcz='))!; return JSON.parse(decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1))).zoom; }), 16.25);
    await page.screenshot({ path: `/tmp/busearch-vehicle-route-${width}.png` });
    await page.click('#routePanelClose');
    await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 2);
    assert.equal(await page.$('.veh-marker[data-line="52"] .veh-marker__fleet'), null);
    await page.focus('.veh-marker[data-line="52"]');
    await page.waitForSelector('.vehicle-map-card');
    assert.match(await page.$eval('.vehicle-map-card', el => el.textContent || ''), /ID pojazdu: TEST-52/);
    await page.keyboard.press('Escape');
    assert.equal(await page.$('.vehicle-map-card'), null);
    await page.click('.veh-marker[data-line="3"]');
    await page.waitForSelector('#routePanel .ui-routepanel__stop');
    await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 1);
    assert.equal(await page.$eval('[aria-label="Wyłącz śledzenie pojazdu"]', el => el.getAttribute('aria-pressed')), 'true');
    await page.waitForFunction(() => { const panel = document.getElementById('routePanel'); return panel && getComputedStyle(panel).opacity === '1'; });
    // Click just outside the small pin to exercise the touch hit area. Stop 6
    // exists in the route response but is missing from the general stop list.
    await page.waitForFunction(() => { const cookie = document.cookie.split('; ').find(entry => entry.startsWith('busearch_map_state_v1__bydgoszcz=')); return cookie && JSON.parse(decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1))).zoom === 16.25; });
    await new Promise(resolve => setTimeout(resolve, 1200));
    const pin = await page.evaluate(() => {
      const cookie = document.cookie.split('; ').find(entry => entry.startsWith('busearch_map_state_v1__bydgoszcz='))!;
      const view = JSON.parse(decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)));
      const world = 512 * 2 ** view.zoom;
      const mercatorY = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2;
      return { x: innerWidth / 2 + (18.02 - view.lon) / 360 * world, y: innerHeight / 2 + (mercatorY(53.135) - mercatorY(view.lat)) * world };
    });
    await page.mouse.click(pin.x + 14, pin.y);

    await page.waitForSelector('#stopPanel');
    assert.match(await page.$eval('#stopPanelTitle', el => el.textContent || ''), /Przystanek 6 01/);
    assert.equal(await page.$eval('#routePanel', el => getComputedStyle(el).display), 'none');
    await page.waitForSelector('.stop-marker--selected[data-stop-id="6"]');
    assert.equal(await page.$$eval('.stop-marker--selected', nodes => nodes.length), 1);
    assert.equal(await page.$eval('.stop-marker--selected .stop-marker__dot', node => getComputedStyle(node).backgroundColor), 'rgb(248, 113, 113)');
    await page.click('#stopPanelClose');
    await page.waitForFunction(() => document.querySelector('#routePanel')?.getAttribute('data-open') === '1');
    assert.equal(await page.$eval('[aria-label="Wyłącz śledzenie pojazdu"]', el => el.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$('#stopPanel'), null);
    assert.equal(await page.$('.stop-marker--selected'), null);
    await page.waitForSelector('.veh-marker[data-line="3"]');
    await page.click('.veh-marker[data-line="3"]');
    await page.waitForSelector('#routePanel .ui-routepanel__stop');
    await page.waitForFunction(() => { const panel = document.getElementById('routePanel'); return panel && getComputedStyle(panel).opacity === '1'; });
    await page.click('#routePanel .ui-routepanel__stop:nth-child(2)');
    await page.waitForSelector('.stop-marker--selected[data-stop-id="3"]');
    assert.equal(await page.$eval('#routePanel', el => getComputedStyle(el).display), 'none');
    assert.match(await page.$eval('#stopPanelMeta', el => el.textContent || ''), /ID 3/);
    assert.equal(await page.$eval('.stop-marker--selected .stop-marker__dot', node => getComputedStyle(node).backgroundColor), 'rgb(251, 191, 36)');
    assert.equal(await page.$eval('.stop-marker--selected .stop-marker__strzalka', node => (node as HTMLElement).style.transform), 'rotate(270deg)');
    assert.equal(await page.$eval('.stop-marker--selected .stop-marker__plakietka', node => node.textContent), 'Uniwersytet');
    assert.equal(await page.$$eval('.stop-marker--selected', nodes => nodes.length), 1);
    await page.mouse.move(width / 2, 250);
    await page.mouse.wheel({ deltaY: -1200 });
    await page.waitForFunction(() => {
      const label = document.querySelector('.stop-marker--selected .stop-marker__plakietka');
      return label && getComputedStyle(label).opacity === '1';
    });
    await page.screenshot({ path: `/tmp/busearch-selected-stop-${width}.png` });
    await page.click('#stopPanelClose');
    await page.waitForFunction(() => document.querySelector('#routePanel')?.getAttribute('data-open') === '1');
    await page.focus('#routePanelHandle'); await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#routePanel', el => el.getAttribute('data-expanded')), '1');
    await page.focus('#routePanel .ui-routepanel__stop:last-child');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.stop-marker--selected[data-stop-id="12"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const view = () => page.evaluate(() => {
      const cookie = document.cookie.split('; ').find(entry => entry.startsWith('busearch_map_state_v1__bydgoszcz='))!;
      const state = JSON.parse(decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)));
      return {lat: state.lat, lon: state.lon, zoom: state.zoom};
    });
    const stopView = await view();
    await new Promise(resolve => setTimeout(resolve, 3500));
    assert.deepEqual(await view(), stopView, 'Polling must not pull the camera away from the stop');
    await page.click('#stopPanelClose');
    await page.waitForFunction(() => document.querySelector('#routePanel')?.getAttribute('data-open') === '1');
    assert.equal(await page.$eval('#routePanel', el => el.getAttribute('data-expanded')), '1');
    assert.equal(await page.$eval('[aria-label="Wyłącz śledzenie pojazdu"]', el => el.getAttribute('aria-pressed')), 'true');
    assert.deepEqual(errors, []);
    console.log(`PASS: ${width}px vehicle isolation and restoration, HTML plaque with departure countdown, zoom preserved, automatic tracking, keyboard focus, original compact panel, follow toggle, share, keyboard expansion, route pin touch target and missing-list stop selection; no browser errors.`);
    await page.close();
  }
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewport({ width: 390, height: 844 });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const path = new URL(request.url()).pathname;
    const json = (data: unknown) => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    if (/\/map-style(?:-ciemny)?\.json$/.test(path)) await json({ version: 8, glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf', sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#101010' } }] });
    else if (path.endsWith('/api/vehicles')) await json([
      { nr_boczny: '42', wiki_nr: '302', model: 'Pesa', photo: '302.jpg', linia: '3', lat: 53.02, lon: 18.61, predkosc: 0 },
      { nr_boczny: '73', model: 'Solaris', electric: true, linia: '14', lat: 53.021, lon: 18.612, predkosc: 0 },
      { nr_boczny: '74', nr_rzeczywisty: '504', model: 'Solaris', electric: true, photo: '504.jpg', linia: '15', lat: 53.022, lon: 18.614, predkosc: 0 },
    ]);
    else if (path.endsWith('/api/stops') || path.endsWith('/api/lines')) await json([]);
    else await request.continue();
  });
  await page.goto(`${process.env.TEST_BASE_URL || 'http://127.0.0.1:1500'}/torun/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 3);
  if (await page.$('#uiZgodaOk')) await page.click('#uiZgodaOk');
  await page.click('#openFilters');
  assert.equal(await page.$eval('#filterBus .ui-chip__ile', el => el.textContent), '2');
  assert.equal(await page.$eval('#filterTram .ui-chip__ile', el => el.textContent), '1');
  assert.equal(await page.$eval('#filterElectric .ui-chip__ile', el => el.textContent), '2');
  assert.equal(await page.$eval('#filterPhoto .ui-chip__ile', el => el.textContent), '2');
  await page.click('#filterBus');
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 2);
  await page.click('#filterTram');
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 3);
  await page.click('#resetFilters');
  await page.click('#filterElectric');
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 2);
  await page.click('#filterPhoto');
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 1);
  assert.equal(await page.$eval('.veh-marker', el => (el as HTMLElement).dataset.line), '15');
  assert.equal(await page.$eval('#filterElectric .ui-chip__ile', el => el.textContent), '2');
  await page.click('#resetFilters');
  await page.click('#zakladkaModele');
  await page.waitForSelector('#modelChips button');
  const modelButtons = await page.$$('#modelChips button');
  await modelButtons[1].click();
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 2);
  await modelButtons[0].click();
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 3);
  await page.focus('#zakladkaModele');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.$eval('#zakladkaOgolne', el => el.getAttribute('aria-selected')), 'true');
  await page.click('#resetFilters');
  await page.type('#filterBrigade', '504');
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 1);
  assert.equal(await page.$eval('.veh-marker', el => (el as HTMLElement).dataset.line), '15');
  await page.click('#resetFilters');
  await page.screenshot({ path: '/tmp/busearch-production-filters.png' });
  await page.click('#filterWithoutFleetNumber');
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 1);
  assert.equal(await page.$eval('.veh-marker', el => (el as HTMLElement).dataset.line), '14');
  assert.equal(await page.$eval('#filterWithoutFleetNumber', el => el.getAttribute('aria-pressed')), 'true');
  assert.match(await page.$eval('#stats', el => el.textContent || ''), /1\/3/);
  await page.click('#resetFilters');
  await page.waitForFunction(() => document.querySelectorAll('.veh-marker').length === 3);
  assert.equal(await page.$eval('#filterWithoutFleetNumber', el => el.getAttribute('aria-pressed')), 'false');
  assert.deepEqual(errors, []);
  console.log('PASS: production filter tabs, chip counts, combined vehicle/electric/photo/model filters, real fleet-number search, keyboard tabs, Toruń missing fleet-number filter excludes Wiki and real fleet numbers, keeps unmapped numeric ITS ID, and resets.');
  await page.close();

} finally { await browser.close(); }
