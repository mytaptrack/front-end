import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { 
  UserClass, StudentClass, UserService,
  TeamRole, StudentBehavior, UserSummaryRestrictions, 
  AccessLevel, LicenseFeatures, TeamMember
} from '../../../..';

enum AccessScope {
  full = 'full',
  limited = 'limited'
}

interface PermissionRow {
  name: string;
  key: string;
  info?: string;
}

@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
  standalone: false
})
export class TeamComponent implements OnInit {
  public user: UserClass;
  public student: StudentClass;
  public team: TeamMember[];
  public selected: TeamMember;
  public roles: string[];
  public accessType: AccessScope = AccessScope.full;
  public limitedAccess: boolean = true;
  public activeBehaviors: StudentBehavior[];
  public archivedBehaviors: StudentBehavior[];
  public name: string;
  public restrictions: UserSummaryRestrictions;
  public features: LicenseFeatures;
  public loading: boolean = false;
  public isNew: boolean = false;
  public administrator: boolean;
  public emailError: boolean = false;
  public roleError: boolean = false;

  permissionsList: PermissionRow[] = [
    { name: 'Behaviors', key: 'behavior' },
    { name: 'Data', key: 'data' },
    { name: 'ABC', key: 'abc', info: 'Ability to view and configure ABC options' },
    { name: 'Devices', key: 'devices' },
    { name: 'Documents', key: 'documents' },
    { name: 'Notes', key: 'comments' },
    { name: 'Notifications', key: 'notifications' },
    { name: 'Schedules', key: 'schedules' },
    { name: 'Support Changes', key: 'milestones' },
    { name: 'Team', key: 'team' },
    { name: 'Snapshot', key: 'reports' },
  ];

  get editAll() {
    return this.permissionsList.find(p => this.getPermissionValue(p.key) != AccessLevel.admin) == undefined;
  }
  set editAll(val: boolean) {
    if(!val) {
      return;
    }
    this.permissionsList.forEach(p => {
      this.setPermissionValue(p.key, AccessLevel.admin);
    });
  }

  get readAll() {
    return this.permissionsList.find(p => this.getPermissionValue(p.key) != AccessLevel.read) == undefined;
  }
  set readAll(val: boolean) {
    if(!val) {
      return;
    }
    this.permissionsList.forEach(p => {
      this.setPermissionValue(p.key, AccessLevel.read);
    });
  }

  get noneAll() {
    return this.permissionsList.find(p => this.getPermissionValue(p.key) != AccessLevel.none) == undefined;
  }
  set noneAll(val: boolean) {
    if(!val) {
      return;
    }
    this.permissionsList.forEach(p => {
      this.setPermissionValue(p.key, AccessLevel.none);
    });
  }

  @Input('student')
  public set setStudent(val: StudentClass) {
    if(!val) {
      return;
    }

    this.student = val;
    this.restrictions = this.student.restrictions;
    this.administrator = this.restrictions.team === AccessLevel.admin;
    this.team = undefined;

    this.loadStudent();
  }

  constructor(private userService: UserService, 
    private router: Router,
    private cookieService: CookieService) {
    this.roles = Object.keys(TeamRole).map(r => TeamRole[r]);
  }

  ngOnInit() {
    this.userService.user.subscribe(user => {
      if(user) {
        this.user = user;
      }
    });
  }

  getPermissionValue(key: string): string {
    return this.selected.restrictions[key];
  }
  setPermissionValue(key: string, value: string): void {
    this.selected.restrictions[key] = value;
  }

  get overrideReport() { return this.selected?.restrictions.reportsOverride ?? false; }
  set overrideReport(val: boolean) {
    if(!this.selected) {
      return;
    }
    if(val) {
      this.selected.restrictions.reportsOverride = val;
    } else {
      delete this.selected.restrictions.reportsOverride;
    }
  }
  
  async setLoading(val: boolean) {
    this.loading = val;
  }

  async loadStudent() {
    if(this.team || this.loading) {
      return;
    }
    this.setLoading(true);
    this.team = await this.student.team.getTeam();
    if(this.team.length > 0) {
      this.setSelected(this.team[0]);      
    }
    
    this.features = this.student.licenseDetails.features
    this.activeBehaviors = this.student.trackables.activeBehaviors;
    this.archivedBehaviors = this.student.trackables.archivedBehaviors;

    this.setLoading(false);
  }

  setSelected(val: TeamMember) {
    this.emailError = false;
    this.roleError = false;
    this.selected = val? val : this.student.team.createTeamMember();

    this.name = this.selected.details.name? this.selected.details.name : this.selected.details.email;
    this.accessType = this.selected.restrictions.behaviors? AccessScope.limited : AccessScope.full;
    if(this.selected.status !== 'Verified' && this.selected.status) {
      this.name += ' ' + this.selected.status;
    }
    this.isNew = !this.selected.userId;
  }

  setAccessFull(val: boolean) {
    if(val) {
      this.accessType = AccessScope.full;
      delete this.selected.restrictions.behaviors;
    } else {
      this.accessType = AccessScope.limited;
      this.selected.restrictions.behaviors = this.student.trackables.behaviors.map(x => x.id);
    }
  }

  hasFullAccess() {
    return this.selected.restrictions.behaviors? false : true;
  }

  togglePermission(behavior: StudentBehavior) {
    const index = this.selected.restrictions.behaviors.findIndex(x => x === behavior.id);
    if(index < 0) {
      this.selected.restrictions.behaviors.push(behavior.id);
    } else {
      this.selected.restrictions.behaviors.splice(index, 1);
    }
  }

  hasPermission(behavior: StudentBehavior): boolean {
    if(!this.selected.restrictions.behaviors) {
      return true;
    }

    return this.selected.restrictions.behaviors.findIndex(x => x === behavior.id) >= 0;
  }

  selectAllBehaviors() {
    this.selected.restrictions.behaviors = this.student.trackables.behaviors.map(x => x.id);
  }

  clearAllBehaviors() {
    this.selected.restrictions.behaviors = [];
  }

  create() {
    this.setSelected(null);
  }

  async save() {
    const selected = this.selected;
    if(this.selected.restrictions.team !== AccessLevel.admin) {
      if(!this.team.find(x => x.userId !== this.selected.userId && x.restrictions.team === AccessLevel.admin)) {
        alert('Cannot save.  There needs to be at least one team admin.');
        return;
      }
    }
    this.emailError = false;
    this.roleError = false;
    if(!this.selected.details.email || !this.selected.details.email.match(/.*@.*\..*/)) {
      this.emailError = true;
    }
    if(this.emailError) {
      return;
    }
    this.setLoading(true);
    try {
      await this.selected.save();
    } catch (err) {
      alert(err.message);
      console.error(err);
    }
    this.setLoading(false);
  }

  async cancel() {
    this.selected.cancel();
  }

  isFullAccess() {
    return this.accessType == AccessScope.full;
  }

  async remove() {
    if(this.cookieService.get('no-dialogs') != 'true' && !confirm(`Do you really want to remove the user ${this.name}`)) {
      return;
    }
    this.setLoading(true);
    try {
      await this.selected.remove();
      if(this.selected.userId === this.user.userId) {
        this.router.navigate(['/']);
      }
    } catch (err) {
      alert(err.message);
      console.error(err);
    }
    this.setLoading(false);
  }

  setTransferLicense(val: boolean) {
    this.selected.restrictions.transferLicense = val;
  }
}
