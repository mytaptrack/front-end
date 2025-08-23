import { WebDriver, WebElement, By, until, Key } from 'selenium-webdriver';
import { DriverFactory } from '../utils/driver-factory';
import { TestConfig, defaultConfig } from '../config/test-config';
import * as fs from 'fs';
import * as path from 'path';

export abstract class BaseTest {
  protected driver!: WebDriver; // Using definite assignment assertion
  protected config: TestConfig;

  constructor(config: TestConfig = defaultConfig) {
    this.config = config;
  }

  async setup(): Promise<void> {
    this.driver = await DriverFactory.createDriver(this.config);
  }

  async teardown(): Promise<void> {
    if (this.driver) {
      await DriverFactory.quitDriver();
    }
  }

  /**
   * Navigate to a URL and wait for page load
   */
  async navigateTo(url: string): Promise<void> {
    await this.driver.get(url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.tagName('body')),
      this.config.timeout.explicit
    );
    // Wait for Angular to finish loading
    await this.driver.executeScript('return window.angular && window.angular.getTestability && window.angular.getTestability(document.body).whenStable();');
  }

  /**
   * Wait for element to be present and visible
   */
  async waitForElement(locator: By, timeout: number = this.config.timeout.explicit): Promise<WebElement> {
    await this.driver.wait(until.elementLocated(locator), timeout);
    const element = await this.driver.findElement(locator);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  /**
   * Wait for element to be clickable and click it
   */
  async clickElement(locator: By, timeout: number = this.config.timeout.explicit): Promise<void> {
    const element = await this.waitForElement(locator, timeout);
    await this.driver.wait(until.elementIsEnabled(element), timeout);
    await element.click();
  }

  /**
   * Type text into an input field
   */
  async typeText(locator: By, text: string, clear: boolean = true): Promise<void> {
    const element = await this.waitForElement(locator);
    if (clear) {
      await element.clear();
    }
    await element.sendKeys(text);
  }

  /**
   * Select option from dropdown
   */
  async selectDropdownOption(dropdownLocator: By, optionText: string): Promise<void> {
    await this.clickElement(dropdownLocator);
    const optionLocator = By.xpath(`//option[text()='${optionText}']`);
    await this.clickElement(optionLocator);
  }

  /**
   * Wait for text to appear in element
   */
  async waitForText(locator: By, expectedText: string, timeout: number = this.config.timeout.explicit): Promise<void> {
    await this.driver.wait(async () => {
      try {
        const element = await this.driver.findElement(locator);
        const text = await element.getText();
        return text.includes(expectedText);
      } catch {
        return false;
      }
    }, timeout);
  }

  /**
   * Wait for element to disappear
   */
  async waitForElementToDisappear(locator: By, timeout: number = this.config.timeout.explicit): Promise<void> {
    await this.driver.wait(until.stalenessOf(await this.driver.findElement(locator)), timeout);
  }

  /**
   * Take screenshot on failure
   */
  async takeScreenshot(testName: string): Promise<void> {
    if (this.config.screenshots.enabled) {
      const screenshot = await this.driver.takeScreenshot();
      const screenshotPath = path.join(this.config.screenshots.path, `${testName}-${Date.now()}.png`);
      
      // Ensure directory exists
      const dir = path.dirname(screenshotPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(screenshotPath, screenshot, 'base64');
    }
  }

  /**
   * Refresh page and wait for data to load (as per requirements)
   */
  async refreshAndWaitForData(): Promise<void> {
    await this.driver.navigate().refresh();
    await this.waitForPageLoad();
    // Wait up to 2 seconds for data to appear as per requirements
    await this.driver.sleep(2000);
  }

  /**
   * Scroll element into view
   */
  async scrollToElement(locator: By): Promise<void> {
    const element = await this.driver.findElement(locator);
    await this.driver.executeScript('arguments[0].scrollIntoView(true);', element);
  }

  /**
   * Wait for Angular to stabilize
   */
  async waitForAngular(): Promise<void> {
    await this.driver.executeScript(`
      return new Promise((resolve) => {
        if (window.angular) {
          window.angular.getTestability(document.body).whenStable(resolve);
        } else {
          resolve();
        }
      });
    `);
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return await this.driver.getCurrentUrl();
  }

  /**
   * Check if element exists
   */
  async elementExists(locator: By): Promise<boolean> {
    try {
      await this.driver.findElement(locator);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get element text
   */
  async getElementText(locator: By): Promise<string> {
    const element = await this.waitForElement(locator);
    return await element.getText();
  }

  /**
   * Get element attribute
   */
  async getElementAttribute(locator: By, attribute: string): Promise<string> {
    const element = await this.waitForElement(locator);
    return await element.getAttribute(attribute);
  }
}