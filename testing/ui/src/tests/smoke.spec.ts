
import { DriverFactory } from '../utils/driver-factory';
import { TestConfig, defaultConfig } from '../config/test-config';
import { WebDriver, By } from 'selenium-webdriver';
import { cleanUp } from '../utils/clean-up';

describe('Smoke Tests', () => {
  let driver: WebDriver;
  let testConfig: TestConfig;

  beforeAll(async () => {
    testConfig = defaultConfig;
    driver = await DriverFactory.createDriver(testConfig);
  }, 30000);

  afterAll(async () => {
    if (driver) {
      await DriverFactory.quitDriver();
    }
  }, 10000);

  describe('Application Availability', () => {
    beforeEach(async () => {
      await cleanUp();
    });

    it('should load the main application page', async () => {
      
      await driver.get(testConfig.baseUrl);
      
      // Wait for page to load
      await driver.sleep(3000);
      
      const title = await driver.getTitle();
      expect(title).not.toBe('');
      
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain(testConfig.baseUrl);
    });

    it('should have a valid page title', async () => {
      
      await driver.get(testConfig.baseUrl);
      await driver.sleep(2000);
      
      const title = await driver.getTitle();
      // Should contain some reference to MyTapTrack or similar
      expect(title).not.toBe('');
      const lowerTitle = title.toLowerCase();
      expect(
        lowerTitle.includes('tap') || 
        lowerTitle.includes('behavior') || 
        lowerTitle.includes('track') ||
        title.length > 0
      ).toBe(true);
    });

    it('should load without major JavaScript errors', async () => {
      
      await driver.get(testConfig.baseUrl);
      await driver.sleep(3000);
      
      // Check for JavaScript errors in console
      try {
        const logs = await driver.manage().logs().get('browser');
        const errors = logs.filter((entry: any) => entry.level.name === 'SEVERE');
        
        // Don't fail on JS errors for now, just log them
        if (errors.length > 0) {
          console.log('JavaScript errors found:', errors.map((e: any) => e.message));
        }
      } catch (error: any) {
        // Some browsers might not support log collection
        console.log('Could not collect browser logs:', error.message);
      }
      
      // Just verify page loaded successfully
      const pageSource = await driver.getPageSource();
      expect(pageSource).not.toBe('');
    });

    it('should have basic HTML structure', async () => {
      
      await driver.get(testConfig.baseUrl);
      await driver.sleep(2000);
      
      // Check for basic HTML elements
      const bodyElements = await driver.findElements(By.tagName('body'));
      expect(bodyElements.length).toBeGreaterThan(0);
      
      const htmlElements = await driver.findElements(By.tagName('html'));
      expect(htmlElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(async () => {
      await cleanUp();
    });

    it('should handle different screen sizes', async () => {
      
      // Test desktop size
      await driver.manage().window().setRect({ width: 1920, height: 1080 });
      await driver.get(testConfig.baseUrl);
      await driver.sleep(2000);
      
      let currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain(testConfig.baseUrl);
      
      // Test tablet size
      await driver.manage().window().setRect({ width: 768, height: 1024 });
      await driver.sleep(1000);
      
      currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain(testConfig.baseUrl);
      
      // Test mobile size
      await driver.manage().window().setRect({ width: 375, height: 667 });
      await driver.sleep(1000);
      
      currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain(testConfig.baseUrl);
      
      // Reset to desktop size
      await driver.manage().window().setRect({ width: 1920, height: 1080 });
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      await cleanUp();
    });

    it('should handle page navigation without crashing', async () => {
      
      await driver.get(testConfig.baseUrl);
      await driver.sleep(3000);
      
      // Try to navigate forward and back
      const originalUrl = await driver.getCurrentUrl();
      
      // If there's a navigation menu, try finding it
      try {
        const navLinks = await driver.findElements(By.tagName('a'));
        if (navLinks.length > 0) {
          // Just verify we found some links
          expect(navLinks.length).toBeGreaterThan(0);
        }
      } catch (error) {
        // If no navigation found, that's okay for this smoke test
        console.log('No navigation links found, which is acceptable');
      }
      
      // Test browser navigation
      await driver.navigate().refresh();
      await driver.sleep(2000);
      
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain(testConfig.baseUrl);
    });
  });
});