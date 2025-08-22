import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services';
import { UserClass } from '../../lib';

@Component({
  selector: 'app-user-setup',
  templateUrl: './user-setup.component.html',
  styleUrls: ['./user-setup.component.scss'],
  standalone: false
})
export class UserSetupComponent implements OnInit {
  public loading = true;
  public user: UserClass = null;
  public saving = false;

  constructor(
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userService.user.subscribe(user => {
      this.user = user;
      if (this.user) {
        // Initialize empty fields if they don't exist
        this.user.details.firstName = this.user.details.firstName || '';
        this.user.details.lastName = this.user.details.lastName || '';
        this.user.details.name = this.user.details.name || '';
        this.user.details.state = this.user.details.state || '';
        this.user.details.zip = this.user.details.zip || '';
        this.loading = false;
      }
    });
  }

  userInfoComplete(): boolean {
    if (!this.user) return false;
    
    return !!(
      this.user.details.firstName && 
      this.user.details.lastName &&
      this.user.details.name && 
      this.user.details.state && 
      this.user.details.zip && 
      this.user.details.zip.length > 4
    );
  }

  async saveUserInfo() {
    if (!this.userInfoComplete()) {
      alert('Please complete all required fields.');
      return;
    }

    this.saving = true;
    try {
      this.user.acceptTerms();
      await this.user.save();
      this.router.navigate(['']);
    } catch (error) {
      console.error('Error saving user info:', error);
      alert('Error saving user information. Please try again.');
    } finally {
      this.saving = false;
    }
  }

  signOut() {
    this.userService.signOut();
  }
}