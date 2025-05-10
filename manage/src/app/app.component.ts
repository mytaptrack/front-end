import { Component } from '@angular/core';
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

  constructor() {
    const base = window.document.getElementById('baseHref')
      if(base) {
        base.setAttribute('href', environment.routes.behavior);
      }
  }
}
