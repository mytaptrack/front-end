import { Component, OnInit } from '@angular/core';
import { UserClass, UserDetails, UserService } from '../../..';
 
class ProfileError {
  password?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  zip?: string;
  mobile?: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: false
})
export class ProfileComponent implements OnInit {
  private user: UserDetails;
  private newData: UserDetails;
  private edit: boolean = false;
  private editPassword: boolean = false;
  private oldPassword = '';
  private newPassword = '';
  private confirmPassword = '';
  private error: ProfileError = {};
  private stateHashmap = UserService.States;
  public loading: boolean = true;
  private userSource: UserClass;

  constructor(private userService: UserService) { }

  ngOnInit() {
    this.load();
  }

  async setLoading(loading: boolean) {
    this.loading = loading;
  }

  async load() {
    this.userService.user.subscribe(user => {
      if (user == null) {
        this.newData = {} as any;
        return;
      }
      this.userSource = user;
      this.user = user.details;
      this.user.state = (this.user.state)? this.user.state.trim() : '';
      this.newData = JSON.parse(JSON.stringify(this.user));

      this.setLoading(false);
    });
  }

  required(item): boolean {
    if (!item && this.error.password) {
      return true;
    }
    return false;
  }

  validatePassword(): boolean {
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.error.password = 'Please enter the required field';
      return true;
    }
    if (this.newPassword.trim() != this.confirmPassword.trim()) {
      this.error.password = 'New password does not match the confirm password';
      return true;
    } else if (!this.newPassword.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.{6,})/)) {
      this.error.password = 'Password should be with at least 6 characters, lowercase and uppercase';
      return true;
    }
    return false;
  }

  validateProfile(user: UserDetails): boolean {
    this.error.firstName = '';
    this.error.lastName = '';
    this.error.name = '';
    this.error.zip = '';
    let errorFlag = (this.error.mobile)? true : false;
    if (!user.firstName || !user.firstName.trim()) {
      this.error.firstName = "First name should not be empty";
      errorFlag = true;
    } else if (!user.firstName.match(/^[a-zA-Z0-9\s-']+$/)) {
      this.error.firstName = "First Name should only contain alphanumeric characters";
      errorFlag = true;
    }
    if (!user.lastName || !user.lastName.trim()) {
      this.error.lastName = "Last name should not be empty";
      errorFlag = true;
    } else if (!user.lastName.match(/^[a-zA-Z0-9\s-']+$/)) {
      this.error.lastName = "Last Name should only contain alphanumeric characters";
      errorFlag = true;
    }
    if (!user.name || !user.name.trim()) {
      this.error.name = "Display name should not be empty";
      errorFlag = true;
    } else if (!user.name.match(/^[a-zA-Z0-9\s-']+$/)) {
      this.error.name = "Display Name should only contain alphanumeric characters";
      errorFlag = true;
    }
    if (!user.zip || !user.zip.match(/^\d{5}(?:[-\s]\d{4})?$/)) {
      this.error.zip = "Suggest Zip code formats are 12345, 12345-6789, 12345 6789";
      errorFlag = true;
    }
    return errorFlag;
  }

  editProfile() {
    this.edit = true;
    this.validateProfile(this.user);
  }

  cancelEdit() {
    this.newData = JSON.parse(JSON.stringify(this.user));
    this.edit = false;
  }

  async saveProfile() {
    if (this.validateProfile(this.newData)) {
      return;
    }
    this.setLoading(true);
    try {
      this.userSource.details.email = this.newData.email;
      this.userSource.details.firstName = this.newData.firstName;
      this.userSource.details.lastName = this.newData.lastName;
      this.userSource.details.name = this.newData.name;
      this.userSource.details.zip = this.newData.zip;
      this.userSource.details.state = this.newData.state;
      await this.userSource.save();
      for (const item in this.newData) {
        this.user[item] = this.newData[item];
      }
      this.edit = false;
    } catch (err) {
      console.log(err);
      alert(err.message.replace(/instance\./g, ''));
    }
    this.setLoading(false);
  }

  async changePassword() {
    this.error.password = null;
    if (this.validatePassword()) {
      return;
    }

    this.setLoading(true);
    try {
      await this.userService.updatePassword(this.oldPassword, this.newPassword);

      alert('Password Successfully changed!');
      this.editPassword = false;
      this.newPassword = this.oldPassword = this.confirmPassword = null;
    } catch (err) {
      console.log(err);
      alert(err.message);
    }
    this.setLoading(false);
  }

}
