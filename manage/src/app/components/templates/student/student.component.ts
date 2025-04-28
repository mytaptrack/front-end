import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  StudentTemplate, StudentTemplateBehaviorClass 
} from '../../../lib';
import {
  MeasurementType, StudentTemplateBehavior, LicenseFeatures
} from '@mytaptrack/types';

@Component({
    selector: 'app-manage-student',
    templateUrl: './student.component.html',
    styleUrls: ['./student.component.scss'],
    standalone: false
})
export class ManageStudentComponent implements OnInit {
  private _template: StudentTemplate;
  public saving: boolean;
  public deleting: boolean;
  public descDialogText: string;
  public descDialogModel: StudentTemplateBehavior;
  public descDialogShow: boolean = false;
  public targetDialogShow: boolean = false;
  public targetDialogBehavior: StudentTemplateBehavior;
  private targetDialogBehaviorOrig: StudentTemplateBehavior;
  public selectedBehavior: StudentTemplateBehaviorClass;
  public selectedTab: string;
  get behaviorAccess() { return true; };
  get responseAccess() { return this.features.response; };
  get deviceAccess() { return this.features.devices; };
  get abcAccess() { return this.features.abc; };
  get milestoneAccess() { return false; }
  get scheduleAccess() { return false; }
  get teamAccess() { return false; }
  get notificationAccess() { return false; }

  get frequencyTarget() {
    return this.targetDialogBehavior.targets.find(x => x.targetType == 'frequency');
  }
  get durationTarget() {
    return this.targetDialogBehavior.targets.find(x => x.targetType == 'duration');
  }

  @Input()
  public features: LicenseFeatures;


  @Output('deleted') public deleted = new EventEmitter<void>();

  @Input()
  public set template(val: StudentTemplate) {
    this._template = val;
  }

  public get template() {
    return this._template
  }

  selectedTabIndex: number = 0;

  // Map the selected tab to the correct index based on the route
  setSelectedTab(tab: string) {
    const tabMap: { [key: string]: number } = {
      'behaviors': 0,
      'responseTracking': 1,
      'abc': 2,
      'milestones': 3,
      'schedule': 4,
      'devices': 5,
      'team': 6,
      'notifications': 7
    };
    
    this.selectedTabIndex = tabMap[tab] || 0;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const tabName = params.get('tabName');
      if(!tabName) {
        this.router.navigate(['/templates/behaviors'], {
          queryParamsHandling: 'merge'
        });
        return;
      }

      this.selectedTab = tabName;
    });
  }

  async setSaving(val: boolean) {
    this.saving = val;
  }
  cancel() {
    this.template = this._template;
  }
  async save() {
    this.setSaving(true);
    try {
      await this._template.save();
    } finally {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 100);
      });
      this.setSaving(false);
    }
  }
  async setDeleting(val: boolean) {
    this.deleting = val;
  }
  async delete() {
    this.setDeleting(true);
    try {
      await this._template.delete();
      this.deleted.emit();
    } finally {
      this.setDeleting(false);
    }
  }

  showBehaviorDescDialog(behavior: StudentTemplateBehavior) {
    this.descDialogText = behavior.desc;
    this.descDialogModel = behavior;
    this.descDialogShow = true;
  }

  setBehaviorDescDialog() {
    if(this.descDialogModel) {
      this.descDialogModel.desc = this.descDialogText;
    }
    this.descDialogShow = false;
  }

  cancelBehaviorDescDialog() {
    this.descDialogShow = false;
  }

  hasTargets(behavior: StudentTemplateBehavior) {
    return behavior && behavior.targets && behavior.targets.length > 0;
  }

  showTargetDialog(behavior: StudentTemplateBehavior) {
    this.targetDialogBehaviorOrig = behavior;
    this.targetDialogBehavior = JSON.parse(JSON.stringify(behavior));
    this.targetDialogShow = true;
  }

  cancelTargetDialog() {
    this.targetDialogShow = false;
  }

  targetDialogFrequencyClick() {
    const frequencyIndex = this.targetDialogBehavior.targets.findIndex(x => x.targetType == 'duration');
    if(frequencyIndex >= 0) {
      this.targetDialogBehavior.targets.splice(frequencyIndex, 1);
    } else {
      this.targetDialogBehavior.targets.push({
        targetType: 'frequency',
        measurement: MeasurementType.sum,
        measurements: [],
        target: 0,
        progress: 0
      });
    }
  }

  targetDialogDurationClick() {
    const durationIndex = this.targetDialogBehavior.targets.findIndex(x => x.targetType == 'duration');
    if(durationIndex >= 0) {
      this.targetDialogBehavior.targets.splice(durationIndex, 1);
    } else {
      this.targetDialogBehavior.targets.push({
        targetType: 'duration',
        measurement: MeasurementType.sum,
        measurements: [],
        target: 0,
        progress: 0
      });
    }
  }

  getTargetText(behavior: StudentTemplateBehavior, type: string) {
    if(!behavior || !behavior.targets) {
      return '';
    }
    const targetType = behavior.targets.find(x => x.targetType == type);
    if(!targetType) {
      return '';
    }
    return `${type}: ${targetType.target}`;
  }
}
