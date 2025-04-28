import { Component, OnInit, Input } from '@angular/core';
import { 
  StudentBehaviorClass, StudentClass
} from '../../../../lib';
import {
  BehaviorSubscription, UserSummaryRestrictions, 
  AccessLevel, StudentResponse, LicenseFeatures,
   SnapshotConfig
} from '@mytaptrack/types';
import { environment } from '../../../../../environments/environment';
import { UserService } from '../../../../services';

@Component({
  selector: 'app-behaviors',
  templateUrl: './behaviors.component.html',
  styleUrls: ['./behaviors.component.scss'],
  standalone: false
})
export class BehaviorsComponent implements OnInit {
  public status: string;
  public student: StudentClass;
  public get activeBehaviors(): StudentBehaviorClass[] { return this.student.trackables.activeBehaviors; }
  public get archivedBehaviors(): StudentBehaviorClass[] { return this.student.trackables.archivedBehaviors; }
  public get baselineBehaviors(): StudentBehaviorClass[] { return this.student.trackables.baselineBehaviors ?? []; }
  public selected: StudentBehaviorClass;
  public subscribeOnEach: BehaviorSubscription;
  public subscribePattern: BehaviorSubscription;
  public subscriptions: BehaviorSubscription[];
  public restrictions: UserSummaryRestrictions;
  public responsesForBehavior: StudentResponse[];
  public currentResponse: StudentResponse;
  public currentResponseStopDur: boolean;
  public responseNew: boolean;
  public reportingOn = environment.reporting;
  public features: LicenseFeatures;
  public snapshotConfig: SnapshotConfig;
  public administrator: boolean;
  public showArchived: boolean = false;

  @Input('student')
  public set setStudent(val: StudentClass) {
    this.student = val;
    if(!val) {
      return;
    }
    this.restrictions = val.restrictions;
    this.features = this.student.licenseDetails.features;
    this.administrator = this.restrictions.behavior === AccessLevel.admin;
    if(!this.student || !this.student.licenseDetails || !this.student.licenseDetails.features || !this.student.licenseDetails.features.snapshotConfig) {
      this.snapshotConfig = null;
    } else {
      this.snapshotConfig = this.student.licenseDetails.features.snapshotConfig;
    }

    if(this.activeBehaviors.length > 0) {
      this.selected = this.activeBehaviors[0];
    } else if(this.archivedBehaviors.length > 0) {
      this.selected = this.archivedBehaviors[0];
    } else {
      this.create();
    }
  }

  constructor(private userService: UserService) { }

  ngOnInit() {
  }

  async create() {
    this.selected = await this.student.trackables.addBehavior();
  }

  async setStatus(val: string) {
    this.status = val;
  }

  getYesOrNo(val: boolean): string {
    return val? 'Yes' : 'No';
  }

}
