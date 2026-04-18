import { chromium } from 'playwright';

const devices = [
  { name: 'iPhone-SE', width: 375, height: 667, label: 'Mobile (375px)' },
  { name: 'iPhone-12-Pro', width: 390, height: 844, label: 'Mobile (390px)' },
  { name: 'iPad-Mini', width: 768, height: 1024, label: 'Tablet (768px)' },
  { name: 'Desktop', width: 1280, height: 720, label: 'Desktop (1280px)' }
];

(async () => {
  const browser = await chromium.launch();
  
  for (const device of devices) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: device.width, height: device.height });
    
    try {
      await page.goto('http://localhost:3000/landing?locale=pt-BR', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const fileName = `/tmp/landing-${device.name}.png`;
      await page.screenshot({ path: fileName, fullPage: true });
      console.log(`✓ ${device.label}: ${fileName}`);
    } catch (error) {
      console.error(`✗ ${device.label}: ${error.message}`);
    } finally {
      await page.close();
    }
  }
  
  await browser.close();
  console.log('\n✅ Testes de dispositivo completos!');
})();
