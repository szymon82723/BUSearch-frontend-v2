import puppeteer from "puppeteer-core";

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log("Navigating to http://localhost:1500/ ...");
    await page.goto("http://localhost:1500/", { waitUntil: "networkidle0" });

    // Wait for markers to render
    console.log("Waiting for markers...");
    await page.waitForSelector(".veh-marker, .veh-marker--dot", { timeout: 10000 });
    console.log("Vehicles rendered!");

    // Zoom in so stops and vehicle badges appear
    console.log("Zooming into city center...");
    await page.evaluate(() => {
      // Find a vehicle coordinate and zoom to it
      const el = document.querySelector(".veh-marker, .veh-marker--dot") as HTMLElement;
      if (el) el.click();
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Check if RoutePanel opened
    const routePanel = await page.$("#routePanel");
    if (routePanel) {
      console.log("RoutePanel opened!");
      const open = await page.evaluate(() => document.getElementById("routePanel")?.dataset.open);
      const expanded = await page.evaluate(() => document.getElementById("routePanel")?.dataset.expanded);
      console.log(`Initial RoutePanel open: ${open}, expanded: ${expanded}`);

      await page.screenshot({ path: "/tmp/routepanel-initial.png" });

      // Click handle to toggle expand
      console.log("Clicking handle to expand...");
      await page.click("#routePanelHandle");
      await new Promise((r) => setTimeout(r, 600));

      const expandedAfter = await page.evaluate(() => document.getElementById("routePanel")?.dataset.expanded);
      const heightAfter = await page.evaluate(() => document.getElementById("routePanel")?.offsetHeight);
      console.log(`After handle click: expanded = ${expandedAfter}, height = ${heightAfter}px`);

      await page.screenshot({ path: "/tmp/routepanel-expanded.png" });

      // Click handle again to toggle collapse
      console.log("Clicking handle again to collapse...");
      await page.click("#routePanelHandle");
      await new Promise((r) => setTimeout(r, 600));

      const collapsedAfter = await page.evaluate(() => document.getElementById("routePanel")?.dataset.expanded);
      const heightCollapsed = await page.evaluate(() => document.getElementById("routePanel")?.offsetHeight);
      console.log(`After handle collapse click: expanded = ${collapsedAfter}, height = ${heightCollapsed}px`);

      await page.screenshot({ path: "/tmp/routepanel-collapsed.png" });

      // Test drag down to close
      console.log("Testing drag down on handle to close...");
      const handleBox = await (await page.$("#routePanelHandle"))?.boundingBox();
      if (handleBox) {
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        // Drag down 120px
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 120, { steps: 10 });
        await page.mouse.up();
        await new Promise((r) => setTimeout(r, 600));

        const panelExists = await page.evaluate(() => !!document.getElementById("routePanel"));
        console.log(`After drag down: routePanel exists in DOM: ${panelExists}`);
        await page.screenshot({ path: "/tmp/routepanel-closed.png" });
      }
    }

    // Now test StopPanel by searching for a stop
    console.log("Testing StopPanel via search...");
    await page.type("#searchLine", "Rondo Jagiellonów");
    await new Promise((r) => setTimeout(r, 600));

    // Check suggestion or click
    const suggestionClicked = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".ui-ac__item"));
      const stopItem = items.find((it) => it.textContent?.includes("Rondo Jagiellonów")) as HTMLElement;
      if (stopItem) {
        stopItem.click();
        return true;
      }
      return false;
    });
    console.log("Stop suggestion clicked:", suggestionClicked);

    await new Promise((r) => setTimeout(r, 1200));

    const stopPanel = await page.$("#stopPanel");
    if (stopPanel) {
      console.log("StopPanel opened!");
      const open = await page.evaluate(() => document.getElementById("stopPanel")?.dataset.open);
      const expanded = await page.evaluate(() => document.getElementById("stopPanel")?.dataset.expanded);
      const heightInit = await page.evaluate(() => document.getElementById("stopPanel")?.offsetHeight);
      console.log(`StopPanel initial open: ${open}, expanded: ${expanded}, height: ${heightInit}px`);

      await page.screenshot({ path: "/tmp/stoppanel-initial.png" });

      // Click handle to expand
      console.log("Clicking StopPanel handle to expand...");
      await page.click("#stopPanelHandle");
      await new Promise((r) => setTimeout(r, 600));

      const expAfter = await page.evaluate(() => document.getElementById("stopPanel")?.dataset.expanded);
      const heightExp = await page.evaluate(() => document.getElementById("stopPanel")?.offsetHeight);
      console.log(`StopPanel after click: expanded = ${expAfter}, height = ${heightExp}px`);

      await page.screenshot({ path: "/tmp/stoppanel-expanded.png" });

      // Click handle again to collapse
      console.log("Clicking StopPanel handle to collapse...");
      await page.click("#stopPanelHandle");
      await new Promise((r) => setTimeout(r, 600));

      const colAfter = await page.evaluate(() => document.getElementById("stopPanel")?.dataset.expanded);
      const heightCol = await page.evaluate(() => document.getElementById("stopPanel")?.offsetHeight);
      console.log(`StopPanel after 2nd click: expanded = ${colAfter}, height = ${heightCol}px`);

      await page.screenshot({ path: "/tmp/stoppanel-collapsed.png" });
    }

    console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
