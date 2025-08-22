import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, filter, take, timeout, catchError, of } from 'rxjs';
import { UserService } from '../services';
import { UserClass } from '../lib';

@Injectable({
  providedIn: 'root'
})
export class UserSetupGuard implements CanActivate {
  
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    console.log('UserSetupGuard: canActivate called');
    
    return this.userService.user.pipe(
      filter(user => {
        console.log('UserSetupGuard: user state', user);
        return user !== null;
      }), // Wait for user to be loaded (not null)
      take(1), // Take only the first non-null value
      timeout(10000), // Add timeout to prevent infinite waiting
      map((user: UserClass) => {
        console.log('UserSetupGuard: checking user setup', user);
        
        const isSetupComplete = !!(
          user.terms &&
          user.details?.firstName && 
          user.details?.lastName &&
          user.details?.name && 
          user.details?.state && 
          user.details?.zip && 
          user.details?.zip.length > 4
        );

        console.log('UserSetupGuard: setup complete?', isSetupComplete);

        if (!isSetupComplete) {
          console.log('UserSetupGuard: redirecting to setup');
          this.router.navigate(['setup']);
          return false;
        }

        console.log('UserSetupGuard: allowing access');
        return true;
      }),
      catchError(error => {
        console.error('UserSetupGuard: error or timeout', error);
        // If there's an error or timeout, allow access to prevent blocking
        return of(true);
      })
    );
  }
}