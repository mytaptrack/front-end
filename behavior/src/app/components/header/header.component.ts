import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  UserClass, ViewerConfigService, UserSummaryRestrictions, AccessLevel, LicenseFeatures, StudentClass,
  UserService
} from '../..';

@Component({
  selector: 'app-behavior-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit {
  public user: UserClass = null;
  public areaDropDown: boolean = false;
  public userMenuExpanded: boolean = false;
  public reviewMode: boolean = false;
  public studentId: string = '';
  public restrictions: UserSummaryRestrictions;
  public deviceAdmin: boolean;
  public scheduleAdmin: boolean;
  public dataAdmin: boolean;
  public reportAccess: boolean;
  public mytaptrackAdmin: boolean;
  public manageArea: boolean;
  public features: LicenseFeatures;

  get canAccessDashboard(): boolean {
    return this.restrictions?.data != AccessLevel.none;
  }
  
  public get isMobile(): boolean {
    return this.viewerConfigService.isMobile;
  }

  constructor(private userService: UserService,
              public router: Router,
              private route: ActivatedRoute,
              private viewerConfigService: ViewerConfigService) { }

  ngOnInit() {
    this.userService.user.subscribe(user => {
      if(!user) {
        this.user = null;
        return;
      }
      this.user = user;
      if(!this.features) {
        this.features = this.user.licenseDetails?.features ?? {} as any;
      }
      this.mytaptrackAdmin = this.user?.admin;
      this.manageArea = this.user.licenses.length > 0 && this.user.licenseDetails?.features?.manage;

      user.selectedStudent.subscribe(student => {
        this.studentId = student? student.studentId : '';
        this.setupStudent(student);
      })
    });

  }

  async setupStudent(summary: StudentClass) {
    if(!summary) {
      this.features = (this.user && this.user.license && this.user.licenseDetails?.features)? this.user.licenseDetails?.features : ({} as any);
      return;
    }
    const student = await this.user.loadStudent(summary.studentId);
    this.restrictions = student.restrictions;
    this.deviceAdmin = this.restrictions?.devices === AccessLevel.admin;
    this.scheduleAdmin = this.restrictions?.schedules === AccessLevel.admin;
    this.dataAdmin = this.restrictions?.data === AccessLevel.admin;
    this.reportAccess = this.restrictions?.reports !== AccessLevel.none;
    this.reviewMode = this.restrictions?.reports == AccessLevel.read;
    if(student.licenseDetails) {
      this.features = student.licenseDetails.features;
      if(!this.features) {
        this.features = this.user.licenseDetails.features;
      }
    } else {
      this.features = {
        dashboard: true,
      } as any;
    }
    const url = this.router.url;
    if(url.match(/(\/dashboard.*|\/\?.*)/) && this.restrictions?.data == AccessLevel.none && this.restrictions.reports != AccessLevel.none) {
      this.router.navigate(['student/snapshot']);
    }
  }

  userLoggedIn(user): boolean {
    const retval = user !== null;
    return retval;
  }

  logout() {
    this.userService.signOut();
  }

  navigateToProfile() {
    this.router.navigate(['profile']);
    this.userMenuExpanded = false;
  }

  get impersonating(): boolean {
    return localStorage.getItem('impersonateUserId')? true : false;
  }
  exitImpersonate() {
    localStorage.removeItem('impersonateUserId');
    window.location.reload();
  }
}
