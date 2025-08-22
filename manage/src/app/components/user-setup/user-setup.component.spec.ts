import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserSetupComponent } from './user-setup.component';
import { UserService } from '../../services';
import { BehaviorSubject } from 'rxjs';
import { UserClass } from '../../lib';

describe('UserSetupComponent', () => {
  let component: UserSetupComponent;
  let fixture: ComponentFixture<UserSetupComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let userSubject: BehaviorSubject<UserClass>;

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['signOut']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    userSubject = new BehaviorSubject<UserClass>(null);
    userServiceSpy.user = userSubject;

    await TestBed.configureTestingModule({
      declarations: [UserSetupComponent],
      providers: [
        { provide: UserService, useValue: userServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserSetupComponent);
    component = fixture.componentInstance;
    mockUserService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize user details when user is loaded', () => {
    const mockUser = {
      details: {
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        state: 'CA',
        zip: '12345'
      }
    } as UserClass;

    userSubject.next(mockUser);

    expect(component.user).toBe(mockUser);
    expect(component.loading).toBeFalse();
  });

  it('should return true when user info is complete', () => {
    component.user = {
      details: {
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        state: 'CA',
        zip: '12345'
      }
    } as UserClass;

    expect(component.userInfoComplete()).toBeTrue();
  });

  it('should return false when user info is incomplete', () => {
    component.user = {
      details: {
        firstName: '',
        lastName: 'Doe',
        name: 'John Doe',
        state: 'CA',
        zip: '12345'
      }
    } as UserClass;

    expect(component.userInfoComplete()).toBeFalse();
  });
});