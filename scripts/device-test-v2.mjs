import { chromium } from 'playwright';

const devices = [
  { name: 'mobile-375', width: 375, height: 667, label: 'Mobile 375px' },
  { name: 'mobile-390', width: 390, height: 844, label: 'Mobile 390px' },
  { name: 'tablet-768', width: 768, height: 1024, label: 'Tablet 768px' },
  { name: 'desktop-1280', width: 1280, height: 800, label: 'Desktop 1280px' }
];

(async () => {
  const browser = await chromium.launch();
  
  for (const device of devices) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: device.width, height: device.height });
    
    try {
      await page.goto('http://localhost:3000/landing?locale=pt-BR', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait a bit more and scroll to top
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo(0, 0));
      
      const fileName = `/tmp/landing-${device.name}.png`;
      await page.screenshot({ path: fileName, fullPage: true });
      console.log(`✅ ${device.label}: ${fileName}`);
    } catch (error) {
      console.error(`❌ ${device.label}: ${error.message}`);
    } finally {
      await page.close();
    }
  }
  
  await browser.close();
  console.log('\n✅ Device testing complete!');
})();
