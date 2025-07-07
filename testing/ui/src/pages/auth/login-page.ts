import { By, WebDriver } from 'selenium-webdriver';
import { BaseTest } from '../../base/base-test';

export class LoginPage extends BaseTest {
  // Selectors
  private readonly emailInput = By.css('input[type="email"], input[name="email"], input[autocomplete="username"], #email');
  private readonly passwordInput = By.css('input[type="password"], input[name="password"], input[autocomplete="current-password"], #password');
  private readonly loginButton = By.css('button[type="submit"]');
  private readonly forgotPasswordLink = By.css('a[href*="forgot"]');
  private readonly signUpLink = By.css('a[href*="signup"]');
  private readonly errorMessage = By.css('.error, .alert-danger, .mat-error');
  private readonly loadingSpinner = By.css('.loading, .spinner, mat-spinner');

  constructor(driver: WebDriver) {
    super();
    this.driver = driver;
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin(): Promise<void> {
    await this.navigateTo(this.config.baseUrl);
    await this.waitForPageLoad();
    
    // Wait for Amplify authenticator to load
    await this.driver.sleep(2000);
    
    // Check if already on login form or need to navigate
    const hasEmailInput = await this.elementExists(this.emailInput);
    if (!hasEmailInput) {
      // Wait a bit more for Amplify to render
      await this.driver.sleep(3000);
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    // Wait for form to be ready
    await this.waitForElement(this.emailInput);
    await this.waitForElement(this.passwordInput);
    
    await this.typeText(this.emailInput, email);
    await this.typeText(this.passwordInput, password);
    
    // Wait for login button to be enabled
    await this.waitForElement(this.loginButton);
    await this.clickElement(this.loginButton);
    
    // Wait for login to complete
    await this.waitForLoginToComplete();
  }

  /**
   * Login with test user credentials
   */
  async loginWithTestUser(): Promise<void> {
    await this.login(
      await this.config.credentials.testUser.email,
      await this.config.credentials.testUser.password
    );
  }

  /**
   * Login with admin user credentials
   */
  async loginWithAdminUser(): Promise<void> {
    await this.login(
      await this.config.credentials.adminUser.email,
      await this.config.credentials.adminUser.password
    );
  }

  /**
   * Wait for login process to complete
   */
  async waitForLoginToComplete(): Promise<void> {
    // Wait for loading spinner to disappear if present
    if (await this.elementExists(this.loadingSpinner)) {
      await this.waitForElementToDisappear(this.loadingSpinner);
    }
    
    // Wait for navigation away from login page
    await this.driver.wait(async () => {
      const currentUrl = await this.getCurrentUrl();
      return !currentUrl.includes('login') && !currentUrl.includes('auth');
    }, this.config.timeout.explicit);
  }

  /**
   * Check if login error is displayed
   */
  async hasLoginError(): Promise<boolean> {
    return await this.elementExists(this.errorMessage);
  }

  /**
   * Get login error message
   */
  async getLoginErrorMessage(): Promise<string> {
    if (await this.hasLoginError()) {
      return await this.getElementText(this.errorMessage);
    }
    return '';
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.clickElement(this.forgotPasswordLink);
  }

  /**
   * Click sign up link
   */
  async clickSignUp(): Promise<void> {
    await this.clickElement(this.signUpLink);
  }

  /**
   * Check if user is logged in by checking for dashboard elements
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const currentUrl = await this.getCurrentUrl();
      return !currentUrl.includes('login') && !currentUrl.includes('auth');
    } catch {
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // First try to click the user menu trigger
      const userMenu = By.css('#user-menu-trigger');
      if (await this.elementExists(userMenu)) {
        await this.clickElement(userMenu);
        await this.driver.sleep(1000);
        
        // Then click logout
        const logoutButton = By.css('#user-menu-logout');
        if (await this.elementExists(logoutButton)) {
          await this.clickElement(logoutButton);
          await this.driver.sleep(2000); // Just wait, don't check page load
          return;
        }
      }
      
      // Fallback: try direct logout button
      const directLogout = By.css('button');
      if (await this.elementExists(directLogout)) {
        await this.clickElement(directLogout);
        await this.driver.sleep(2000);
      }
    } catch (error) {
      console.log('Logout failed, continuing with test cleanup');
    }
  }
}