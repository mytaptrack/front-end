import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserClass, TeamRole, UserService } from '../../..';

enum SetupSteps {
  termsOfUse = 'termsOfUse',
  invites = 'invites',
  createStudent = 'CreateStudent',
  createBehaviors = 'CreateBehaviors',
  graphs = 'Graphs'
}

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: false
})
export class SetupComponent implements OnInit {
  public loading = true;
  public user: UserClass = null;
  public role: string;
  public roles: string[];
  public mobileError: string;
  public licenseType: 'No License' | 'Single' | 'Multi' = 'No License';

  constructor(private userService: UserService,
              private router: Router) { }

  ngOnInit() {
    this.roles = Object.keys(TeamRole).map(r => TeamRole[r]);
    this.userService.user.subscribe(user => {
      const oldUser: UserClass = this.user;
      this.user = user;
      if (this.user) {
        if(oldUser) {
          this.user.details.firstName = oldUser.details.firstName;
          this.user.details.lastName = oldUser.details.lastName;
          this.user.details.state = oldUser.details.state;
          this.user.details.zip = oldUser.details.zip;
        } else {
          this.user.details.firstName = (this.user.details.firstName)? this.user.details.firstName : '';
          this.user.details.lastName = (this.user.details.lastName)? this.user.details.lastName : '';
          this.user.details.state = (this.user.details.state)? this.user.details.state : '';
          this.user.details.zip = (this.user.details.zip)? this.user.details.zip : '';
        }
        this.setLoading(false);
      }
    });
  }

  async setLoading(loading: boolean) {
    this.loading = loading;
  }
    
  userInfoComplete(): boolean {
    if(this.user.details.firstName && this.user.details.lastName &&
       this.user.details.name && this.user.details.state && 
       this.user.details.zip && this.user.details.zip.length > 4) {
         return true;
    }
    return false;
  }

  declineTerms() {
    this.userService.signOut();
  };

  async saveUserProfileInfo() {
    if(!this.userInfoComplete()) {
      alert('Please complete the your information.');
      return;
    }

    this.user.acceptTerms();
    await this.user.save();

    this.router.navigate(['']);
  }
}
