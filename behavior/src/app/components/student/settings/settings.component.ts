import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StringUtilsService } from '../../../string-utils.service';
import { 
  UserClass, StudentClass, UserService,
  BehaviorSubscription, StudentBehavior, UserSummary, 
  StudentBehaviorEdit, UserPreferences, AccessLevel, 
  LicenseFeatures, UserSummaryRestrictions, StudentBehaviorClass,
  ApiClientService, moment
} from '../../..';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: false
})
export class SettingsComponent implements OnInit {
  public id: string;
  public tabName: string;
  private subscriptions: Array<BehaviorSubscription> = [];
  private student: StudentClass;
  private user: UserClass;
  private userPreference: UserPreferences;
  public loading: boolean = true;
  public firstLoad: boolean = true;
  public archivedBehaviors: StudentBehavior[] = [];
  public activeBehaviors: StudentBehaviorClass[] = [];
  public selectedTab: string = 'Behaviors';
  public deviceAccess: boolean;
  public teamAccess: boolean;
  public behaviorAccess: boolean;
  public responseAccess: boolean;
  public milestoneAccess: boolean;
  public scheduleAccess: boolean;
  documentsAccess: boolean;
  public abcAccess: boolean;
  public notificationAccess: boolean;
  public canDeleteStudent: boolean;
  public features: LicenseFeatures;
  public restrictions: UserSummaryRestrictions;

  public get licenseType() {
    if(!this.student?.licenseDetails || (
      this.student.licenseDetails &&
      !this.student.licenseDetails.fullYear &&
      !this.student.licenseDetails.flexible)) {
      return 'Not Licensed'
    }
    return this.student.licenseDetails.fullYear? 'Dedicated License' : 'Flexible License';
  }

  get hasLicense() {
    return this.licenseType != 'Not Licensed';
  }

  constructor(private apiClient: ApiClientService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private stringUtils: StringUtilsService) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const tabName = params.get('tabName');
      if(!tabName) {
        this.router.navigate(['student/settings/behaviors'], {
          queryParamsHandling: 'merge'
        });
        return;
      }

      this.selectedTab = tabName;
    });
    this.userService.user.subscribe(user => {
      this.user = user;
      if(user) {
        user.selectedStudent.subscribe(s => {
          if(s && s.studentId) {
            this.setLoading(true);
            this.id = s.studentId;
            this.student = s;
            this.load();
          }
        });  
      }
    });
  }

  async load() {
    // this.subscriptions = subscriptions;
    const permissions = this.student.restrictions;
    this.restrictions = permissions;
    this.features = this.student.licenseDetails?.features || {} as any;
    this.deviceAccess = permissions.devices !== AccessLevel.none && this.features.devices;
    this.behaviorAccess = permissions.behavior !== AccessLevel.none;
    this.responseAccess = this.behaviorAccess && this.features.response;
    this.teamAccess = permissions.team !== AccessLevel.none;
    this.milestoneAccess = permissions.milestones !== AccessLevel.none && this.features.supportChanges;
    this.scheduleAccess = permissions.schedules !== AccessLevel.none && this.features.schedule;
    this.canDeleteStudent = permissions.team === AccessLevel.admin;
    this.abcAccess = this.features.abc && permissions.abc !== AccessLevel.none;
    this.notificationAccess = this.features.notifications && permissions.notifications !== AccessLevel.none;
    this.documentsAccess = this.features.documents && permissions.documents !== AccessLevel.none;

    this.loadArchiveModel();

    if(this.selectedTab === 'abc' && !this.abcAccess) {
      await this.router.navigate(['/student/settings/behaviors'], {
        queryParamsHandling: 'preserve'
      });
    }

    if(this.user.selectedStudent.getValue() != this.student) {
      await this.user.loadStudent(this.student.studentId);
    }
    this.user.loadLicense();
    this.setLoading(false);
  }

  allowLicenseUpgrade() {
    if(!this.user?.license || 
      (this.student.license && this.student.license != this.user?.license)) {
      return false;
    }
    
    return this.student.license &&
      !this.student.licenseDetails.fullYear &&
      this.hasSingleUserLicenses();
  }
  isLicenseExpired() {
    const licenseDetails = this.student.license? this.student.licenseDetails : this.user.licenseDetails;
    if(!licenseDetails) {
      return false;
    }
    const expiration = moment(licenseDetails.expiration);
    const now = moment();
    return expiration.isBefore(now);
  }
  hasSingleUserLicenses() {
    if(!this.user?.license) {
      return false;
    }
    if(this.isLicenseExpired()) {
      return false;
    }
    if(!this.user.licenseDetails) {
      return false;
    }

    return this.user.licenseDetails.singleCount - this.user.licenseDetails.singleUsed > 0;
  }

  hasMultiUserLicense() {
    if(!this.user?.license) {
      return false;
    }
    if(this.isLicenseExpired()) {
      return false;
    }

    return this.user.licenseDetails?.multiCount > 0;
  }

  async applyLicense(fullYear: boolean) {
    if(!this.user?.license) {
      return;
    }
    this.setLoading(true);
    try {
      await this.student.applyLicense(fullYear? 'Single' : 'Multi');
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
    this.setLoading(false);
  }

  async setLoading(loading: boolean) {
    this.loading = loading;
    this.firstLoad = false;
  }


  async toggleSubscription(behavior, onEach) {
    let subscription = this.subscriptions.find(subscription => (subscription.behaviorId == behavior.id && subscription.onEach == onEach));
    this.setLoading(true);
    try {
      if (subscription) {
        subscription.studentId = this.student.studentId;
        await this.apiClient.deleteUserSubscription(subscription);
        for (let i = 0; i < this.subscriptions.length; i++) {
          const item = this.subscriptions[i];
          if (item.behaviorId == behavior.id) {
            this.subscriptions.splice(i, 1);
            break;
          }
        }
      }
      else {
        await this.apiClient.createUserSubscription({
          studentId: this.id,
          behaviorId: behavior.id,
          onEach: onEach
        });

        this.subscriptions.push({
          studentId: this.student.studentId,
          behaviorId: behavior.id,
          onEach
        });
      }
    } catch (err) {
      console.log(err);
      alert(err.message);
    }
    this.setLoading(false);
  }

  behaviorHasSubscription(behavior: StudentBehavior, onEach: boolean) {
    return this.subscriptions.find(subscription => (subscription.behaviorId == behavior.id && subscription.onEach == onEach));
  }

  loadArchiveModel() {
    this.archivedBehaviors = this.student.trackables.archivedBehaviors;
    this.activeBehaviors = this.student.trackables.activeBehaviors;
  }

  async removeUser(user: UserSummary) {
    this.setLoading(true);

    try {
      await this.student.team.removeTeamMember(user.userId);
      if(user.userId === this.user.userId) {
        this.router.navigate(['dashboard'], {
          queryParams: {
            studentId: this.student.studentId
          }
        });
      }
    } catch (err) {
      console.log(err);
      alert(err.message);
      this.setLoading(false);
      return;
    }
    
    this.setLoading(false);
  }

  editStudent() {
    this.user.loadStudent(this.student.studentId);
    this.router.navigate(['student/create'], {
      queryParams: {
        studentId: this.student.studentId
      }
    });
  }

  cancelEdit(item: StudentBehaviorEdit) {
    let revertData = JSON.parse(JSON.stringify(item.oldData));
    for (let name in revertData) {
      item[name] = revertData[name];
    }
    item.editMode = false;
    item.oldData = undefined;
  };

  async archiveBehaviorItem(behavior: StudentBehaviorClass) {
    this.setLoading(true);
    try {
      behavior.isArchived = !behavior.isArchived;
      await behavior.save();

      this.loadArchiveModel();
    } catch (err) {
      console.log(err);
      alert(err.message);
    }
    this.setLoading(false);
  }

  async updateBehaviorItem(behavior: StudentBehaviorClass) {
    this.setLoading(true);
    try {
      behavior.save();
    } catch(err) {
      console.log(err);
      alert(err.message);
    }
    this.setLoading(false);
  }

  behaviorHasEventSubscription(behavior: StudentBehaviorEdit) {
    if (this.userPreference && this.userPreference.notifications) {
      let found = false;
      this.userPreference.notifications.onEvent.forEach(item => {
        if (item === behavior.id) {
          found = true;
        }
      });

      return found;
    }
    return false;
  };

  behaviorHasChangeSubscription(behavior: StudentBehavior) {
    if (this.userPreference && this.userPreference.notifications) {
      let found = false;
      this.userPreference.notifications.onChange.forEach(item => {
        if (item === behavior.id) {
          found = true;
        }
      });
      return found;
    }
    return false;
  }

  getBehaviorFullName(id: string): string {
    return this.student.trackables.getBehaviorName(id);
  }

  getBehaviorDisplayName(id: string): string {
    return this.stringUtils.ensureSize(this.getBehaviorFullName(id), 18);
  }
  
  getBehavior(id: string): StudentBehavior {
    const retval = this.student.trackables.behaviors.find(item => item.id === id);
    return retval;
  }

  behaviorIsDuration(id: string): boolean {
    const behavior = this.getBehavior(id);
    return behavior !== undefined && behavior.isDuration;
  }

  getStudentName() {
    if(!this.student) {
      return '';
    }
    return `${this.student.details.firstName} ${this.student.details.lastName}`;
  }

  async deleteStudent() {
    if(!this.student) {
      return;
    }
    await this.student.team.removeTeamMember(this.user.userId);
  }
}
