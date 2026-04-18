import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport for full page capture
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    await page.goto('http://localhost:3000/landing?locale=pt-BR', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.screenshot({ 
      path: '/tmp/landing-page-pt.png',
      fullPage: true
    });
    
    console.log('✓ Screenshot capturada (pt-BR): /tmp/landing-page-pt.png');
    
    // Also capture en-US version
    await page.goto('http://localhost:3000/landing?locale=en-US', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.screenshot({ 
      path: '/tmp/landing-page-en.png',
      fullPage: true
    });
    
    console.log('✓ Screenshot capturada (en-US): /tmp/landing-page-en.png');
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await browser.close();
  }
})();
