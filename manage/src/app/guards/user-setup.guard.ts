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
    return this.userService.user.pipe(
      filter(user => user !== null), // Wait for user to be loaded (not null)
      take(1), // Take only the first non-null value
      timeout(10000), // Add timeout to prevent infinite waiting
      map((user: UserClass) => {
        const isSetupComplete = !!(
          user.terms &&
          user.details?.firstName && 
          user.details?.lastName &&
          user.details?.name && 
          user.details?.state && 
          user.details?.zip && 
          user.details?.zip.length > 4
        );

        if (!isSetupComplete) {
          this.router.navigate(['setup']);
          return false;
        }

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