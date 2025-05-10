import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { 
  UserClass, ViewerConfigService, 
  AuthClientService, UserService,
  StudentSummary, NotificationDetailsTeam, Notification,
  moment
} from '.';
import { environment } from '../environments/environment';

declare let gtag: Function;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.scss' ],
  standalone: false
})
export class AppComponent {
  public user: UserClass = null;
  public _selectedStudent: StudentSummary;
  public studentBarWidth: number = 25;
  private _collapseStudents: string;
  public students: StudentSummary[] = [];
  public teamInvites: Notification<NotificationDetailsTeam>[] = [];
  public oldStudents: StudentSummary[] = [];

  get studentId() { return this.selectedStudent?.studentId; }
  set studentId(val: string) {
    this.user?.loadStudent(val);
  }
  
  public get isStudentCreate() {
    return this.router.url.indexOf('/student/create') >= 0;
  }
  public get selectedStudent() {
    return this._selectedStudent;
  }
  public set selectedStudent(val) {
    if(val == null && this._selectedStudent == null) {
      return;
    }
    if(typeof val == 'string') {
      const studentId = val as string;
      val = this.user.students.find(x => x.studentId == studentId);
    }
    if(val && (!this._selectedStudent || this._selectedStudent.studentId !== val.studentId)) {
      this._selectedStudent = val;
      if(!this.isStudentCreate) {
        this.router.navigate([], {
          queryParams: { studentId: val.studentId },
          queryParamsHandling: 'merge'
        });
      }
    }
  }
  public get collapseStudents(): boolean {
    const retval = this._collapseStudents === 'true';
    return retval;
  }
  public set collapseStudents(val: boolean) {
    this._collapseStudents = val.toString();
    this.cookieService.set('mytaptrack-show-students', val.toString(), undefined, undefined, undefined, true);
  }
  public get isMobile() {
    return this.viewerConfigService.isMobile;
  }

  public formFields = {
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
  }

  constructor(
    private userService: UserService,
    private router: Router,
    private auth: AuthClientService,
    private cookieService: CookieService,
    private viewerConfigService: ViewerConfigService) {
      this._collapseStudents = this.cookieService.get('mytaptrack-show-students');
      if(!this._collapseStudents) {
        this._collapseStudents = 'false';
      }
      router.events.subscribe(e => {
        if(e instanceof NavigationEnd) {
          const event = e as NavigationEnd;
          const index = event.urlAfterRedirects.indexOf('?');
          this.auth.checkAuthentication();
        }
      });
      this.ngOnInit();

      const base = window.document.getElementById('baseHref')
      if(base) {
        base.setAttribute('href', environment.routes.behavior);
      }
    }
  
  ngOnInit() {
    this.userService.user.subscribe(x => {
      if(!x) {
        this.students = [];
        this.oldStudents = [];
        this.user = null;
        return;
      }
      this.user = x;
      const datedStudents = this.user.students.map(x => ({ lastTracked: x.lastTracked? moment(x.lastTracked) : moment(), student: x}));
      const cutoffPoint = moment();
      cutoffPoint.add(-30, 'days');
      this.students = datedStudents.filter(x => x.lastTracked.isAfter(cutoffPoint)).map(x => x.student);
      this.oldStudents = datedStudents.filter(x => x.lastTracked.isBefore(cutoffPoint)).map(x => x.student);
      this.teamInvites = [];
    });
    this.userService.selectedStudent.subscribe(student => {
      if(this.user) {
        if(!student) {
          student = (this.user.students.length > 0)? this.user.students[0] : null;
        }
        this.selectedStudent = student;
      }
    });
  }

  getStudentId(student: StudentSummary) {
    if(student) {
      return student.studentId;
    }
    return '';
  }

  showStudents(): boolean {
    return this.user && !this.router.url.endsWith('setup');
  }

  selectStudent(studentId: string) {
    this.user?.loadStudent(studentId);
  }
}
