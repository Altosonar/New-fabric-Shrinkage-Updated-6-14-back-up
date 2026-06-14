import { chromium, devices } from 'playwright';

const TEST_URL = 'http://localhost:5175/';
const DEVICE_LIST = ['iPhone 12', 'iPhone SE', 'Pixel 5'];
const SELECTORS = [
  { name: 'Preview card', sel: '.shrinkage-preview' },
  { name: 'Preview box', sel: '.preview-box' },
  { name: 'Calculate button', sel: '.calc-btn-container .btn' },
  { name: 'First tab', sel: '.tabs-container .tab-btn' },
  { name: 'First input', sel: '.input-group input' },
  { name: 'First range slider', sel: 'input[type=range]' },
  { name: 'Length display', sel: '#lengthDisplay' },
  { name: 'Width display', sel: '#widthDisplay' }
];

(async () => {
  const browser = await chromium.launch();
  const results = [];

  for (const deviceName of DEVICE_LIST) {
    const device = devices[deviceName];
    const context = await browser.newContext({ ...device });
    const page = await context.newPage();
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });

    // Wait for the calc grid to load
    await page.waitForSelector('.calc-grid');

    // small pause for layout/sticky
    await page.waitForTimeout(300);

    const innerHeight = await page.evaluate(() => window.innerHeight);
    const innerWidth = await page.evaluate(() => window.innerWidth);

    const scrollInfo = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, innerWidth: window.innerWidth, scrollX: window.scrollX }));
    const inputDiag = await page.evaluate(() => {
      const el = document.querySelector('.input-group input');
      const parent = el ? el.closest('.card') : null;
      const parentStyle = parent ? window.getComputedStyle(parent) : null;
      const tabs = document.querySelector('.tabs-container');
      const firstTab = tabs ? tabs.querySelector('.tab-btn') : null;
      const tabsStyle = tabs ? window.getComputedStyle(tabs) : null;
      const tabStyle = firstTab ? window.getComputedStyle(firstTab) : null;
      return {
        inputRect: el ? el.getBoundingClientRect() : null,
        inputComputedWidth: el ? window.getComputedStyle(el).width : null,
        parentRect: parent ? parent.getBoundingClientRect() : null,
        parentComputed: parentStyle ? { marginLeft: parentStyle.marginLeft, marginRight: parentStyle.marginRight, transform: parentStyle.transform, paddingLeft: parentStyle.paddingLeft, paddingRight: parentStyle.paddingRight, width: parentStyle.width } : null,
        tabsRect: tabs ? tabs.getBoundingClientRect() : null,
        tabsComputed: tabsStyle ? { marginLeft: tabsStyle.marginLeft, marginRight: tabsStyle.marginRight, paddingLeft: tabsStyle.paddingLeft, paddingRight: tabsStyle.paddingRight, transform: tabsStyle.transform, width: tabsStyle.width } : null,
        firstTabRect: firstTab ? firstTab.getBoundingClientRect() : null,
        firstTabComputed: tabStyle ? { marginLeft: tabStyle.marginLeft, marginRight: tabStyle.marginRight, paddingLeft: tabStyle.paddingLeft, paddingRight: tabStyle.paddingRight, transform: tabStyle.transform, width: tabStyle.width } : null
      };
    });

    const deviceReport = { device: deviceName, viewport: { innerWidth, innerHeight }, scrollInfo, inputDiag, checks: [] };

    for (const s of SELECTORS) {
      const exists = await page.$(s.sel);
      if (!exists) {
        deviceReport.checks.push({ name: s.name, selector: s.sel, exists: false, fullyVisible: false });
        continue;
      }
      const visible = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { exists: false };
        const rect = el.getBoundingClientRect();
        const inView = rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
        const partially = !(rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth);
        const display = window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden' && el.offsetParent !== null;
        return { exists: true, rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height }, fullyVisible: inView, partiallyVisible: partially, displayed: display };
      }, s.sel);

      deviceReport.checks.push({ name: s.name, selector: s.sel, ...visible });
    }

    // take screenshot for review
    const screenshotName = `mobile-visibility-${deviceName.replace(/\s+/g, '-')}.png`;
    await page.screenshot({ path: `./${screenshotName}`, fullPage: true });
    deviceReport.screenshot = screenshotName;

    results.push(deviceReport);
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();