import { Builder, WebDriver, Capabilities } from 'selenium-webdriver';
import { Options as ChromeOptions } from 'selenium-webdriver/chrome';
import { Options as FirefoxOptions } from 'selenium-webdriver/firefox';
import { TestConfig } from '../config/test-config';

export class DriverFactory {
  private static instance: WebDriver | null = null;

  static async createDriver(config: TestConfig): Promise<WebDriver> {
    if (this.instance) {
      return this.instance;
    }

    const builder = new Builder();
    
    switch (config.browser) {
      case 'chrome':
        const chromeOptions = new ChromeOptions();
        if (config.headless) {
          chromeOptions.addArguments('--headless');
        }
        chromeOptions.addArguments(
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-extensions',
          '--disable-web-security',
          '--ignore-certificate-errors',
          '--allow-running-insecure-content'
        );
        builder.forBrowser('chrome').setChromeOptions(chromeOptions);
        break;

      case 'firefox':
        const firefoxOptions = new FirefoxOptions();
        if (config.headless) {
          firefoxOptions.addArguments('--headless');
        }
        firefoxOptions.addArguments('--width=1920', '--height=1080');
        builder.forBrowser('firefox').setFirefoxOptions(firefoxOptions);
        break;

      case 'edge':
        builder.forBrowser('MicrosoftEdge');
        break;

      default:
        throw new Error(`Unsupported browser: ${config.browser}`);
    }

    this.instance = await builder.build();
    await this.instance.manage().setTimeouts({
      implicit: config.timeout.implicit,
      pageLoad: config.timeout.page,
    });

    return this.instance;
  }

  static async quitDriver(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
    }
  }

  static getInstance(): WebDriver | null {
    return this.instance;
  }
}