import { Component } from '@angular/core';
import { ApiClientService, UserService } from '../../services';
import { Moment, UserClass } from '../../lib';
import moment from 'moment';
import { LicenseDetails } from '@mytaptrack/types';

@Component({
  selector: 'app-license',
  templateUrl: './license.component.html',
  styleUrl: './license.component.scss',
  standalone: false
})
export class LicenseComponent {
  private _user: UserClass;

  saving: boolean = false;

  expiration: Moment;
  license: LicenseDetails;

  constructor(private userService: UserService, private api: ApiClientService) {
  }

  ngOnInit(): void {
    this.userService.user.subscribe(user => {
      this._user = user;

      if(!user.licenseDetails) {
        return;
      }

      this.license = JSON.parse(JSON.stringify(user.licenseDetails));
      this.expiration = moment(user.licenseDetails.expiration);
    });
  }

  async setSaving(value: boolean) {
    this.saving = value;
  }

  async save() {
    this.setSaving(true);
    try {
      await this.api.putLicense(this.license);
      this._user.licenseDetails = JSON.parse(JSON.stringify(this.license));
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      this.setSaving(false);
    }
  }
}
