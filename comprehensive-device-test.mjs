import { chromium } from 'playwright';

const devices = [
  { name: 'iphone-se', width: 375, height: 812, label: '📱 iPhone SE (375px)' },
  { name: 'iphone-12', width: 390, height: 844, label: '📱 iPhone 12 Pro (390px)' },
  { name: 'samsung-s21', width: 412, height: 915, label: '📱 Samsung S21 (412px)' },
  { name: 'ipad-mini', width: 768, height: 1024, label: '📱 iPad Mini (768px)' },
  { name: 'ipad-pro', width: 1024, height: 1366, label: '📱 iPad Pro (1024px)' },
  { name: 'desktop', width: 1280, height: 800, label: '🖥️ Desktop (1280px)' },
  { name: 'desktop-4k', width: 1920, height: 1080, label: '🖥️ Desktop 4K (1920px)' },
];

(async () => {
  const browser = await chromium.launch();
  console.log('🧪 Starting device tests...\n');
  
  for (const device of devices) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: device.width, height: device.height });
    
    try {
      await page.goto('http://localhost:3000/landing?locale=pt-BR', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for page to fully load
      await page.waitForTimeout(2000);
      
      const fileName = `/tmp/test-${device.name}.png`;
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
  console.log('\n📊 Screenshots saved to /tmp/test-*.png');
})();
