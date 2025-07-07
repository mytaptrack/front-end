import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { 
  AppClass, IoTDeviceClass, IoTDeviceCollection, IoTDeviceEvent, 
  StudentBehavior, StudentResponse, StudentClass, 
  ApiClientService
} from '../../../../..';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

class DeviceBehavior {
  public event: IoTDeviceEvent;
  public isResponse: boolean;

  get order() { return this.event.order; }
  set order(val: number) {
    this.event.order = val;
    this.sortFunction(this);
  }

  constructor(public studentBehavior: StudentBehavior, isResponse: boolean, private sortFunction) {
    this.isResponse = isResponse;
    Object.keys(studentBehavior).forEach(key => {
      this[key] = this.studentBehavior[key];
    });
    this.reset();
  }

  reset() {
    this.event = {
      eventId: this.studentBehavior.id,
      track: true,
      abc: this.studentBehavior.trackAbc,
      order: 9999,
    };
  }
}

@Component({
  selector: 'device-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class DeviceAppComponent implements OnInit {
  public student: StudentClass;
  public devices: IoTDeviceCollection;
  public activeBehaviors: DeviceBehavior[];
  public responses: StudentResponse[];
  public selected: AppClass;
  public loading: boolean = true;
  public qrToken: string;
  public systemQr: string;
  public qrExpires: number = 1;
  @Output('onSelectedChanged') onSelectedChange = new EventEmitter<IoTDeviceClass>();
  @Input() public hideName: boolean;
  @Input() public administrator: boolean;
  @Input() public abcEnabled: boolean;
  @Input() public groupsEnabled: boolean;
  @Input('readOnly') public readonly: boolean = false;

  public get invalidAbc() {
    return this.abcEnabled && 
      this.selected.events.find(x => x.abc) && 
      (
        !this.student.abc || 
        this.student.abc.antecedents.length == 0 || 
        this.student.abc.consequences.length == 0
      );
  }

  getDisplayedColumns(): string[] {
    const columns = ['order', 'behavior', 'track'];
    if (this.abcEnabled) {
        columns.push('abc');
    }
    return columns;
  }

  constructor(private api: ApiClientService) { }

  ngOnInit(): void {
    console.log('Loading app');
  }

  @Input('selected') 
  set setSelected(val: AppClass) {    
    if(this.selected && val && this.selected.dsn == val.dsn && !this.loading) {
      return;
    }
    this.selected = val;
    this.load(this.student, this.selected);
  }

  @Input('student')
  public set setStudent(val: StudentClass) {
    this.student = val;
    if (!val) {
      this.devices = [] as any;
      return;
    }
  
    this.load(this.student, this.selected);
  }

  async setLoading(val: boolean) {
    this.loading = val;
  }

  async load(student: StudentClass, selected: AppClass) {
    this.qrToken = '';
    if(!student || !selected) {
      return;
    }

    this.setLoading(true);
    if(!this.hideName) {
      student.getDevices().then(x => this.devices = x);
    }
    const activeBehaviors = [].concat(
      student.trackables.behaviors
        .filter(x => !x.isArchived)
        .map(x => new DeviceBehavior(x, false, (updated) => { this.resortActiveBehaviors(updated); })),
      student.trackables.responses
        .filter(x => !x.isArchived)
        .map(x => new DeviceBehavior(x, true, (updated) => { this.resortActiveBehaviors(updated); }))
    );
    this.activeBehaviors = activeBehaviors;
    this.resortActiveBehaviors();

    if(!this.selected) {
      let index = 1;
      let name: string;
      do {
        name = `App ${index}`;
        index++;
      } while(this.devices.find(x => x.deviceName.toLowerCase() == name.toLowerCase()));
      this.devices.addApp(name).then(app => this.selected = app);
      this.qrExpires = 1;  
    }

    this.activeBehaviors.forEach(x => x.reset());
    this.selected.events.forEach((x, index) => {
      const behavior = this.activeBehaviors.find(y => y.studentBehavior.id == x.eventId);
      if(behavior) {
        behavior.event = x;
      }
    });
    this.activeBehaviors.forEach((x, index) => {
      if(this.selected.events.find(y => y.eventId == x.studentBehavior.id)) {
        return;
      }

      x.event = {
        eventId: x.studentBehavior.id,
        track: true,
        abc: x.studentBehavior.trackAbc,
        order: 9999
      };
      this.selected.events.push(x.event);
    });
    this.resortActiveBehaviors();
    if(this.selected.dsn == 'new') {
      this.generateQrCode();
    }
    this.setLoading(false);
  }

  drop(event: CdkDragDrop<DeviceBehavior>) {
    moveItemInArray(this.activeBehaviors, event.previousIndex, event.currentIndex);

    this.activeBehaviors.forEach((x, i) => x.event.order = i + 1);
  }

  resortActiveBehaviors(updated?: DeviceBehavior) {
    if(updated) {
      const conflictIndex = this.activeBehaviors.findIndex(x => x.order == updated.order && x != updated);
      if(conflictIndex >= 0) {
        this.activeBehaviors.forEach((x, i) => {
          if (x != updated && i >= conflictIndex) {
            x.event.order++;
          }
        });
      }
    }
    this.activeBehaviors.sort((a, b) => {
      const orderDiff = a.event.order - b.event.order;
      if(orderDiff != 0) {
        return orderDiff;
      }

      return a.studentBehavior.name.localeCompare(b.studentBehavior.name);
    });
    this.activeBehaviors.forEach((x, i) => x.event.order = i + 1);
  }

  getBehavior(data: IoTDeviceEvent) {
    const event = this.activeBehaviors.find(x => x.studentBehavior.id == data.eventId);
    return event;
  }

  async generateQrCode() {
    this.setLoading(true);
    try {
      const settings = await this.api.getServerSettings();
      this.systemQr = settings.token;
      await this.selected.getToken();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
    this.setLoading(false);
  }

  toggleBehaviorForApp(behavior: StudentBehavior) {
    if(!this.selected || !this.selected.isApp) {
      return false;
    }

    let event = this.selected.events.find(x => x.eventId === behavior.id);
    if(event) {
      event.track = !event.track;
    } else {
      let order = this.selected.events.length + 1;
      while(this.selected.events.find(y => y.order == order)) {
        order++;
      }
      event = {
        eventId: behavior.id,
        track: true,
        alert: false,
        abc: behavior.trackAbc,
        order: this.selected.events.length + 1
      };
      this.selected.events.push(event);
    }
  }

  getAppEvent(behavior: StudentBehavior) {
    return this.selected.events.find(x => x.eventId === behavior.id);
  }

  isBehaviorCheckedForApp(behavior: StudentBehavior): boolean {
    if(!this.selected) {
      return false;
    }

    return this.selected.events.find(x => x.eventId === behavior.id && x.track)? true : false;
  }

  async save(setTerm: boolean = false) {
    if(!this.selected.deviceName) {
      alert('The name of the app must be set');
      return;
    }
    if(!this.selected.studentName) {
      alert('The name of the student must be set');
      return;
    }
    this.setLoading(true);
    try {
      const isNew = this.selected.isNew;
      await this.selected.save();
      const selected = this.selected;
      this.selected = null;
      this.setSelected = selected;
      if(isNew) {
        const settings = await this.api.getServerSettings();
        this.systemQr = settings.token;
        await this.selected.getToken();
      }
    } catch (err) {
      alert(err.message);
    }
    this.setLoading(false);
  }

  async remove() {
    if (!confirm(`Are you sure you want to remove ${this.selected.deviceName}`)) {
      return;
    }
    this.setLoading(true);
    try {
      await this.selected.delete();
      if (this.devices.filter(x => !x.deleted).length > 0) {
        this.onSelectedChange.emit(this.devices[0]);
      } else {
        this.selected = null;
      }
    } catch (err) {
      alert(err.message);
    }
    this.setLoading(false);
  }

  closeQrCode() {
    this.selected.hideToken();
  }
}
