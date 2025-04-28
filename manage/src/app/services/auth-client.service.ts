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
      } else {
        this.nextRefresh = new Date(new Date().getTime() + (1000 * 60 * 5));
        this.session.next(session);
      }
    } catch (err) {
      console.error(err);
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
