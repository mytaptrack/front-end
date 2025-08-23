import { By, WebDriver } from 'selenium-webdriver';
import { BaseTest } from '../../base/base-test';

export class DashboardPage extends BaseTest {
  // Main dashboard selectors
  private readonly calendarSelector = By.css('.calendar, .date-picker, input[type="date"]');
  private readonly chartContainer = By.css('.chart-container, canvas, .chart');
  private readonly dailyDetailsSection = By.css('.daily-details, .day-details');
  private readonly dashboardContent = By.css('.dashboard-content, .main-content, .content, main');
  
  // Tabs
  private readonly frequencyTab = By.css('mat-tab[label*="Frequency"], .tab');
  private readonly durationTab = By.css('mat-tab[label*="Duration"], .tab');
  private readonly notesTab = By.css('mat-tab[label*="Notes"], .tab');
  
  // Frequency tab elements
  private readonly frequencyBehaviors = By.css('.frequency-behavior, .behavior-item');
  private readonly deleteButton = By.css('button, .delete-btn');
  private readonly excludeDayButton = By.css('button, .exclude-btn');
  private readonly addBehaviorButton = By.css('button, .add-behavior-btn');
  private readonly showSourcesToggle = By.css('button, .sources-toggle');
  private readonly showAbcToggle = By.css('button, .abc-toggle');
  
  // Duration tab elements
  private readonly durationEvents = By.css('.duration-event, .start-stop-event');
  private readonly addMissingStopButton = By.css('button');
  private readonly newDurationButton = By.css('button');
  
  // Notes elements
  private readonly addNoteButton = By.css('button, .add-note-btn');
  private readonly notesList = By.css('.notes-list, .note-item');
  private readonly noteTextArea = By.css('textarea, .note-input');
  private readonly saveNoteButton = By.css('button, .save-btn');

  constructor(driver: WebDriver) {
    super();
    this.driver = driver;
  }

  /**
   * Navigate to dashboard
   */
  async navigateToDashboard(): Promise<void> {
    await this.navigateTo(`${this.config.baseUrl}/dashboard`);
    await this.waitForPageLoad();
  }

  /**
   * Wait for dashboard to load completely
   */
  async waitForDashboardToLoad(): Promise<void> {
    await this.waitForPageLoad();
    // Wait for any of the main dashboard elements to appear
    try {
      await this.waitForElement(this.dashboardContent, 10000);
    } catch {
      // If main content doesn't exist, wait for chart or other elements
      try {
        await this.waitForElement(this.chartContainer, 5000);
      } catch {
        // If no specific elements, just wait for page stabilization
        await this.driver.sleep(3000);
      }
    }
  }

  /**
   * Check if dashboard has content
   */
  async hasDashboardContent(): Promise<boolean> {
    // Check for any major dashboard elements
    const hasContent = await this.elementExists(this.dashboardContent);
    const hasChart = await this.elementExists(this.chartContainer);
    const hasDetails = await this.elementExists(this.dailyDetailsSection);
    
    return hasContent || hasChart || hasDetails;
  }

  /**
   * Select date range on calendar
   */
  async selectDateRange(startDate: string, endDate?: string): Promise<void> {
    await this.clickElement(this.calendarSelector);
    
    // If it's a date input, set the value directly
    if (await this.elementExists(By.css('input[type="date"]'))) {
      await this.typeText(By.css('input[type="date"]'), startDate);
      if (endDate) {
        const endDateInput = By.css('input[type="date"]:nth-of-type(2)');
        if (await this.elementExists(endDateInput)) {
          await this.typeText(endDateInput, endDate);
        }
      }
    }
  }

  /**
   * Click on chart data point
   */
  async clickOnChartData(): Promise<void> {
    await this.clickElement(this.chartContainer);
    // Wait for navigation to daily details
    await this.waitForElement(this.dailyDetailsSection);
    await this.scrollToElement(this.dailyDetailsSection);
  }

  /**
   * Switch to frequency tab
   */
  async switchToFrequencyTab(): Promise<void> {
    await this.clickElement(this.frequencyTab);
    await this.waitForElement(this.frequencyBehaviors);
  }

  /**
   * Switch to duration tab
   */
  async switchToDurationTab(): Promise<void> {
    await this.clickElement(this.durationTab);
    await this.waitForElement(this.durationEvents);
  }

  /**
   * Switch to notes tab
   */
  async switchToNotesTab(): Promise<void> {
    await this.clickElement(this.notesTab);
    await this.waitForElement(this.notesList);
  }

  /**
   * Verify frequency behaviors are displayed correctly
   */
  async verifyFrequencyBehaviorsDisplayed(): Promise<boolean> {
    await this.switchToFrequencyTab();
    return await this.elementExists(this.frequencyBehaviors);
  }

  /**
   * Delete a behavior event
   */
  async deleteBehaviorEvent(behaviorIndex: number = 0): Promise<void> {
    await this.switchToFrequencyTab();
    const behaviorItems = await this.driver.findElements(this.frequencyBehaviors);
    if (behaviorItems.length > behaviorIndex && behaviorItems[behaviorIndex]) {
      // Find delete button within the specific behavior item
      const deleteBtn = await behaviorItems[behaviorIndex]!.findElement(this.deleteButton);
      await deleteBtn.click();
      
      // Confirm deletion if confirmation dialog appears
      const confirmButton = By.css('button');
      if (await this.elementExists(confirmButton)) {
        await this.clickElement(confirmButton);
      }
    }
  }

  /**
   * Exclude current day
   */
  async excludeDay(): Promise<void> {
    await this.clickElement(this.excludeDayButton);
    // Wait for confirmation
    await this.driver.sleep(1000);
  }

  /**
   * Add new behavior event
   */
  async addNewBehaviorEvent(behaviorName: string): Promise<void> {
    await this.clickElement(this.addBehaviorButton);
    
    // Look for behavior selection dropdown or input
    const behaviorSelect = By.css('select[name*="behavior"], .behavior-select');
    const behaviorInput = By.css('input[name*="behavior"], .behavior-input');
    
    if (await this.elementExists(behaviorSelect)) {
      await this.selectDropdownOption(behaviorSelect, behaviorName);
    } else if (await this.elementExists(behaviorInput)) {
      await this.typeText(behaviorInput, behaviorName);
    }
    
    // Save the new behavior
    const saveButton = By.css('button, .save-btn');
    await this.clickElement(saveButton);
  }

  /**
   * Toggle show/hide sources
   */
  async toggleSources(): Promise<void> {
    await this.clickElement(this.showSourcesToggle);
  }

  /**
   * Toggle show/hide ABC data
   */
  async toggleAbcData(): Promise<void> {
    await this.clickElement(this.showAbcToggle);
  }

  /**
   * Modify ABC data for tracked behavior
   */
  async modifyAbcData(behaviorIndex: number, antecedent: string, consequence: string): Promise<void> {
    const behaviorItems = await this.driver.findElements(this.frequencyBehaviors);
    if (behaviorItems.length > behaviorIndex && behaviorItems[behaviorIndex]) {
      // Click on ABC button for specific behavior
      const abcButton = await behaviorItems[behaviorIndex]!.findElement(By.css('button'));
      await abcButton.click();
      
      // Fill in ABC data
      const antecedentInput = By.css('input[name*="antecedent"], textarea[name*="antecedent"]');
      const consequenceInput = By.css('input[name*="consequence"], textarea[name*="consequence"]');
      
      await this.typeText(antecedentInput, antecedent);
      await this.typeText(consequenceInput, consequence);
      
      // Save ABC data
      const saveButton = By.css('button, .save-btn');
      await this.clickElement(saveButton);
    }
  }

  /**
   * Verify duration events are displayed correctly
   */
  async verifyDurationEventsDisplayed(): Promise<boolean> {
    await this.switchToDurationTab();
    return await this.elementExists(this.durationEvents);
  }

  /**
   * Delete duration event (start or stop)
   */
  async deleteDurationEvent(eventIndex: number = 0): Promise<void> {
    await this.switchToDurationTab();
    const events = await this.driver.findElements(this.durationEvents);
    if (events.length > eventIndex && events[eventIndex]) {
      const deleteBtn = await events[eventIndex]!.findElement(this.deleteButton);
      await deleteBtn.click();
      
      // Confirm deletion
      const confirmButton = By.css('button');
      if (await this.elementExists(confirmButton)) {
        await this.clickElement(confirmButton);
      }
    }
  }

  /**
   * Add missing stop event
   */
  async addMissingStop(date: string): Promise<void> {
    await this.switchToDurationTab();
    await this.clickElement(this.addMissingStopButton);
    
    // Fill in date field (should be only one date field)
    const dateInput = By.css('input[type="date"], input[type="datetime-local"]');
    await this.typeText(dateInput, date);
    
    const saveButton = By.css('button, .save-btn');
    await this.clickElement(saveButton);
  }

  /**
   * Add new duration event
   */
  async addNewDuration(startDate: string, endDate: string): Promise<void> {
    await this.switchToDurationTab();
    await this.clickElement(this.newDurationButton);
    
    // Fill in start and end date fields
    const dateInputs = await this.driver.findElements(By.css('input[type="date"], input[type="datetime-local"]'));
    if (dateInputs.length >= 2 && dateInputs[0] && dateInputs[1]) {
      await dateInputs[0]!.sendKeys(startDate);
      await dateInputs[1]!.sendKeys(endDate);
    }
    
    const saveButton = By.css('button, .save-btn');
    await this.clickElement(saveButton);
  }

  /**
   * Add new note
   */
  async addNewNote(noteText: string): Promise<void> {
    await this.switchToNotesTab();
    await this.clickElement(this.addNoteButton);
    await this.typeText(this.noteTextArea, noteText);
    await this.clickElement(this.saveNoteButton);
  }

  /**
   * Modify existing note
   */
  async modifyNote(noteIndex: number, newText: string): Promise<void> {
    await this.switchToNotesTab();
    const notes = await this.driver.findElements(this.notesList);
    if (notes.length > noteIndex && notes[noteIndex]) {
      // Click edit button on specific note
      const editButton = await notes[noteIndex]!.findElement(By.css('button, .edit-btn'));
      await editButton.click();
      
      await this.typeText(this.noteTextArea, newText);
      await this.clickElement(this.saveNoteButton);
    }
  }

  /**
   * Verify data appears after refresh (as per requirements)
   */
  async verifyDataAfterRefresh(): Promise<boolean> {
    await this.refreshAndWaitForData();
    // Check if dashboard content is loaded
    return await this.elementExists(this.chartContainer) && 
           await this.elementExists(this.dailyDetailsSection);
  }
}