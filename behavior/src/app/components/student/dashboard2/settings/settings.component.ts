import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { 
  BehaviorSettings, CalculationType, IoTDeviceClass, IoTDeviceCollection, 
  StudentDashboardSettings, SummaryScope, UserService, StudentClass, moment
} from '../../../..';
import { colors } from '../dashboard2.component';

class DayOfWeekConfig {
  public dayName: string;
  constructor(private weekdayNumber: number, private settings: StudentDashboardSettings) {
    this.dayName = moment.weekdays()[weekdayNumber];
  }

  get boolValue(): boolean {
    if(!this.settings.autoExcludeDays) {
      return false;
    }
    const retval = this.settings.autoExcludeDays.findIndex(x => x === this.weekdayNumber) < 0;
    return retval;
  }

  set boolValue(setting: boolean) {
    const index = this.settings.autoExcludeDays.findIndex(x => x === this.weekdayNumber);
    if(setting) {
      if(index >= 0) {
        this.settings.autoExcludeDays.splice(index, 1);
      }
    } else {
      if(index < 0) {
        this.settings.autoExcludeDays.push(this.weekdayNumber);
      }
    }
    this.settings.summary.averageDays = 7 - this.settings.autoExcludeDays.length;
  }
}

@Component({
  selector: 'app-dashboard-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: false
})
export class SettingsComponent implements OnInit {
  public devices: IoTDeviceCollection;

  private _student: StudentClass;
  @Input("student")
  public set student(val: StudentClass) {
    this._student = val;
    val.getDevices().then(d => this.devices = d);
    this.settings = this._student.dashboard;
  }
  public get student() {
    return this._student;
  }

  public get abcEnabled() {
    return this._student?.licenseDetails?.features?.abc == true &&
      this.settings.antecedents?.length > 0
  }

  public weekdays: DayOfWeekConfig[];

  private _settings: StudentDashboardSettings;
  private _original: StudentDashboardSettings;
  @Input("settings")
  public set settings(val: StudentDashboardSettings) {
    if(val && !val.summary) {
      val.summary = {
        after45: SummaryScope.weeks,
        after150: SummaryScope.months,
        calculationType: CalculationType.avg,
        showTargets: true,
        averageDays: 5
      };
    }
    this._original = JSON.parse(JSON.stringify(val));
    this._settings = val;

    this.weekdays = [];
    for(let i = 0; i < 7; i++) {
      this.weekdays[i] = new DayOfWeekConfig(i, this._settings);
    }
  }
  public get settings(): StudentDashboardSettings {
    return this._settings;
  };

  @Output('settings') outSettings = new EventEmitter<StudentDashboardSettings>();
  @Output('close') close = new EventEmitter<boolean>();
  @Output('apply') apply = new EventEmitter<boolean>();
  
  constructor(private userService: UserService) { }

  ngOnInit(): void {
  }


  behaviorSettingChecked(behavior: BehaviorSettings): boolean {
    if (!behavior.duration) {
      return behavior.frequency? true : false;
    }

    return (behavior.frequency ||
      behavior.duration.avg ||
      behavior.duration.max ||
      behavior.duration.min ||
      behavior.duration.sum)? true : false;
  }

  behaviorSettingsAllChecked(behavior: BehaviorSettings): boolean {
    if (!behavior.duration) {
      return behavior.frequency? true : false;
    }

    return (behavior.frequency &&
      behavior.duration.avg &&
      behavior.duration.max &&
      behavior.duration.min &&
      behavior.duration.sum)? true : false;
  }

  behaviorSettingClicked(behavior: BehaviorSettings) {
    if (behavior.duration) {
      behavior['expanded'] = !behavior['expanded'];
      return;
    }

    if(behavior.frequency) {
      behavior.frequency = '';
    } else {
      const color = colors.find(x => !this.settings.behaviors.find(y => y.frequency == x[0]));
      behavior.frequency = color[0];
    }
  }

  async loadDefaultSettings() {
    if(this.student.dashboard) {
      const dashboard = await this.student.reports.getDefaultDashboard();
      if(!dashboard['success']) {
        this._original = dashboard;
        this._settings = JSON.parse(JSON.stringify(dashboard));
      }
    }
    this.applySettings();
  }

  async applySettings() {
    await this.userService.saveDashboardSettings(this.student.studentId, this.settings);
    this.outSettings.emit(this.settings);
    this.apply.emit(true);
  }
  
  async saveSettings() {
    await this.applySettings();
    this._original = JSON.parse(JSON.stringify(this.settings));
    this.student.reports.setDashboard(this.settings, true);
    this.outSettings.emit(this.settings);
    this.close.emit(true);
  }

  async saveAsDefault() {
    await this.applySettings();
    await this.student.reports.setDashboard(this.settings, false);
    this.outSettings.emit(this.settings);
    this.apply.emit(true);
    this.close.emit(true);
  }
  
  async cancelSettings() {
    this.settings = JSON.parse(JSON.stringify(this._original));
    this.outSettings.emit(this.settings);
    this.close.emit(true);
  }
  
  async closeSettingsDropdown() {
    const searchItem = this.settings.behaviors.find(b => {
      return b.frequency ||
        (
          b.duration && (
            b.duration.avg ||
            b.duration.max ||
            b.duration.min ||
            b.duration.sum
          )
        );
    });

    if (!searchItem) {
      alert('At least one behavior needs to be selected');
      return;
    }
    this.close.emit(true);
    await this.userService.saveDashboardSettings(this.student.studentId, this.settings);
    this.apply.emit(true);
  }

  isAllSettingsSelected(): boolean {
    const searchItems = this.settings.behaviors.filter(b => {
      return b.frequency &&
        (
          !b.duration || (
            b.duration.avg &&
            b.duration.max &&
            b.duration.min &&
            b.duration.sum
          )
        );
    });
    return searchItems.length === this.settings.behaviors.length;
  }

  selectAllSettings() {
    const searchItem = this.settings.behaviors.find(b => {
      return !b.frequency ||
        (
          b.duration && (
            !b.duration.avg ||
            !b.duration.max ||
            !b.duration.min ||
            !b.duration.sum
          )
        );
    });
    const anySelected = searchItem ? false : true;

    this.settings.behaviors.forEach(b => {
      let color = colors.find(x => x[0] == b.frequency);
      if(!color) {
        color = colors.find(x => !this.settings.behaviors.find(y => y.frequency == x[0]));
      }
      b.frequency = anySelected? color[0] : '';
      if (b.duration) {
        b.duration.avg = anySelected? color[1]! : '';
        b.duration.max = '';
        b.duration.min = '';
        b.duration.sum = '';
      }
    });
  }

  getBehaviorName(behavior: string): string {
    return this.student?.trackables?.getBehaviorName(behavior);
  }

  getDeviceName(device: IoTDeviceClass) {
    return device.deviceName;
  }
}
