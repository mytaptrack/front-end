import { By, WebDriver } from 'selenium-webdriver';
import { BaseTest } from '../../base/base-test';

export class AbcSettingsPage extends BaseTest {
  // ABC tab and navigation selectors
  private readonly abcTab = By.css('#settings-tab-abc');
  private readonly abcTabActive = By.css('#settings-tab-abc.active');
  private readonly backToDashboardLink = By.css('#back-to-dashboard');
  
  // ABC form selectors
  private readonly abcContainer = By.css('.abc-collection-container');
  private readonly nameInput = By.css('input[ng-reflect-name="name"]');
  private readonly antecedentsTextarea = By.css('textarea[ng-reflect-name="antecedents"]');
  private readonly consequencesTextarea = By.css('textarea[ng-reflect-name="consequences"]');
  private readonly tagsComponent = By.css('app-mtt-tags');
  
  // Action buttons
  private readonly saveButton = By.css('button:contains("Save"), .save-btn');
  private readonly cancelButton = By.css('button:contains("Cancel"), .cancel-btn');
  private readonly deleteButton = By.css('button:contains("Delete"), .delete-btn');
  
  // Status indicators
  private readonly saveSpinner = By.css('.save-spinner');
  private readonly deleteSpinner = By.css('mat-progress-spinner');
  private readonly readOnlyIndicator = By.css('[readonly]');
  
  // Error and validation messages
  private readonly errorMessage = By.css('.error-message, .mat-error');
  private readonly successMessage = By.css('.success-message, .mat-success');
  private readonly confirmDialog = By.css('.confirm-dialog, .mat-dialog-container');
  private readonly confirmDeleteButton = By.css('button:contains("Delete"), button:contains("Yes"), .confirm-btn');
  private readonly cancelDeleteButton = By.css('button:contains("Cancel"), button:contains("No"), .cancel-btn');
  
  // Hints and labels
  private readonly antecedentsHint = By.css('mat-hint:contains("antecedent")');
  private readonly consequencesHint = By.css('mat-hint:contains("consequence")');
  private readonly antecedentsLabel = By.css('mat-label:contains("Antecedents")');
  private readonly consequencesLabel = By.css('mat-label:contains("Consequences")');

  constructor(driver: WebDriver) {
    super();
    this.driver = driver;
  }

  /**
   * Navigate to ABC settings tab
   */
  async navigateToAbcSettings(): Promise<void> {
    await this.waitForElement(this.abcTab);
    await this.clickElement(this.abcTab);
    await this.waitForElement(this.abcContainer);
  }

  /**
   * Check if ABC tab is visible
   */
  async isAbcTabVisible(): Promise<boolean> {
    return await this.elementExists(this.abcTab);
  }

  /**
   * Check if ABC tab is active
   */
  async isAbcTabActive(): Promise<boolean> {
    return await this.elementExists(this.abcTabActive);
  }

  /**
   * Check if ABC form is in read-only mode
   */
  async isReadOnlyMode(): Promise<boolean> {
    const readOnlyElements = await this.driver.findElements(this.readOnlyIndicator);
    return readOnlyElements.length > 0;
  }

  /**
   * Enter ABC collection name (for management view)
   */
  async enterName(name: string): Promise<void> {
    if (await this.elementExists(this.nameInput)) {
      await this.clearAndType(this.nameInput, name);
    }
  }

  /**
   * Enter antecedents (one per line)
   */
  async enterAntecedents(antecedents: string[]): Promise<void> {
    const antecedentsText = antecedents.join('\n');
    await this.clearAndType(this.antecedentsTextarea, antecedentsText);
  }

  /**
   * Enter consequences (one per line)
   */
  async enterConsequences(consequences: string[]): Promise<void> {
    const consequencesText = consequences.join('\n');
    await this.clearAndType(this.consequencesTextarea, consequencesText);
  }

  /**
   * Get antecedents text content
   */
  async getAntecedents(): Promise<string[]> {
    const textarea = await this.waitForElement(this.antecedentsTextarea);
    const text = await textarea.getAttribute('value');
    return text.split('\n').filter(line => line.trim().length > 0);
  }

  /**
   * Get consequences text content
   */
  async getConsequences(): Promise<string[]> {
    const textarea = await this.waitForElement(this.consequencesTextarea);
    const text = await textarea.getAttribute('value');
    return text.split('\n').filter(line => line.trim().length > 0);
  }

  /**
   * Save ABC settings
   */
  async saveAbcSettings(): Promise<void> {
    await this.clickElement(this.saveButton);
    
    // Wait for save operation to complete
    if (await this.elementExists(this.saveSpinner)) {
      await this.waitForElementToDisappear(this.saveSpinner);
    }
  }

  /**
   * Cancel ABC changes
   */
  async cancelAbcChanges(): Promise<void> {
    await this.clickElement(this.cancelButton);
  }

  /**
   * Delete ABC settings
   */
  async deleteAbcSettings(): Promise<void> {
    await this.clickElement(this.deleteButton);
    
    // Handle confirmation dialog
    if (await this.elementExists(this.confirmDialog)) {
      await this.clickElement(this.confirmDeleteButton);
    }
    
    // Wait for delete operation to complete
    if (await this.elementExists(this.deleteSpinner)) {
      await this.waitForElementToDisappear(this.deleteSpinner);
    }
  }

  /**
   * Cancel delete operation
   */
  async cancelDeleteOperation(): Promise<void> {
    await this.clickElement(this.deleteButton);
    
    // Handle confirmation dialog
    if (await this.elementExists(this.confirmDialog)) {
      await this.clickElement(this.cancelDeleteButton);
    }
  }

  /**
   * Check if save button is enabled
   */
  async isSaveButtonEnabled(): Promise<boolean> {
    const saveBtn = await this.driver.findElement(this.saveButton);
    return await saveBtn.isEnabled();
  }

  /**
   * Check if delete button is enabled
   */
  async isDeleteButtonEnabled(): Promise<boolean> {
    const deleteBtn = await this.driver.findElement(this.deleteButton);
    return await deleteBtn.isEnabled();
  }

  /**
   * Check if action buttons are visible (indicates not read-only)
   */
  async areActionButtonsVisible(): Promise<boolean> {
    return await this.elementExists(this.saveButton) && 
           await this.elementExists(this.cancelButton) && 
           await this.elementExists(this.deleteButton);
  }

  /**
   * Wait for save operation to complete
   */
  async waitForSaveComplete(): Promise<void> {
    if (await this.elementExists(this.saveSpinner)) {
      await this.waitForElementToDisappear(this.saveSpinner);
    }
  }

  /**
   * Wait for delete operation to complete
   */
  async waitForDeleteComplete(): Promise<void> {
    if (await this.elementExists(this.deleteSpinner)) {
      await this.waitForElementToDisappear(this.deleteSpinner);
    }
  }

  /**
   * Check if hints are displayed correctly
   */
  async areHintsDisplayed(): Promise<boolean> {
    return await this.elementExists(this.antecedentsHint) && 
           await this.elementExists(this.consequencesHint);
  }

  /**
   * Check if labels are displayed correctly
   */
  async areLabelsDisplayed(): Promise<boolean> {
    return await this.elementExists(this.antecedentsLabel) && 
           await this.elementExists(this.consequencesLabel);
  }

  /**
   * Get error message if any
   */
  async getErrorMessage(): Promise<string> {
    if (await this.elementExists(this.errorMessage)) {
      const errorElement = await this.driver.findElement(this.errorMessage);
      return await errorElement.getText();
    }
    return '';
  }

  /**
   * Get success message if any
   */
  async getSuccessMessage(): Promise<string> {
    if (await this.elementExists(this.successMessage)) {
      const successElement = await this.driver.findElement(this.successMessage);
      return await successElement.getText();
    }
    return '';
  }

  /**
   * Check if ABC form is loaded
   */
  async isAbcFormLoaded(): Promise<boolean> {
    return await this.elementExists(this.abcContainer) && 
           await this.elementExists(this.antecedentsTextarea) && 
           await this.elementExists(this.consequencesTextarea);
  }

  /**
   * Verify ABC data is saved correctly
   */
  async verifyAbcDataSaved(expectedAntecedents: string[], expectedConsequences: string[]): Promise<boolean> {
    const actualAntecedents = await this.getAntecedents();
    const actualConsequences = await this.getConsequences();
    
    return this.arraysEqual(actualAntecedents, expectedAntecedents) && 
           this.arraysEqual(actualConsequences, expectedConsequences);
  }

  /**
   * Fill complete ABC form
   */
  async fillAbcForm(name: string, antecedents: string[], consequences: string[]): Promise<void> {
    if (await this.elementExists(this.nameInput)) {
      await this.enterName(name);
    }
    await this.enterAntecedents(antecedents);
    await this.enterConsequences(consequences);
  }

  /**
   * Clear ABC form
   */
  async clearAbcForm(): Promise<void> {
    if (await this.elementExists(this.nameInput)) {
      await this.clearField(this.nameInput);
    }
    await this.clearField(this.antecedentsTextarea);
    await this.clearField(this.consequencesTextarea);
  }

  /**
   * Helper method to compare arrays
   */
  private arraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, i) => val === arr2[i]);
  }

  /**
   * Helper method to clear and type text
   */
  private async clearAndType(selector: By, text: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.clear();
    await element.sendKeys(text);
  }

  /**
   * Helper method to clear field
   */
  private async clearField(selector: By): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.clear();
  }
}