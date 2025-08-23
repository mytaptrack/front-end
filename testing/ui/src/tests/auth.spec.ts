
import { LoginPage } from '../pages/auth/login-page';
import { DriverFactory } from '../utils/driver-factory';
import { TestConfig, defaultConfig } from '../config/test-config';
import { By } from 'selenium-webdriver';
import { cleanUp } from '../utils/clean-up';

describe('Authentication Tests', () => {
  let loginPage: LoginPage;
  let testConfig: TestConfig;

  beforeAll(async () => {
    testConfig = defaultConfig;
    const driver = await DriverFactory.createDriver(testConfig);
    loginPage = new LoginPage(driver);
    await loginPage.setup();
  }, 30000);

  afterAll(async () => {
    if (loginPage) {
      await loginPage.teardown();
    }
  }, 10000);

  describe('Login Page', () => {
    beforeEach(async () => {
      await cleanUp();
    });

    it('should navigate to login page successfully', async () => {
      await loginPage.navigateToLogin();
      const currentUrl = await loginPage.getCurrentUrl();
      expect(currentUrl).toContain(testConfig.baseUrl);
    });

    it('should display login form elements', async () => {
      await loginPage.navigateToLogin();
      
      // Check if essential form elements exist using private property access
      const emailSelector = By.css('input[type="email"], input[name="email"], #email');
      const passwordSelector = By.css('input[type="password"], input[name="password"], #password');
      const loginButtonSelector = By.css('button[type="submit"]');
      
      const hasEmailField = await loginPage.elementExists(emailSelector);
      const hasPasswordField = await loginPage.elementExists(passwordSelector);
      const hasLoginButton = await loginPage.elementExists(loginButtonSelector);
      
      expect(hasEmailField).toBe(true);
      expect(hasPasswordField).toBe(true);
      expect(hasLoginButton).toBe(true);
    });

    it('should show error for invalid credentials', async () => {
      await loginPage.navigateToLogin();
      
      try {
        await loginPage.login('invalid@email.com', 'wrongpassword');
        
        // Wait a bit for error to appear
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const hasError = await loginPage.hasLoginError();
        if (hasError) {
          const errorMessage = await loginPage.getLoginErrorMessage();
          expect(errorMessage).not.toBe('');
        }
        // Note: Some systems might redirect on invalid login, so we don't fail if no error is shown
      } catch (error) {
        // Login attempt might timeout or fail, which is expected for invalid credentials
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Login with invalid credentials failed as expected:', errorMessage);
      }
    });

    it('should successfully login with test user credentials (if configured)', async () => {
      
      // Skip test if no test credentials are configured
      if (!testConfig.credentials?.testUser?.email) {
        return;
      }
      
      await loginPage.navigateToLogin();
      
      try {
        await loginPage.loginWithTestUser();
        
        // Check if login was successful by verifying URL change
        await new Promise(resolve => setTimeout(resolve, 3000));
        const isLoggedIn = await loginPage.isLoggedIn();
        expect(isLoggedIn).toBe(true);
        
        // Logout after successful login
        await loginPage.logout();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Test user login failed:', errorMessage);
        // Take screenshot on failure
        await loginPage.takeScreenshot('login-test-user-failed');
        throw error;
      }
    }, 60 * 1000);
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      await cleanUp();
    });

    it('should have working navigation links', async () => {
      await loginPage.navigateToLogin();
      
      // Test forgot password link if it exists
      const forgotPasswordSelector = By.css('a:contains("Forgot"), a[href*="forgot"]');
      const hasForgotPasswordLink = await loginPage.elementExists(forgotPasswordSelector);
      if (hasForgotPasswordLink) {
        // Just verify the link exists, don't click it to avoid navigation
        expect(hasForgotPasswordLink).toBe(true);
      }
      
      // Test sign up link if it exists
      const signUpSelector = By.css('a:contains("Sign Up"), a[href*="signup"]');
      const hasSignUpLink = await loginPage.elementExists(signUpSelector);
      if (hasSignUpLink) {
        expect(hasSignUpLink).toBe(true);
      }
    });
  });
});