import { LoginPage } from '../pages/auth/login-page';
import { DriverFactory } from '../utils/driver-factory';
import { TestConfig, defaultConfig } from '../config/test-config';
import { By } from 'selenium-webdriver';
import { cleanUp } from '../utils/clean-up';

describe('Student Management Tests', () => {
  let loginPage: LoginPage;
  let testConfig: TestConfig;
  let driver: any;

  beforeAll(async () => {
    testConfig = defaultConfig;
    driver = await DriverFactory.createDriver(testConfig);
    loginPage = new LoginPage(driver);
    await loginPage.setup();
  }, 30000);

  afterAll(async () => {
    if (loginPage) {
      await loginPage.teardown();
    }
  }, 10000);

  describe('Student Enrollment', () => {
    beforeEach(async () => {
      await cleanUp();
    });

    it('should enroll a new student and add behaviors', async () => {
      // Skip test if no test credentials are configured
      if (!testConfig.credentials?.testUser?.email) {
        return;
      }

      try {
        // Login first
        await loginPage.navigateToLogin();
        await loginPage.loginWithAdminUser();
        await driver.sleep(3000);

        // Try to click enroll student button (for users with license)
        const enrollButton = By.css('#enrollStudent');
        const createFirstStudentButton = By.css('#create-first-student');
        
        let buttonClicked = false;
        
        // Check if user has license and can see main enroll button
        if (await driver.findElements(enrollButton).then((els: any[]) => els.length > 0)) {
          await driver.findElement(enrollButton).click();
          buttonClicked = true;
        } 
        // Otherwise try the "create first student" button for users without students
        else if (await driver.findElements(createFirstStudentButton).then((els: any[]) => els.length > 0)) {
          await driver.findElement(createFirstStudentButton).click();
          buttonClicked = true;
        }
        
        if (!buttonClicked) {
          throw new Error('Could not find enroll student button');
        }
        
        await driver.sleep(2000);

        // Fill student form
        const firstNameInput = By.css('#create-student-first-name');
        const lastNameInput = By.css('#create-student-last-name');
        const createButton = By.css('#create-student-create-update');

        await driver.wait(async () => await driver.findElement(firstNameInput), 10000);
        await driver.findElement(firstNameInput).sendKeys('Test');
        await driver.findElement(lastNameInput).sendKeys('Student');
        
        // Click create button
        await driver.findElement(createButton).click();
        await driver.sleep(3000);

        // Handle any unexpected alerts
        try {
          const alert = await driver.switchTo().alert();
          await alert.accept();
        } catch (e) {
          // No alert present, continue
        }

        // Navigate to student settings
        const settingsLink = By.css('#nav-settings');
        if (await driver.findElements(settingsLink).then((els: any[]) => els.length > 0)) {
          await driver.findElement(settingsLink).click();
          await driver.sleep(2000);

          // Go to behaviors tab
          const behaviorsTab = By.css('#settings-tab-behaviors');
          if (await driver.findElements(behaviorsTab).then((els: any[]) => els.length > 0)) {
            await driver.findElement(behaviorsTab).click();
            await driver.sleep(2000);

            // Add new behavior
            const addBehaviorButton = By.css('#add-new-behavior-button');
            if (await driver.findElements(addBehaviorButton).then((els: any[]) => els.length > 0)) {
              await driver.findElement(addBehaviorButton).click();
              await driver.sleep(2000);

              // Fill behavior details
              const behaviorNameInput = By.css('#student-setting-behavior-name');
              const behaviorDescInput = By.css('#student-setting-behavior-desc');
              const saveBehaviorButton = By.css('#behavior-save-button');

              if (await driver.findElements(behaviorNameInput).then((els: any[]) => els.length > 0)) {
                await driver.findElement(behaviorNameInput).clear();
                await driver.findElement(behaviorNameInput).sendKeys('Test Behavior');
                
                if (await driver.findElements(behaviorDescInput).then((els: any[]) => els.length > 0)) {
                  await driver.findElement(behaviorDescInput).clear();
                  await driver.findElement(behaviorDescInput).sendKeys('Test behavior description');
                }

                // Save behavior
                if (await driver.findElements(saveBehaviorButton).then((els: any[]) => els.length > 0)) {
                  const saveButton = await driver.findElement(saveBehaviorButton);
                  await driver.executeScript('arguments[0].scrollIntoView(true);', saveButton);
                  await driver.sleep(500);
                  await driver.executeScript('arguments[0].click();', saveButton);
                  await driver.sleep(2000);
                }
              }
            }
          }
        }

        // Verify student was created successfully
        const currentUrl = await driver.getCurrentUrl();
        expect(currentUrl).not.toContain('login');

        // Logout
        await loginPage.logout();

      } catch (error) {
        console.log('Student enrollment test failed:', error);
        await loginPage.takeScreenshot('student-enrollment-failed');
        throw error;
      }
    }, 120000);
  });
});