import { chromium } from 'playwright';
import fs from 'fs';

async function takeScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Screenshot Austin city chart
    console.log('Taking screenshot of Austin chart...');
    await page.goto('http://localhost:3000/austin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: '/tmp/city-chart.png',
      fullPage: true
    });
    console.log('Saved to /tmp/city-chart.png');
    
    // Screenshot comparison chart
    console.log('Taking screenshot of comparison chart...');
    await page.goto('http://localhost:3000/compare', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: '/tmp/comparison-chart.png',
      fullPage: true
    });
    console.log('Saved to /tmp/comparison-chart.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
