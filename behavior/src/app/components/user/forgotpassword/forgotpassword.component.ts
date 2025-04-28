import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AuthClientService } from '../../..';

@Component({
  selector: 'app-forgotpassword',
  templateUrl: './forgotpassword.component.html',
  styleUrls: ['./forgotpassword.component.scss'],
  standalone: false
})
export class ForgotpasswordComponent implements OnInit {

  public forgotPasswordForm: UntypedFormGroup;
  public resetPasswordForm: UntypedFormGroup;
  public isForgotPassword: boolean = true;
  public isResetPassword: boolean = false;
  public destination: any;
  public resetPasswordUsername:any;
  public error: string;
  public resetPasswordError: string;
  public loading: boolean = true;

  constructor(
    private router: Router, 
    private fb: UntypedFormBuilder,
    private authService: AuthClientService
  ) { }

  ngOnInit() {
    this.createForgotPasswordForm();
    this.createResetPasswordForm();
    this.setLoading(false);
  }

  //set loader function
  async setLoading(value: boolean) {
    this.loading = value;
  }

  //function to create forgot password form
  private createForgotPasswordForm(): void{
    this.forgotPasswordForm = this.fb.group({
      email: [null,[Validators.required, Validators.email]]
    });
  }

  //function to submit forgot password form
  public async OnSubmit(): Promise<void> {
    const email = this.forgotPasswordForm.value.email;
    this.setLoading(true);
    try{
      const result = await this.authService.forgotPassword(email);
      console.log("password changed Successfully"+JSON.stringify(result));
      this.destination = result.CodeDeliveryDetails.Destination;
      this.isResetPassword = true;
      this.isForgotPassword = false;
    }catch(err){
      console.log("error", err);
      this.error = err.message;
    } 
    this.setLoading(false);
  }

  //function to create reset password form
  private createResetPasswordForm(): void{
    this.resetPasswordForm = this.fb.group({
      verificationCode: [null, Validators.required],
      password: [null, Validators.required],
      confirmPassword: [null, Validators.required]
    }, {validator: this.checkIfMatchingPasswords('password', 'confirmPassword')});
  }

  //function to check password and confirm password match
  public checkIfMatchingPasswords(passwordKey: string, passwordConfirmationKey: string) {
    return (group: UntypedFormGroup) => {
      const passwordInput = group.controls[passwordKey],
        passwordConfirmationInput = group.controls[passwordConfirmationKey];
      if (passwordInput.value !== passwordConfirmationInput.value) {
        return passwordConfirmationInput.setErrors({notEquivalent: true});
      } else {
        return passwordConfirmationInput.setErrors(null);
      }
    };
  }

  //function to reset forget password
  public async resetPassword(username): Promise<void>{
    const verificationCode = this.resetPasswordForm.value.verificationCode;
    const password = this.resetPasswordForm.value.password;
    const email = username;
    this.setLoading(true);
    try {
      const result = await this.authService.resetPassword(verificationCode, password, email);
      if(result){
        this.router.navigate(['signin']);
      }
    }catch(err) {
      console.log("error", err);
      this.resetPasswordError = err.message;
    }
    this.setLoading(false); 
  }
}
