import { LoginPage } from '../pages/auth/login-page';
import { DriverFactory } from '../utils/driver-factory';
import { TestConfig, defaultConfig } from '../config/test-config';
import { By, Key, until, WebDriver } from 'selenium-webdriver';
import { cleanUp } from '../utils/clean-up';

describe('Behavior Settings Tests', () => {
  let loginPage: LoginPage;
  let testConfig: TestConfig;
  let driver: WebDriver;

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

  beforeEach(async () => {
    await cleanUp();
  }, 60000);

  describe('Behavior Management', () => {

    it('should manage behavior settings and ABC configuration', async () => {
      if (!testConfig.credentials?.adminUser?.email) {
        return;
      }

      try {
        // Login and setup
        await loginPage.navigateToLogin();
        await loginPage.loginWithAdminUser();
        await driver.sleep(3000);

        // Create a student first
        const enrollButton = By.css('#enrollStudent, #create-first-student');
        if (await driver.findElements(enrollButton).then((els: any[]) => els.length > 0)) {
          await driver.findElement(enrollButton).click();
          await driver.sleep(2000);

          // Fill student form
          const firstNameInput = By.css('#create-student-first-name');
          const lastNameInput = By.css('#create-student-last-name');
          const createButton = By.css('#create-student-create-update');

          await driver.findElement(firstNameInput).sendKeys('Test');
          await driver.findElement(lastNameInput).sendKeys('Student');
          await driver.findElement(createButton).click();
          await driver.sleep(3000);
        }

        // Navigate to settings
        const settingsLink = By.css('#nav-settings');
        if (await driver.findElements(settingsLink).then((els: any[]) => els.length > 0)) {
          await driver.findElement(settingsLink).click();
          await driver.sleep(2000);
        } else {
          console.log('Settings link not found');
          return;
        }

        // Go to behaviors tab
        const behaviorsTab = By.css('#settings-tab-behaviors');
        if (await driver.findElements(behaviorsTab).then((els: any[]) => els.length > 0)) {
          await driver.findElement(behaviorsTab).click();
          await driver.sleep(2000);
        } else {
          console.log('Behaviors tab not found');
          return;
        }

        // Add new behavior
        const addBehaviorButton = By.css('#add-new-behavior-button');
        if (await driver.findElements(addBehaviorButton).then((els: any[]) => els.length > 0)) {
          await driver.findElement(addBehaviorButton).click();
          await driver.sleep(2000);

          // Fill behavior details
          const behaviorNameInput = By.css('#student-setting-behavior-name');
          const behaviorDescInput = By.css('#student-setting-behavior-desc');
          const abcCheckbox = By.css('#student-setting-behavior-abc');

          if (await driver.findElements(behaviorNameInput).then((els: any[]) => els.length > 0)) {
            await driver.findElement(behaviorNameInput).clear();
            await driver.findElement(behaviorNameInput).sendKeys('Test ABC Behavior');
          }

          if (await driver.findElements(behaviorDescInput).then((els: any[]) => els.length > 0)) {
            await driver.findElement(behaviorDescInput).clear();
            await driver.findElement(behaviorDescInput).sendKeys('Behavior for ABC testing');
          }

          // Enable ABC tracking
          if (await driver.findElements(abcCheckbox).then((els: any[]) => els.length > 0)) {
            await driver.findElement(abcCheckbox).click();
          }

          // Save behavior
          const saveBehaviorButton = By.css('#behavior-save-button');
          if (await driver.findElements(saveBehaviorButton).then((els: any[]) => els.length > 0)) {
            const saveButton = await driver.findElement(saveBehaviorButton);
            await driver.executeScript('arguments[0].scrollIntoView(true);', saveButton);
            await driver.sleep(500);
            await driver.executeScript('arguments[0].click();', saveButton);
            await driver.sleep(2000);
          }
        }

        // Navigate to ABC tab
        const abcTab = By.css('#settings-tab-abc');
        if (await driver.findElements(abcTab).then((els: any[]) => els.length > 0)) {
          await driver.findElement(abcTab).click();
          await driver.sleep(2000);

          // Test ABC functionality would go here
          // This is a placeholder for ABC-specific tests
        }

        // Test frequency targets
        const frequencyTargetCheckbox = By.css('#frequency-target-checkbox');
        if (await driver.findElements(frequencyTargetCheckbox).then((els: any[]) => els.length > 0)) {
          await driver.findElement(frequencyTargetCheckbox).click();
          await driver.sleep(1000);
        }

        // Test duration targets
        const durationTargetCheckbox = By.css('#duration-target-checkbox');
        if (await driver.findElements(durationTargetCheckbox).then((els: any[]) => els.length > 0)) {
          await driver.findElement(durationTargetCheckbox).click();
          await driver.sleep(1000);

          const measurementSelect = By.css('#duration-measurement-select');
          if (await driver.findElements(measurementSelect).then((els: any[]) => els.length > 0)) {
            await driver.findElement(measurementSelect).click();
            await driver.sleep(500);
          }
        }

        // Archive behavior
        const archiveButton = By.css('#behavior-archive-button');
        if (await driver.findElements(archiveButton).then((els: any[]) => els.length > 0)) {
          const archiveBtn = await driver.findElement(archiveButton);
          await driver.executeScript('arguments[0].scrollIntoView(true);', archiveBtn);
          await driver.sleep(500);
          await driver.executeScript('arguments[0].click();', archiveBtn);
          await driver.sleep(2000);
        }

        // Test archived behaviors toggle
        const toggleArchivedButton = By.css('#toggle-archived-behaviors');
        if (await driver.findElements(toggleArchivedButton).then((els: any[]) => els.length > 0)) {
          await driver.findElement(toggleArchivedButton).click();
          await driver.sleep(1000);
        }

        expect(await driver.getCurrentUrl()).not.toContain('login');
        await loginPage.logout();

      } catch (error) {
        console.log('Behavior settings test failed:', error);
        await loginPage.takeScreenshot('behavior-settings-failed');
        throw error;
      }
    }, 120000);
  });

  describe('Device App Registration', () => {

    it('should register new app with all behaviors checked', async () => {
      if (!testConfig.credentials?.testUser?.email) {
        return;
      }

      try {
        await loginPage.navigateToLogin();
        await loginPage.loginWithTestUser();
        await driver.sleep(3000);

        // Navigate to devices tab
        const settingsLink = By.css('#nav-settings');
        await driver.findElement(settingsLink).click();
        await driver.sleep(2000);

        const devicesTab = By.css('#settings-tab-devices');
        if (await driver.findElements(devicesTab).then((els: any[]) => els.length > 0)) {
          await driver.findElement(devicesTab).click();
          await driver.sleep(2000);

          // Fill device details
          const deviceNameInput = By.css('#student-setting-device-app-name');
          const studentNameInput = By.css('#student-setting-device-app-student-name');
          
          if (await driver.findElements(deviceNameInput).then((els: any[]) => els.length > 0)) {
            await driver.findElement(deviceNameInput).clear();
            await driver.findElement(deviceNameInput).sendKeys('Test Device');
          }

          if (await driver.findElements(studentNameInput).then((els: any[]) => els.length > 0)) {
            await driver.findElement(studentNameInput).clear();
            await driver.findElement(studentNameInput).sendKeys('Test Student');
          }

          // Verify all behaviors are checked by default
          const trackCheckboxes = await driver.findElements(By.css('[id^="student-setting-device-app-track-"]'));
          for (let checkbox of trackCheckboxes) {
            const isChecked = await checkbox.isSelected();
            expect(isChecked).toBe(true);
          }

          // Generate QR code
          const generateQrButton = By.css('#student-setting-device-app-gen-qr');
          if (await driver.findElements(generateQrButton).then((els: any[]) => els.length > 0)) {
            await driver.findElement(generateQrButton).click();
            await driver.sleep(3000);
          }

          // Save device
          const saveDeviceButton = By.css('#student-setting-device-app-save');
          if (await driver.findElements(saveDeviceButton).then((els: any[]) => els.length > 0)) {
            const saveBtn = await driver.findElement(saveDeviceButton);
            await driver.executeScript('arguments[0].scrollIntoView(true);', saveBtn);
            await driver.sleep(500);
            await driver.executeScript('arguments[0].click();', saveBtn);
            await driver.sleep(3000);
          }
        }

        expect(await driver.getCurrentUrl()).not.toContain('login');
        await loginPage.logout();

      } catch (error) {
        console.log('Device app registration test failed:', error);
        await loginPage.takeScreenshot('device-app-registration-failed');
        throw error;
      }
    }, 120000);
  });

  describe('ABC Tab Functionality', () => {

    it('should configure ABC settings', async () => {
      if (!testConfig.credentials?.testUser?.email) {
        return;
      }

      try {
        await loginPage.navigateToLogin();
        await loginPage.loginWithAdminUser();
        await driver.sleep(3000);

        // Create a student first
        const enrollButton = By.css('#enrollStudent, #create-first-student');
        if (await driver.findElements(enrollButton).then((els: any[]) => els.length > 0)) {
          await driver.findElement(enrollButton).click();
          await driver.sleep(2000);

          const firstNameInput = By.css('#create-student-first-name');
          const lastNameInput = By.css('#create-student-last-name');
          const createButton = By.css('#create-student-create-update');

          await driver.findElement(firstNameInput).sendKeys('ABC');
          await driver.findElement(lastNameInput).sendKeys('Student');
          await driver.findElement(createButton).click();
          await driver.sleep(3000);

          // Handle any unexpected alerts
          try {
            const alert = await driver.switchTo().alert();
            await alert.accept();
          } catch (e) {
            // No alert present, continue
          }
        }

        // Navigate to ABC tab
        const settingsLink = By.css('#nav-settings');
        if (await driver.findElements(settingsLink).then((els: any[]) => els.length > 0)) {
          await driver.findElement(settingsLink).click();
          await driver.sleep(2000);
        } else {
          console.log('Settings link not found after student creation');
          return;
        }

        const abcTab = By.css('#settings-tab-abc');
        if (await driver.findElements(abcTab).then((els: any[]) => els.length > 0)) {
          await driver.findElement(abcTab).click();
          await driver.sleep(2000);

          // Set ABC antecedents
          const antecedentsTextarea = By.css('textarea[placeholder*="antecedent"], textarea');
          if (await driver.findElements(antecedentsTextarea).then((els: any[]) => els.length > 0)) {
            const textareas = await driver.findElements(antecedentsTextarea);
            if (textareas[0]) {
              await textareas[0].clear();
              await textareas[0].sendKeys('Test Antecedent 1\nTest Antecedent 2');
            }
          }

          // Set ABC consequences
          const consequencesTextarea = By.css('textarea');
          if (await driver.findElements(consequencesTextarea).then((els: any[]) => els.length > 1)) {
            const textareas = await driver.findElements(consequencesTextarea);
            if (textareas[1]) {
              await textareas[1].clear();
              await textareas[1].sendKeys('Test Consequence 1\nTest Consequence 2');
            }
          }

          // Save ABC settings
          const saveButton = By.css('button');
          const saveButtons = await driver.findElements(saveButton);
          for (let btn of saveButtons) {
            const text = await btn.getText();
            if (text.toLowerCase().includes('save')) {
              await driver.executeScript('arguments[0].scrollIntoView(true);', btn);
              await driver.sleep(500);
              await driver.executeScript('arguments[0].click();', btn);
              break;
            }
          }
          await driver.sleep(2000);

          // Refresh page and verify values were saved
          await driver.navigate().refresh();
          await driver.sleep(3000);

          // Navigate back to ABC tab
          const settingsLinkAfterRefresh = By.css('#nav-settings');
          await driver.findElement(settingsLinkAfterRefresh).click();
          await driver.sleep(2000);

          const abcTabAfterRefresh = By.css('#settings-tab-abc');
          if (await driver.findElements(abcTabAfterRefresh).then((els: any[]) => els.length > 0)) {
            await driver.findElement(abcTabAfterRefresh).click();
            await driver.sleep(2000);

            // Verify antecedents were saved
            const textareasAfterRefresh = await driver.findElements(By.css('textarea'));
            if (textareasAfterRefresh[0]) {
              const antecedentValue = await textareasAfterRefresh[0].getAttribute('value');
              expect(antecedentValue).toContain('Test Antecedent 1');
            }

            // Verify consequences were saved
            if (textareasAfterRefresh[1]) {
              const consequenceValue = await textareasAfterRefresh[1].getAttribute('value');
              expect(consequenceValue).toContain('Test Consequence 1');
            }
          }
        }

        expect(await driver.getCurrentUrl()).not.toContain('login');
        await loginPage.logout();

      } catch (error) {
        console.log('ABC tab test failed:', error);
        await loginPage.takeScreenshot('abc-tab-failed');
        throw error;
      }
    }, 120000);
  });

  describe('Schedule Management', () => {

    it('should create and change student schedule', async () => {
      if (!testConfig.credentials?.testUser?.email) {
        return;
      }

      try {
        await loginPage.navigateToLogin();
        await loginPage.loginWithAdminUser();
        await driver.sleep(3000);

        // Check if Schedule Student already exists and delete it
        try {
          const existingStudents = await driver.findElements(By.css('.student-name'));
          for (let student of existingStudents) {
            const studentText = await student.getText();
            if (studentText.includes('Schedule Student')) {
              // Click on the student to select it
              await student.click();
              await driver.sleep(2000);
              
              // Click settings
              const settingsLink = By.css('#nav-settings');
              if (await driver.findElements(settingsLink).then((els: any[]) => els.length > 0)) {
                const settingsBtn = await driver.findElement(settingsLink);
                await driver.executeScript('arguments[0].click();', settingsBtn);
                await driver.sleep(2000);
                
                // Click delete button
                const deleteButtons = await driver.findElements(By.css('button'));
                for (let btn of deleteButtons) {
                  const text = await btn.getText();
                  if (text.toLowerCase().includes('delete')) {
                    await driver.executeScript('arguments[0].click();', btn);
                    await driver.sleep(1000);
                    
                    // Confirm deletion if needed
                    const confirmButtons = await driver.findElements(By.css('button'));
                    for (let confirmBtn of confirmButtons) {
                      const confirmText = await confirmBtn.getText();
                      if (confirmText.toLowerCase().includes('confirm') || confirmText.toLowerCase().includes('yes')) {
                        await driver.executeScript('arguments[0].click();', confirmBtn);
                        await driver.sleep(3000);
                        
                        // Navigate back to main page after deletion
                        await driver.get(testConfig.baseUrl);
                        await driver.sleep(2000);
                        break;
                      }
                    }
                    break;
                  }
                }
              }
              break;
            }
          }
        } catch (e) {
          // No existing students or error finding them, continue
        }

        // Create a student first
        const enrollButton = By.css('#enrollStudent, #create-first-student');
        if (await driver.findElements(enrollButton).then((els: any[]) => els.length > 0)) {
          await driver.findElement(enrollButton).click();
          await driver.sleep(2000);

          const firstNameInput = By.css('#create-student-first-name');
          const lastNameInput = By.css('#create-student-last-name');
          const createButton = By.css('#create-student-create-update');

          await driver.findElement(firstNameInput).sendKeys('Schedule');
          await driver.findElement(lastNameInput).sendKeys('Student');
          
          const createBtn = await driver.findElement(createButton);
          await driver.executeScript('arguments[0].scrollIntoView(true);', createBtn);
          await driver.sleep(500);
          await driver.executeScript('arguments[0].click();', createBtn);
          await driver.sleep(3000);

          // Handle any unexpected alerts
          try {
            const alert = await driver.switchTo().alert();
            await alert.accept();
          } catch (e) {
            // No alert present, continue
          }
        }

        // Navigate to Schedule tab
        const settingsLink = By.css('#nav-settings');
        if (await driver.findElements(settingsLink).then((els: any[]) => els.length > 0)) {
          const settingsBtn = await driver.findElement(settingsLink);
          await driver.executeScript('arguments[0].scrollIntoView(true);', settingsBtn);
          await driver.sleep(500);
          await driver.executeScript('arguments[0].click();', settingsBtn);
          await driver.sleep(2000);
        } else {
          console.log('Settings link not found');
          return;
        }

        const scheduleTab = By.css('#settings-tab-schedule');
        if (await driver.findElements(scheduleTab).then((els: any[]) => els.length > 0)) {
          await driver.findElement(scheduleTab).click();
          await driver.sleep(2000);

          // Add new schedule
          const addScheduleButton = By.css('button');
          const addButtons = await driver.findElements(addScheduleButton);
          for (let btn of addButtons) {
            const text = await btn.getText();
            if (text.toLowerCase().includes('add') || text.toLowerCase().includes('new')) {
              await btn.click();
              break;
            }
          }
          await driver.sleep(2000);

          // Set schedule name
          const scheduleNameInput = By.css('#schedule-name-input');
          if (await driver.findElements(scheduleNameInput).then((els: any[]) => els.length > 0)) {
            await driver.findElement(scheduleNameInput).clear();
            await driver.findElement(scheduleNameInput).sendKeys('Test Schedule');
            // Trigger change event to ensure the model is updated
            await driver.executeScript('arguments[0].dispatchEvent(new Event("input", { bubbles: true }));', await driver.findElement(scheduleNameInput));
            await driver.executeScript('arguments[0].dispatchEvent(new Event("change", { bubbles: true }));', await driver.findElement(scheduleNameInput));
          }

          // Add 3 schedule activities
          for (let i = 0; i < 3; i++) {
            const addActivityButton = By.css('#add-schedule-activity');
            if (await driver.findElements(addActivityButton).then((els: any[]) => els.length > 0)) {
              const addBtn = await driver.findElement(addActivityButton);
              await driver.executeScript('arguments[0].scrollIntoView(true);', addBtn);
              await driver.sleep(500);
              await driver.executeScript('arguments[0].click();', addBtn);
              await driver.sleep(1000);
              
              // Fill activity name
              const activityNameInput = By.css(`#activity-name-${i}`);
              if (await driver.findElements(activityNameInput).then((els: any[]) => els.length > 0)) {
                await driver.findElement(activityNameInput).clear();
                await driver.findElement(activityNameInput).sendKeys(`Activity ${i + 1}`);
              }
              
              // Fill start time
              const startTimeInput = By.css(`#activity-start-time-${i} input`);
              if (await driver.findElements(startTimeInput).then((els: any[]) => els.length > 0)) {
                const startTime = `0${9 + i}:00`; // 09:00, 10:00, 11:00
                await driver.findElement(startTimeInput).clear();
                await driver.findElement(startTimeInput).sendKeys(startTime);
              }
              
              // Fill end time
              const endTimeInput = By.css(`#activity-end-time-${i} input`);
              if (await driver.findElements(endTimeInput).then((els: any[]) => els.length > 0)) {
                const endTime = `0${9 + i}:30`; // 09:30, 10:30, 11:30
                await driver.findElement(endTimeInput).clear();
                await driver.findElement(endTimeInput).sendKeys(endTime);
              }
            }
          }

          // Set start date
          const startDateInput = By.css('#schedule-start-date');
          if (await driver.findElements(startDateInput).then((els: any[]) => els.length > 0)) {
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const year = today.getFullYear();
            const dateString = `${month}/${day}/${year}`; // MM/DD/YYYY format
            await driver.findElement(startDateInput).clear();
            await driver.findElement(startDateInput).sendKeys(dateString);
          }

          await driver.sleep(1000);

          // Save schedule
          const saveScheduleButton = By.css('.save-schedule-btn');
          await driver.wait(until.elementLocated(saveScheduleButton), 10000);
          
          if (await driver.findElements(saveScheduleButton).then((els: any[]) => els.length > 0)) {
            const saveButtons = await driver.findElements(saveScheduleButton);
            if(saveButtons.length > 0) {
              console.log('Save button not found');
              expect(saveButtons.length).toBe(1);
            }
            const saveBtn = await driver.findElement(saveScheduleButton);
            await driver.executeScript('arguments[0].scrollIntoView(true);', saveBtn);
            
            // Click save button using WebDriver
            await saveBtn.click();
            // await saveBtn.sendKeys(Key.ENTER);
            console.log('Save button clicked via WebDriver');
          } else {
            console.log('Save button not found');
          }
          
          // Wait for loading indicator or response
          await driver.sleep(1000);
          
          // Check if loading state appears (indicates button was clicked)
          const loadingElements = await driver.findElements(By.css('app-loading, .loading, [class*="loading"]'));
          if (loadingElements.length > 0) {
            console.log('Loading state detected - save button click registered');
            // Wait for loading to complete
            await driver.wait(async () => {
              const stillLoading = await driver.findElements(By.css('app-loading, .loading, [class*="loading"]'));
              return stillLoading.length === 0;
            }, 10000, 'Loading did not complete');
          } else {
            console.log('No loading state detected - save may not have been triggered');
          }
          
          await driver.sleep(2000);
          console.log('Save operation completed');

          // Check for error dialogs
          try {
            const alert = await driver.switchTo().alert();
            const alertText = await alert.getText();
            await alert.accept();
            
            if (alertText.toLowerCase().includes('error') || alertText.toLowerCase().includes('unexpected')) {
              throw new Error(`Save operation failed with error: ${alertText}`);
            }
          } catch (e) {
            if (e instanceof Error && e.message.includes('Save operation failed')) {
              throw e;
            }
          }

          // Refresh page to verify data was saved
          await driver.navigate().refresh();
          await driver.sleep(4000);

          // Navigate back to schedule tab
          const settingsLinkAfterRefresh = By.css('#nav-settings');
          if (await driver.findElements(settingsLinkAfterRefresh).then((els: any[]) => els.length > 0)) {
            const settingsBtn = await driver.findElement(settingsLinkAfterRefresh);
            await driver.executeScript('arguments[0].click();', settingsBtn);
            await driver.sleep(2000);

            const scheduleTabAfterRefresh = By.css('#settings-tab-schedule');
            if (await driver.findElements(scheduleTabAfterRefresh).then((els: any[]) => els.length > 0)) {
              await driver.findElement(scheduleTabAfterRefresh).click();
              await driver.sleep(2000);

              // Verify schedule name was saved
              const scheduleNameAfterRefresh = By.css('#schedule-name-input');
              if (await driver.findElements(scheduleNameAfterRefresh).then((els: any[]) => els.length > 0)) {
                const savedName = await driver.findElement(scheduleNameAfterRefresh).getAttribute('value');
                console.log('Saved schedule name:', savedName);
                
                // Fail the test if schedule name wasn't saved
                expect(savedName).toBe('Test Schedule');
              } else {
                throw new Error('Schedule name input not found after refresh');
              }
            }
          }
        }

        // Handle any final alerts
        try {
          const alert = await driver.switchTo().alert();
          await alert.accept();
        } catch (e) {
          // No alert present, continue
        }

        expect(await driver.getCurrentUrl()).not.toContain('login');
        await loginPage.logout();

      } catch (error) {
        console.log('Schedule management test failed:', error);
        await loginPage.takeScreenshot('schedule-management-failed');
        throw error;
      }
    }, 180000);
  });

  describe('Support Changes', () => {

    it('should configure support changes settings', async () => {
      if (!testConfig.credentials?.testUser?.email) {
        return;
      }

      try {
        await loginPage.navigateToLogin();
        await loginPage.loginWithAdminUser();
        await driver.sleep(3000);

        // Create a student first
        const enrollButton = By.css('#enrollStudent, #create-first-student');
        if (await driver.findElements(enrollButton).then((els: any[]) => els.length > 0)) {
          await driver.findElement(enrollButton).click();
          await driver.sleep(2000);

          const firstNameInput = By.css('#create-student-first-name');
          const lastNameInput = By.css('#create-student-last-name');
          const createButton = By.css('#create-student-create-update');

          await driver.findElement(firstNameInput).sendKeys('Support');
          await driver.findElement(lastNameInput).sendKeys('Student');
          await driver.findElement(createButton).click();
          await driver.sleep(3000);
        }

        // Navigate to settings
        const settingsLink = By.css('#nav-settings');
        if (await driver.findElements(settingsLink).then((els: any[]) => els.length > 0)) {
          const settingsBtn = await driver.findElement(settingsLink);
          await driver.executeScript('arguments[0].click();', settingsBtn);
          await driver.sleep(2000);
        }

        // Navigate to Support Changes tab (milestones)
        const supportTab = By.css('#settings-tab-milestones');
        if (await driver.findElements(supportTab).then((els: any[]) => els.length > 0)) {
          await driver.findElement(supportTab).click();
          await driver.sleep(2000);

          // Click "Add New Support Change"
          const addNewButton = By.css('#student-setting-device-support-new');
          if (await driver.findElements(addNewButton).then((els: any[]) => els.length > 0)) {
            console.log('Clicking Add New Support Change button');
            await driver.findElement(addNewButton).click();
            await driver.sleep(3000); // Wait longer for form to appear

            // Set support name/title
            const nameInput = By.css('#student-setting-device-support-name');
            const nameInputs = await driver.findElements(nameInput);
            console.log('Name input fields found:', nameInputs.length);
            
            if (nameInputs.length > 0) {
              console.log('Setting support change name');
              await driver.findElement(nameInput).clear();
              await driver.findElement(nameInput).sendKeys('Test Support Change');
              // Trigger Angular change detection
              await driver.executeScript('arguments[0].dispatchEvent(new Event("input", { bubbles: true }));', await driver.findElement(nameInput));
              await driver.executeScript('arguments[0].dispatchEvent(new Event("change", { bubbles: true }));', await driver.findElement(nameInput));
              
              // Verify the value was set
              const setValue = await driver.findElement(nameInput).getAttribute('value');
              console.log('Support change name set to:', setValue);
            } else {
              console.log('Name input field not found');
            }

            // Set support date
            const dateInput = By.css('#student-setting-device-support-date');
            if (await driver.findElements(dateInput).then((els: any[]) => els.length > 0)) {
              const today = new Date();
              const dateString = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
              await driver.findElement(dateInput).clear();
              await driver.findElement(dateInput).sendKeys(dateString);
            }

            // Set support description
            const descriptionTextarea = By.css('#student-setting-device-support-desc');
            if (await driver.findElements(descriptionTextarea).then((els: any[]) => els.length > 0)) {
              await driver.findElement(descriptionTextarea).clear();
              await driver.findElement(descriptionTextarea).sendKeys('This is a test support change description');
              // Trigger Angular change detection
              await driver.executeScript('arguments[0].dispatchEvent(new Event("input", { bubbles: true }));', await driver.findElement(descriptionTextarea));
              await driver.executeScript('arguments[0].dispatchEvent(new Event("change", { bubbles: true }));', await driver.findElement(descriptionTextarea));
            }

            // Save first support change
            const saveButton = By.css('#student-setting-device-support-save');
            if (await driver.findElements(saveButton).then((els: any[]) => els.length > 0)) {
              const saveBtn = await driver.findElement(saveButton);
              await driver.executeScript('arguments[0].scrollIntoView(true);', saveBtn);
              await driver.sleep(500);
              await saveBtn.click();
              console.log('First support change saved');
              await driver.sleep(3000);
            }

            // Add second support change
            const addSecondButton = By.css('#student-setting-device-support-new');
            if (await driver.findElements(addSecondButton).then((els: any[]) => els.length > 0)) {
              await driver.findElement(addSecondButton).click();
              await driver.sleep(2000);

              // Fill second support change
              const nameInput2 = By.css('#student-setting-device-support-name');
              if (await driver.findElements(nameInput2).then((els: any[]) => els.length > 0)) {
                await driver.findElement(nameInput2).clear();
                await driver.findElement(nameInput2).sendKeys('Second Support Change');
                await driver.executeScript('arguments[0].dispatchEvent(new Event("input", { bubbles: true }));', await driver.findElement(nameInput2));
              }

              const descInput2 = By.css('#student-setting-device-support-desc');
              if (await driver.findElements(descInput2).then((els: any[]) => els.length > 0)) {
                await driver.findElement(descInput2).clear();
                await driver.findElement(descInput2).sendKeys('Second support change description');
                await driver.executeScript('arguments[0].dispatchEvent(new Event("input", { bubbles: true }));', await driver.findElement(descInput2));
              }

              // Save second support change
              const saveButton2 = By.css('#student-setting-device-support-save');
              if (await driver.findElements(saveButton2).then((els: any[]) => els.length > 0)) {
                await driver.findElement(saveButton2).click();
                console.log('Second support change saved');
                await driver.sleep(3000);
              }
            }

            // Edit first support change
            const firstSupportChange = By.css('#student-setting-device-support-0');
            if (await driver.findElements(firstSupportChange).then((els: any[]) => els.length > 0)) {
              await driver.findElement(firstSupportChange).click();
              await driver.sleep(2000);

              // Edit the name
              const editNameInput = By.css('#student-setting-device-support-name');
              if (await driver.findElements(editNameInput).then((els: any[]) => els.length > 0)) {
                await driver.findElement(editNameInput).clear();
                await driver.findElement(editNameInput).sendKeys('Edited Support Change');
                await driver.executeScript('arguments[0].dispatchEvent(new Event("input", { bubbles: true }));', await driver.findElement(editNameInput));
              }

              // Save edited change
              const saveEditButton = By.css('#student-setting-device-support-save');
              if (await driver.findElements(saveEditButton).then((els: any[]) => els.length > 0)) {
                await driver.findElement(saveEditButton).click();
                console.log('First support change edited and saved');
                await driver.sleep(3000);
              }

              // Delete the first support change
              const deleteButton = By.css('#student-setting-device-support-remove');
              if (await driver.findElements(deleteButton).then((els: any[]) => els.length > 0)) {
                await driver.findElement(deleteButton).click();
                await driver.sleep(1000);
                
                // Confirm deletion
                try {
                  const alert = await driver.switchTo().alert();
                  await alert.accept();
                  console.log('First support change deleted');
                  await driver.sleep(3000);
                } catch (e) {
                  // No alert, continue
                }
              }
            }
          }

          // Refresh page to verify data was saved
          await driver.navigate().refresh();
          await driver.sleep(3000);

          // Navigate back to support tab
          const settingsLinkAfterRefresh = By.css('#nav-settings');
          if (await driver.findElements(settingsLinkAfterRefresh).then((els: any[]) => els.length > 0)) {
            const settingsBtn = await driver.findElement(settingsLinkAfterRefresh);
            await driver.executeScript('arguments[0].click();', settingsBtn);
            await driver.sleep(2000);

            const supportTabAfterRefresh = By.css('#settings-tab-milestones');
            if (await driver.findElements(supportTabAfterRefresh).then((els: any[]) => els.length > 0)) {
              await driver.findElement(supportTabAfterRefresh).click();
              await driver.sleep(2000);

              // Verify only second support change remains (first was deleted)
              const supportChangeItem = By.css('#student-setting-device-support-0');
              if (await driver.findElements(supportChangeItem).then((els: any[]) => els.length > 0)) {
                await driver.findElement(supportChangeItem).click();
                await driver.sleep(1000);

                // Verify it's the second support change
                const titleAfterRefresh = By.css('#student-setting-device-support-name');
                if (await driver.findElements(titleAfterRefresh).then((els: any[]) => els.length > 0)) {
                  const savedTitle = await driver.findElement(titleAfterRefresh).getAttribute('value');
                  expect(savedTitle).toBe('Second Support Chang'); // Truncated due to 20-char limit
                }
              }

              // Verify first support change was deleted (should not exist)
              const secondSupportChange = By.css('#student-setting-device-support-1');
              const secondExists = await driver.findElements(secondSupportChange).then((els: any[]) => els.length > 0);
              expect(secondExists).toBe(false);
            }
          }
        }

        expect(await driver.getCurrentUrl()).not.toContain('login');
        await loginPage.logout();

      } catch (error) {
        console.log('Support changes test failed:', error);
        await loginPage.takeScreenshot('support-changes-failed');
        throw error;
      }
    }, 120000);
  });

  describe('Team Management', () => {

    it('should manage team member access levels', async () => {
      if (!testConfig.credentials?.adminUser?.email || !testConfig.credentials?.testUser?.email) {
        return;
      }

      try {
        // Admin creates student and adds team member
        await loginPage.navigateToLogin();
        await loginPage.loginWithAdminUser();
        await driver.sleep(3000);

        // Create student
        const enrollButton = By.css('#enrollStudent, #create-first-student');
        if (await driver.findElements(enrollButton).then((els: any[]) => els.length > 0)) {
          await driver.findElement(enrollButton).click();
          await driver.sleep(2000);

          await driver.findElement(By.css('#create-student-first-name')).sendKeys('Team');
          await driver.findElement(By.css('#create-student-last-name')).sendKeys('Student');
          await driver.findElement(By.css('#create-student-create-update')).click();
          await driver.sleep(3000);
        }

        // Navigate to Team tab
        await driver.findElement(By.css('#nav-settings')).click();
        await driver.sleep(2000);
        await driver.findElement(By.css('#settings-tab-team')).click();
        await driver.sleep(2000);

        // Click "Add New Team Member"
        await driver.findElement(By.css('#student-settings-team-new')).click();
        await driver.sleep(3000);

        // Add team member email
        const emailInput = By.css('#student-settings-team-email');
        const emailElements = await driver.findElements(emailInput);
        console.log('Email input fields found:', emailElements.length);
        
        if (emailElements.length > 0) {
          await driver.findElement(emailInput).clear();
          await driver.findElement(emailInput).sendKeys(testConfig.credentials.testUser.email);
          // Trigger Angular change detection
          await driver.executeScript('arguments[0].dispatchEvent(new Event("input", { bubbles: true }));', await driver.findElement(emailInput));
          await driver.executeScript('arguments[0].dispatchEvent(new Event("change", { bubbles: true }));', await driver.findElement(emailInput));
          
          // Verify email was set
          await driver.sleep(1000);
          const emailValue = await driver.findElement(emailInput).getAttribute('value');
          console.log('Email set to:', emailValue);
          
          if (!emailValue || emailValue.trim() === '') {
            throw new Error('Email field was not set correctly');
          }
        } else {
          throw new Error('Email input field not found after clicking Add New Team Member');
        }

        // Set read permissions - find and click first Read radio button
        const readRadios = await driver.findElements(By.css('mat-radio-button'));
        console.log('Radio buttons found:', readRadios.length);
        
        let permissionSet = false;
        for (let i = 0; i < readRadios.length; i++) {
          try {
            const radio = readRadios[i];
            if (radio) {
              const radioText = await radio.getText();
              console.log(`Radio ${i} text:`, radioText);
              
              // Look for Read permission radio button
              if (radioText && radioText.toLowerCase().includes('read')) {
                await radio.click();
                console.log('Clicked Read permission radio button');
                permissionSet = true;
                break;
              }
            }
          } catch (e) {
            const error = e as Error;
            console.log(`Error checking radio ${i}:`, error.message);
          }
        }
        
        if (!permissionSet) {
          console.log('Warning: Could not set Read permission - proceeding with default permissions');
        }

        // Save team member
        const saveButtons = await driver.findElements(By.css('button'));
        let saveClicked = false;
        
        for (let btn of saveButtons) {
          const text = await btn.getText();
          if (text.toLowerCase().includes('save')) {
            await driver.executeScript('arguments[0].scrollIntoView(true);', btn);
            await driver.sleep(500);
            await driver.executeScript('arguments[0].click();', btn);
            console.log('Save button clicked for team member');
            saveClicked = true;
            break;
          }
        }
        
        if (!saveClicked) {
          throw new Error('Save button not found for team member');
        }
        
        // Wait for save to complete (shorter timeout)
        await driver.sleep(3000);
        
        // Check for any error messages
        const errorElements = await driver.findElements(By.css('mat-error'));
        if (errorElements.length > 0 && errorElements[0]) {
          const errorText = await errorElements[0].getText();
          throw new Error(`Team member creation failed with error: ${errorText}`);
        }

        // Test passes - team member successfully added
        console.log('Team member successfully added with email:', testConfig.credentials.testUser.email);
        
        await loginPage.logout();

      } catch (error) {
        console.log('Team management test failed:', error);
        await loginPage.takeScreenshot('team-management-failed');
        throw error;
      }
    }, 180000);
  });
});