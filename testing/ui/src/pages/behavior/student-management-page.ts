import { By, WebDriver } from 'selenium-webdriver';
import { BaseTest } from '../../base/base-test';

export class StudentManagementPage extends BaseTest {
  // Student enrollment selectors
  private readonly addStudentButton = By.css('button:contains("Add Student"), .add-student-btn');
  private readonly studentNameInput = By.css('input[name="studentName"], input[placeholder*="name"]');
  private readonly studentEmailInput = By.css('input[name="email"], input[type="email"]');
  private readonly studentGradeInput = By.css('input[name="grade"], select[name="grade"]');
  private readonly saveStudentButton = By.css('button:contains("Save"), .save-btn');
  private readonly cancelButton = By.css('button:contains("Cancel"), .cancel-btn');
  
  // Student list selectors
  private readonly studentsList = By.css('.students-list, .student-item');
  private readonly studentCard = By.css('.student-card, .student-row');
  private readonly editStudentButton = By.css('button:contains("Edit"), .edit-btn');
  private readonly deleteStudentButton = By.css('button:contains("Delete"), .delete-btn');
  private readonly studentDetailsLink = By.css('a:contains("Details"), .details-link');
  
  // Search and filter
  private readonly searchInput = By.css('input[placeholder*="search"], .search-input');
  private readonly gradeFilter = By.css('select[name="gradeFilter"], .grade-filter');
  private readonly statusFilter = By.css('select[name="statusFilter"], .status-filter');
  
  // Enrollment dialog
  private readonly enrollmentDialog = By.css('.enrollment-dialog, .modal');
  private readonly enrollmentCodeInput = By.css('input[name="enrollmentCode"], input[placeholder*="code"]');
  private readonly generateCodeButton = By.css('button:contains("Generate"), .generate-btn');
  private readonly enrollButton = By.css('button:contains("Enroll"), .enroll-btn');

  constructor(driver: WebDriver) {
    super();
    this.driver = driver;
  }

  /**
   * Navigate to student management page
   */
  async navigateToStudentManagement(): Promise<void> {
    await this.navigateTo(`${this.config.baseUrl}/students`);
    await this.waitForPageLoad();
  }

  /**
   * Enroll a new student
   */
  async enrollStudent(studentName: string, email?: string, grade?: string): Promise<void> {
    await this.clickElement(this.addStudentButton);
    await this.waitForElement(this.studentNameInput);
    
    await this.typeText(this.studentNameInput, studentName);
    
    if (email) {
      await this.typeText(this.studentEmailInput, email);
    }
    
    if (grade) {
      if (await this.elementExists(By.css('select[name="grade"]'))) {
        await this.selectDropdownOption(this.studentGradeInput, grade);
      } else {
        await this.typeText(this.studentGradeInput, grade);
      }
    }
    
    await this.clickElement(this.saveStudentButton);
    
    // Wait for student to be added to list
    await this.waitForElement(this.studentsList);
  }

  /**
   * Search for a student
   */
  async searchStudent(searchTerm: string): Promise<void> {
    await this.typeText(this.searchInput, searchTerm);
    // Wait for search results to load
    await this.driver.sleep(1000);
  }

  /**
   * Filter students by grade
   */
  async filterByGrade(grade: string): Promise<void> {
    await this.selectDropdownOption(this.gradeFilter, grade);
    await this.driver.sleep(1000);
  }

  /**
   * Get list of students
   */
  async getStudentsList(): Promise<string[]> {
    const students = await this.driver.findElements(this.studentCard);
    const studentNames: string[] = [];
    
    for (const student of students) {
      const nameElement = await student.findElement(By.css('.student-name, .name'));
      const name = await nameElement.getText();
      studentNames.push(name);
    }
    
    return studentNames;
  }

  /**
   * Edit student details
   */
  async editStudent(studentName: string, newName?: string, newEmail?: string): Promise<void> {
    await this.searchStudent(studentName);
    
    const studentCards = await this.driver.findElements(this.studentCard);
    for (const card of studentCards) {
      const nameElement = await card.findElement(By.css('.student-name, .name'));
      const name = await nameElement.getText();
      
      if (name.includes(studentName)) {
        const editBtn = await card.findElement(this.editStudentButton);
        await editBtn.click();
        break;
      }
    }
    
    if (newName) {
      await this.typeText(this.studentNameInput, newName);
    }
    
    if (newEmail) {
      await this.typeText(this.studentEmailInput, newEmail);
    }
    
    await this.clickElement(this.saveStudentButton);
  }

  /**
   * Delete a student
   */
  async deleteStudent(studentName: string): Promise<void> {
    await this.searchStudent(studentName);
    
    const studentCards = await this.driver.findElements(this.studentCard);
    for (const card of studentCards) {
      const nameElement = await card.findElement(By.css('.student-name, .name'));
      const name = await nameElement.getText();
      
      if (name.includes(studentName)) {
        const deleteBtn = await card.findElement(this.deleteStudentButton);
        await deleteBtn.click();
        
        // Confirm deletion
        const confirmButton = By.css('button:contains("Confirm"), button:contains("Yes"), .confirm-btn');
        if (await this.elementExists(confirmButton)) {
          await this.clickElement(confirmButton);
        }
        break;
      }
    }
  }

  /**
   * Navigate to student dashboard
   */
  async navigateToStudentDashboard(studentName: string): Promise<void> {
    await this.searchStudent(studentName);
    
    const studentCards = await this.driver.findElements(this.studentCard);
    for (const card of studentCards) {
      const nameElement = await card.findElement(By.css('.student-name, .name'));
      const name = await nameElement.getText();
      
      if (name.includes(studentName)) {
        const detailsLink = await card.findElement(this.studentDetailsLink);
        await detailsLink.click();
        await this.waitForPageLoad();
        break;
      }
    }
  }

  /**
   * Generate enrollment code for student
   */
  async generateEnrollmentCode(studentName: string): Promise<string> {
    await this.searchStudent(studentName);
    
    const studentCards = await this.driver.findElements(this.studentCard);
    for (const card of studentCards) {
      const nameElement = await card.findElement(By.css('.student-name, .name'));
      const name = await nameElement.getText();
      
      if (name.includes(studentName)) {
        const enrollBtn = await card.findElement(this.enrollButton);
        await enrollBtn.click();
        
        await this.waitForElement(this.enrollmentDialog);
        await this.clickElement(this.generateCodeButton);
        
        // Get generated code
        const codeElement = await this.waitForElement(this.enrollmentCodeInput);
        return await codeElement.getAttribute('value');
      }
    }
    return '';
  }

  /**
   * Verify student appears in list after enrollment
   */
  async verifyStudentEnrolled(studentName: string): Promise<boolean> {
    await this.refreshAndWaitForData();
    const students = await this.getStudentsList();
    return students.some(name => name.includes(studentName));
  }

  /**
   * Get student count
   */
  async getStudentCount(): Promise<number> {
    const students = await this.driver.findElements(this.studentCard);
    return students.length;
  }

  /**
   * Check if student management page is loaded
   */
  async isPageLoaded(): Promise<boolean> {
    return await this.elementExists(this.studentsList) || 
           await this.elementExists(this.addStudentButton);
  }
}