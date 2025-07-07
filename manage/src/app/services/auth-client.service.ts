import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Amplify } from 'aws-amplify';
import { 
  AuthSession,
  confirmSignUp, fetchAuthSession, getCurrentUser, resendSignUpCode, signOut, signUp
} from 'aws-amplify/auth';
import { amplifyConfig } from '../lib/config/aws-exports';
import { CognitoUser, CognitoUserSession } from 'amazon-cognito-identity-js';
import { MytaptrackEnvironment } from '../lib/config/environment';
declare const gapi: any;
declare const launchUri: any;

@Injectable({
  providedIn: 'root'
})
export class AuthClientService {
  static setEnvironment(environment: MytaptrackEnvironment) {
    Amplify.configure(amplifyConfig(environment));
  }

  public signedIn: boolean = false;
  public session: BehaviorSubject<AuthSession | undefined> = new BehaviorSubject(undefined);
  public name: string;
  public cognitoUser: any;
  public email:any;
  public password:any;
  public previousUrl: string;
  public nextRefresh: Date;
  private refreshTimer: any;
  private refreshInterval: number = 5 * 60 * 1000; // 5 minutes before expiry

  get token(): string { return this.session.getValue()?.tokens.idToken.toString(); }
  get group(): string[] { 
    if(!this.session.getValue()) {
      return [];
    }
    const accessToken = this.session.getValue().tokens.accessToken;
    return (accessToken?.payload['cognito:groups'] as string[])?.filter(x => x !== 'pretest');
  }


  constructor(private router: Router, private http: HttpClient) {
    // gapi?.load('auth2', () => {
    //   gapi.auth2.init({ client_id: environment.googleClientId });
    // });
    // Hub.listen('auth', async ({ payload }) => {
    //   const { event } = payload;
    //   if(event === 'autoSignIn' || event === 'signIn' || event === 'cognitoHostedUI') {
    //     const user = this.cognitoUser;
    //     this.cognitoUser = await getCurrentUser();
    //     if((user as any)?.username != this.cognitoUser?.getUsername()) {
    //       this.processUserSession();
    //     }
    //   } else if (event === 'autoSignIn_failure' || event === 'signOut') {
    //     this.cognitoUser = undefined;
    //   }
    // });
    this.processUserSession();
  }

  async checkAuthentication() {
    try {
      const session = await fetchAuthSession();
      if(!session || !session.tokens) {
        this.signOut();
        return;
      }
      if(session) {
        const user = await getCurrentUser();
        this.cognitoUser = user;
        this.session.next(session);
        this.scheduleTokenRefresh(session);
      }
    } catch (err) {
      return false;
    }
  }

  async processUserSession() {
    try {
      this.cognitoUser = (await getCurrentUser()).signInDetails;
      if(this.session.getValue()) {
        return;
      }
      const session = await fetchAuthSession();

      if(!session.credentials.sessionToken) {
        this.session.next(null);
        this.clearRefreshTimer();
      } else {
        this.nextRefresh = new Date(new Date().getTime() + (1000 * 60 * 5));
        this.session.next(session);
        this.scheduleTokenRefresh(session);
      }
    } catch (err) {
      console.error(err);
    }
  }

  private scheduleTokenRefresh(session: AuthSession) {
    if(!session?.tokens?.accessToken) {
      return;
    }

    // Clear any existing timer
    this.clearRefreshTimer();

    try {
      // Get token expiration time
      const accessToken = session.tokens.accessToken;
      const payload = JSON.parse(atob(accessToken.toString().split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      // Schedule refresh 5 minutes before expiry (or immediately if already close to expiry)
      const refreshTime = Math.max(0, timeUntilExpiry - this.refreshInterval);
      
      console.log(`Token expires in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes, scheduling refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);

      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);

    } catch (error) {
      console.error('Error scheduling token refresh:', error);
      // Fallback: schedule refresh in 50 minutes
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, 50 * 60 * 1000);
    }
  }

  private async refreshToken() {
    try {
      console.log('Refreshing authentication token...');
      
      // Fetch a new session which will include refreshed tokens
      const newSession = await fetchAuthSession({ forceRefresh: true });
      
      if (newSession && newSession.tokens) {
        this.session.next(newSession);
        this.nextRefresh = new Date(new Date().getTime() + (1000 * 60 * 5));
        console.log('Token refreshed successfully');
        
        // Schedule the next refresh
        this.scheduleTokenRefresh(newSession);
      } else {
        console.error('Failed to refresh token - no valid session received');
        this.handleTokenRefreshFailure();
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.handleTokenRefreshFailure();
    }
  }

  private handleTokenRefreshFailure() {
    // If token refresh fails, try once more after a short delay
    setTimeout(() => {
      this.refreshToken();
    }, 30000); // Try again in 30 seconds
  }

  private clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async loadGoogleAuth2() {
    // if(gapi.auth2) {
    //   return;
    // }
    // await new Promise<void>((resolve) => {
    //   gapi.load('auth2', function() {
    //     resolve();
    //   });
    // });
    // gapi.auth2.init();
  }

  async signOut() {
    
    // const authInstance = await gapi.auth2.getAuthInstance();
    // await gapi.auth2.getAuthInstance().signOut();
    // window.location.href = `https://${environment.cognitoLoginDomain}/oauth2/logout?client_id=${environment.cognitoClientId}&logout_uri=${environment.cognitoCallbackUrl}`;
    try {
      // Clear the refresh timer
      this.clearRefreshTimer();
      
      // window.location.href = `https://${environment.cognitoLoginDomain}/logout?client_id=${environment.cognitoClientId}&logout_uri=${environment.cognitoCallbackUrl}`;
      await signOut({global: true});
      this.session.next(null);
      this.previousUrl = null;  
    } catch (err) {
      console.error(err);
    }
  }

  //function for aws registration
  async register(email, password, name) {
    this.email = email;
    const attributeList = [];
    var dataName = {
      Name : 'name',
      Value : name
    };
    const result = await signUp({
      username: email,
      password: password,
      ...attributeList
    });
    return result;
  }

  //function for confirm aws user registration
  async confirmAuthCode(code) {
    return await confirmSignUp( { username: this.email, confirmationCode: code });
  }

  //funtion to resend confirm auth code 
  async resendCode(email) {
    return await resendSignUpCode(email);
  }

  //function for forgot password
  async forgotPassword(email){
    return null; // await Auth.forgotPassword(email);
  }

  //function for reset forgot password
  async resetPassword(verificationCode, newPassword, email){
    return null; // await Auth.forgotPasswordSubmit(email, verificationCode, newPassword);
  }

  async setPassword(oldPassword: string, newPassword: string) {
    await null; // Auth.changePassword(this.cognitoUser, oldPassword, newPassword);
  }
}