import { Component, Input, OnInit } from '@angular/core';
import { 
  SubscriptionsClass,SubscriptionGroupClass,
  AccessLevel, AppClass, IoTDeviceCollection, LicenseFeatures, 
  StudentBehaviorClass, StudentClass, StudentResponseClass, TeamMember, 
  UserSummaryRestrictions
} from '../../../..';

@Component({
  selector: 'app-subscriptions',
  templateUrl: './subscriptions.component.html',
  styleUrls: ['./subscriptions.component.scss'],
  standalone: false
})
export class SubscriptionsComponent implements OnInit {
  private _subscriptions: SubscriptionsClass;

  public student: StudentClass;
  public restrictions: UserSummaryRestrictions;
  public features: LicenseFeatures;
  public devices: IoTDeviceCollection;
  public administrator: boolean;
  public teamMembers: TeamMember[];
  get subscriptions() { return this._subscriptions?.items || []; };
  selected: SubscriptionGroupClass;
  loading: boolean;
  saving: boolean;
  get readonly() { 
    return !this.student || this.student?.restrictions.notifications == AccessLevel.read; 
  }

  placeholdersList = [
    { placeholder: '{Behavior}', description: 'The behavior\'s name that was tracked' },
    { placeholder: '{FirstName}', description: 'The student\'s first name' },
    { placeholder: '{LastName}', description: 'The student\'s last name' },
    { placeholder: '{Nickname}', description: 'The nickname for the student' },
    { placeholder: '{WhoTracked}', description: 'The name of what tracked the behavior: the device, app or individual on the website.' }
  ];

  @Input('student')
  set setStudent(val: StudentClass) {
    if(this.student?.studentId == val?.studentId) {
      return;
    }
    this.student = val;
    this.features = val?.licenseDetails?.features;
    this.load();
  }
  @Input('restrictions')
  set setRestrictions(val: UserSummaryRestrictions) {
    this.restrictions = val;
  }

  constructor() { }

  ngOnInit(): void {
  }

  async setLoading(val: boolean) {
    this.loading = val;
  }
  async setSaving(val: boolean) {
    this.saving = val;
  }

  async load() {
    this.setLoading(true);
    this._subscriptions = await this.student.getSubscriptions();
    this.restrictions = this.student.restrictions;
    this.administrator = this.restrictions.behavior == AccessLevel.admin;
    if(this._subscriptions.items.length == 0) {
      this.createNotification();
    } else {
      this.setSelected(this._subscriptions.items[0]);
    }
    if(this.restrictions.devices != AccessLevel.none) {
      this.devices = await this.student.getDevices();
    }
    if(this.restrictions.team != AccessLevel.none) {
      this.teamMembers = await this.student.team.getTeam();
    }
    this.setLoading(false);
  }

  async save() {
    this.setSaving(true);
    try {
      await this._subscriptions.save();
    } finally {
      this.setSaving(false);
    }
  }

  async delete() {
    this.setSaving(true);
    try {
      await this.selected.delete();
      if(this._subscriptions.items.length == 0) {
        this.createNotification();
      } else {
        this.setSelected(this._subscriptions.items[0]);
      }
    } finally {
      this.setSaving(false);
    }
  }

  createNotification() {
    this.selected = this._subscriptions.create();
  }

  setSelected(val: SubscriptionGroupClass) {
    this.selected = val;
  }

  isSetResponse(val: StudentResponseClass): boolean {
    return this.selected.responseIds.findIndex(x => x == val.id) >= 0;
  }
  isSet(val: StudentResponseClass | StudentBehaviorClass | AppClass | TeamMember, isBehavior: boolean = false): boolean {
    if(val instanceof StudentResponseClass && !isBehavior) {
      return this.selected.responseIds.find(x => x == val.id)? true : false;
    } else if(val instanceof StudentBehaviorClass || val instanceof StudentResponseClass) {
      return this.selected.behaviorIds.find(x => x == val.id)? true : false;
    } else if(val instanceof AppClass) {
      return this.selected.deviceIds.find(x => x == val.dsn)? true : false;
    } else if(val instanceof TeamMember) {
      return this.selected.userIds.find(x => x == val.userId)? true : false;
    }
    return false;
  }

  toggleResponse(val: StudentResponseClass) {
    const index = this.selected.responseIds.findIndex(x => x == val.id);
    if(index >= 0) {
      this.selected.responseIds.splice(index, 1);
    } else {
      this.selected.responseIds.push(val.id);
    }
  }

  toggle(val: StudentResponseClass | StudentBehaviorClass | AppClass | TeamMember, isBehavior: boolean = false) {
    if(val instanceof StudentResponseClass && !isBehavior) {
      const index = this.selected.behaviorIds.findIndex(x => x == val.id);
      if(index >= 0) {
        this.selected.behaviorIds.splice(index, 1);
      } else {
        this.selected.behaviorIds.push(val.id);
      }
    } else if(val instanceof StudentBehaviorClass || val instanceof StudentResponseClass) {
      const index = this.selected.behaviorIds.findIndex(x => x == val.id);
      if(index >= 0) {
        this.selected.behaviorIds.splice(index, 1);
      } else {
        this.selected.behaviorIds.push(val.id);
      }
    } else if(val instanceof AppClass) {
      const index = this.selected.deviceIds.findIndex(x => x == val.dsn);
      if(index >= 0) {
        this.selected.deviceIds.splice(index, 1);
      } else {
        this.selected.deviceIds.push(val.dsn);
      }
    } else if(val instanceof TeamMember) {
      const index = this.selected.userIds.findIndex(x => x == val.userId);
      if(index >= 0) {
        this.selected.userIds.splice(index, 1);
      } else {
        this.selected.userIds.push(val.userId);
      }
    }
  }

  toggleNotifyUntil(val: boolean) {
    this.selected.notifyUntilResponse = val;
  }
}
