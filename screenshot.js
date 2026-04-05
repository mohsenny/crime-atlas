import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Wait for dev server to be ready
  await page.goto('http://localhost:3000/austin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Screenshot city chart
  await page.screenshot({ path: '/Users/mohsennasiri/Private/crime-atlas/screenshot-city-chart.png', fullPage: false });
  
  // Navigate to comparison chart
  await page.goto('http://localhost:3000/compare', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Screenshot comparison chart
  await page.screenshot({ path: '/Users/mohsennasiri/Private/crime-atlas/screenshot-comparison-chart.png', fullPage: false });
  
  await browser.close();
  console.log('Screenshots taken');
})();
