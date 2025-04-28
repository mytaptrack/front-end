import { Injectable, EventEmitter } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { 
  UserContext, BehaviorSubscription, StudentSummary, StudentDashboardSettings, UserClass
} from '../types';
import { ApiClientService, AuthClientService } from '.';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  public static States = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    DC: 'District Of Columbia',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming'
  };
  private static user: BehaviorSubject<UserClass> = new BehaviorSubject(null);
  public user: BehaviorSubject<UserClass> = UserService.user;
  public admin: boolean = false;
  private static selectedStudent: BehaviorSubject<StudentSummary> = new BehaviorSubject(null);
  public selectedStudent: BehaviorSubject<StudentSummary> = UserService.selectedStudent;
  private userContext: UserContext = null;
  private subscriptions: { [key: string] : BehaviorSubscription[] } = {};
  private cognitoUserName: string;
  private static refreshInterval;

  constructor(private auth: AuthClientService, 
    private api : ApiClientService, 
    private router: Router,
    private route: ActivatedRoute) {
    this.auth.session.subscribe(session => {
      this.setSession(session);
    });

    this.router.events.subscribe(e => {
      if(e instanceof NavigationEnd) {
        // this.selectStudent();
      }
    });
  }

  private async setSession(session) {
    if(session) {
      const groups = this.auth.group ?? [];
      const licenses = groups.filter(x => x.startsWith('licenses/') && !x.startsWith('licenses/users')).map(x => x.slice(9));
      const admin = groups.find(x => x == 'admins')? true : false;
      if((this.auth.cognitoUser as any)?.username == this.cognitoUserName) {
        return;
      }
      this.cognitoUserName = (this.auth.cognitoUser as any)?.username;
      const user = new UserClass(await this.api.dashboardSummaryGet(), licenses, admin, this.api);
      const params = this.route.snapshot.queryParams;
      user.ensureInit(params.studentId);
      this.user.next(user);
    } else {
      this.cognitoUserName = '';
      this.user.next(null);
      clearInterval(UserService.refreshInterval);
      delete UserService.refreshInterval;
    }
  }

  signOut() {
    this.auth.signOut();
  }

  async updatePassword(oldPassword: string, newPassword: string) {
    await this.auth.setPassword(oldPassword, newPassword);
  }

  validatePhoneNumber(mobile: string): string {
    if (mobile && !mobile.match(/^\+?1?\(?\d{3}\)?-?\d{3}-?\d{4}/)) {
      return 'The number provided does not appear to be a phone number';
    }

    return '';
  }

  async saveDashboardSettings(studentId: string, settings: StudentDashboardSettings) {
    await this.api.putSettings(studentId, settings);
  }
}
