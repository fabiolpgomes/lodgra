import { chromium } from 'playwright';

const devices = [
  { name: 'iphone-se', width: 375, height: 812 },
  { name: 'iphone-12', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];

(async () => {
  const browser = await chromium.launch();
  
  for (const device of devices) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: device.width, height: device.height });
    
    try {
      // Clear cookies & cache
      await page.context().clearCookies();
      
      // Navigate to landing
      const response = await page.goto('http://localhost:3000/landing?locale=pt-BR', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      if (!response?.ok()) {
        console.log(`Warning: Response status ${response?.status()}`);
      }
      
      // Wait longer for all content to load
      await page.waitForTimeout(3000);
      
      // Scroll to top to ensure we capture hero
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);
      
      const fileName = `/tmp/landing-${device.name}-v2.png`;
      await page.screenshot({ path: fileName, fullPage: true });
      console.log(`✅ ${device.name}: ${fileName}`);
      
    } catch (error) {
      console.error(`❌ ${device.name}: ${error.message}`);
    } finally {
      await page.close();
    }
  }
  
  await browser.close();
  console.log('\n✅ Retry complete!');
})();
