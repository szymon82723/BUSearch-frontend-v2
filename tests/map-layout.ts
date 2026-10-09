import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browser=await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH || "/snap/bin/chromium",headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader"]});
try {
 const page=await browser.newPage(); const errors:string[]=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.goto(`${process.env.TEST_BASE_URL || 'http://127.0.0.1:1500'}/bydgoszcz/`,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#announceBannerLink',{timeout:30000});
 if(await page.$('#uiZgodaOk')) await page.click('#uiZgodaOk');
 await page.click('#announceBannerLink');
 await page.waitForSelector('#announceModalBody img',{timeout:10000});
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('#announceModalBody img')).every((i:any)=>i.complete),{timeout:20000});
 console.log('announcement',await page.evaluate(()=>{const modal=document.querySelector('.ui-announce-modal')!;const img=document.querySelector('#announceModalBody img')!;return{modalWidth:modal.clientWidth,scrollWidth:modal.scrollWidth,imageWidth:img.getBoundingClientRect().width,imageRight:img.getBoundingClientRect().right,viewport:innerWidth,focus:(document.activeElement as HTMLElement)?.id}}));
 assert.ok(await page.$eval('.ui-announce-modal', e => e.scrollWidth <= e.clientWidth));
 await page.keyboard.press('Escape');assert.equal(await page.$('#announceModal'), null);console.log('Escape closed announcement',!(await page.$('#announceModal')));
 if(await page.$('#announceModal'))await page.click('#announceModalClose');
 await page.click('#openFilters');await page.click('#filterElectric'); console.log('electric chip',await page.$eval('#filterElectric',e=>e.getAttribute('aria-pressed'))); await page.click('#filterElectric');await page.click('#closeFilters');
 for(const [open, panel, close] of [['#btnRozklady','#schedulesPanel','#schedulesPanelClose'],['#btnMapSearch','#polPanel','#polClose'],['#favBtn','#favoritesPanel','#favoritesPanelClose'],['#btnLayers','#layersModal','#layersModalClose']]){
 await page.click(open);await page.waitForSelector(panel);console.log(panel,await page.$eval(panel,e=>({width:e.clientWidth,scrollWidth:e.scrollWidth,open:(e as HTMLElement).dataset.open})));assert.ok(await page.$eval(panel,e=>e.scrollWidth<=e.clientWidth));await page.click(close); await page.waitForSelector(panel,{hidden:true}); }
  await page.click('#searchLine');await page.type('#searchLine','Garbary');await page.waitForSelector('#searchLineLista .ui-ac__item',{timeout:15000});assert.ok(await page.$eval('#searchLineLista',e=>e.getBoundingClientRect().top>=0));await page.screenshot({path:'/tmp/busearch-map-search.png'});await page.click('#searchLineLista .ui-ac__item');await page.waitForSelector('#stopPanel');console.log('stop',await page.$eval('#stopPanelTitle',e=>e.textContent));
 await page.click('#stopPanelHandle');console.log('expanded',await page.$eval('#stopPanel',e=>(e as HTMLElement).dataset.expanded));
 assert.deepEqual(errors, []);console.log('PASS: mobile announcement sizing and Escape, filter, schedules/planner/favourites/layers, search and stop panel; no browser errors.');
 await page.screenshot({path:'/tmp/busearch-map-audit-stop.png'});
}finally{await browser.close();}
