import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent {
  title = 'web-admin';
  formFields = {
    signUp: {
      email: {
        order:1
      },
      name: {
        placeholder: 'Name',
        order: 2
      },
      password: {
        order: 5
      },
      confirm_password: {
        order: 6
      }
    },
  };

  constructor(private router: Router) {
    const base = window.document.getElementById('baseHref')
      if(base) {
        base.setAttribute('href', environment.routes.behavior);
      }
  }

  showNavigation(): boolean {
    return !this.router.url.endsWith('setup');
  }
}
