import { Component, OnInit, Input } from '@angular/core';
import { 
  UserService, ApiClientService, AccessLevel, AppTemplate, AppTemplateCollection, 
  IoTDeviceClass, IoTDeviceCollection, IoTDeviceEventType, 
  IoTDeviceSubscription, StudentBehavior, StudentResponse, StudentTemplate,
  StudentTemplateBehaviorClass, TrackClass, TrackedBehavior, 
  UserSummaryRestrictions, StudentClass, UserClass 
} from '../../../..';

enum RegistrationStep {
  dsn = 'dsn',
  verification = 'verification',
  name = 'name'
}

@Component({
  selector: 'app-devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss'],
  standalone: false
})
export class DevicesComponent implements OnInit {
  public student: StudentClass | StudentTemplate;
  public devices: IoTDeviceCollection | AppTemplateCollection;
  public selected: IoTDeviceClass | AppTemplate;
  public activeBehaviors: (StudentBehavior|StudentTemplateBehaviorClass)[];
  public responses: (StudentResponse|StudentTemplateBehaviorClass)[];
  public subscribeLowPower: IoTDeviceSubscription;
  public user: UserClass;
  public status: string;
  public buttonVersion: number;
  public loading: boolean = true;
  public loadingText: string = '';
  public registrationStep: RegistrationStep;
  private verificationInterval;
  public restrictions: UserSummaryRestrictions;
  public administrator: boolean;
  public abcEnabled: boolean;
  public groupsEnabled: boolean;
  public switchCommand: string = '';
  public codewordSetupInProgress: boolean = false;
  public qrCode = false;
  public readonly = false;

  @Input() templatesOnly: boolean = false;

  public get isNew(): boolean {
    return this.selected &&
      this.selected.isNew
  }

  get trackDevice() {
    if(this.selected instanceof TrackClass) {
      return this.selected as TrackClass;
    }
    return null;
  }
  setSelection(val: IoTDeviceClass) {
    this.selected = val;
  }

  get showAppComponent() {
    return (this.selected?.isApp) || (!this.selected && this.qrCode);
  }

  @Input('student')
  public set setStudent(val: StudentClass | StudentTemplate) {
    this.qrCode = false;
    this.abcEnabled = false;
    this.groupsEnabled = false;
    this.student = val;
    this.devices = [] as any;
    this.selected = null;
    if (!val) {
      return;
    }

    this.readonly = val.restrictions.devices == AccessLevel.read;
    this.load();
  }

  constructor(private apiClient: ApiClientService, 
    private userService: UserService) {
    console.log('this.switchCommand');
    console.log(this.switchCommand);
  }

  async load() {
    this.setLoading(true, 'Loading');
    try {
      this.devices = await this.student.getDevices();
      this.activeBehaviors = this.student.trackables.activeBehaviors;
      this.responses = this.student.trackables.activeResponses;

      this.restrictions = this.student.restrictions;
      this.administrator = this.restrictions.devices === AccessLevel.admin;

      if (this.devices.length > 0) {
        this.setSelected(this.devices.items[0]);
      } else {
        this.selected = null;
      }
  
      if(this.student.licenseDetails && this.student.licenseDetails.features) {
        this.abcEnabled = this.student.licenseDetails.features.abc;
        this.groupsEnabled = this.student.licenseDetails.features.appGroups;
      }
    } finally {
      this.setLoading(false, 'Loading');
    }
  }

  showDevices() {
    const retval = this.student && (this.devices.length > 0 || this.selected);
    return retval;
  }

  async setLoading(val: boolean, text: string) {
    this.loading = val;
    this.loadingText = text;
  }

  ngOnInit() {
    this.userService.user.subscribe(user => {
      this.user = user;
    });
  }

  setSelected(item: IoTDeviceClass | AppTemplate) {
    if(!item) {
      item = this.devices.addTrack2();
    }
    this.selected = item;
    this.registrationStep = RegistrationStep.dsn;
    if (this.verificationInterval) {
      clearInterval(this.verificationInterval);
    }

    if(item instanceof IoTDeviceClass) {
      this.subscribeLowPower = item && item.subscriptions ? item.subscriptions.find(s => s.type === IoTDeviceEventType.LowPower) : undefined;
      if(!this.subscribeLowPower) {
        this.subscribeLowPower = {
          email: false,
          sms: false,
          type: IoTDeviceEventType.LowPower,
          userId: this.user.userId
        };
      }
      this.buttonVersion = item.dsn ? (item.dsn.startsWith('G') ? 1 : 2) : 1;
      if (item.commands &&
        item.commands[0] &&
        item.commands[0].term) {
        this.switchCommand = item.commands[0].term;
      }
    }
  }

  ensureSelectedCommands() {
    if (this.selected instanceof IoTDeviceClass &&
      this.selected.commands.length === 0) {
      this.switchCommand = '';
      this.selected.commands[0] = { studentId: this.student.studentId, term: this.switchCommand };
    }
  }

  isDsnValid() {
    if(this.selected instanceof AppTemplate) {
      return;
    }
    if (!this.selected || !this.selected.dsn) {
      return false;
    }
    this.selected.dsn = this.selected.dsn.trim();
    return this.selected.dsn.toUpperCase().match(/G030\W?[A-Z0-9]{4}\W?[A-Z0-9]{4}\W?[A-Z0-9]{4}\W*/) != null ||
          this.selected.dsn.toUpperCase().match(/M2[A-Z0-9]{2}\W?[A-Z0-9]{4}\W?[A-Z0-9]{4}\W?[A-Z0-9]{4}\W*/) != null;
  }

  async startRegistration() {
    if(this.selected instanceof AppTemplate) {
      return;
    }
    if (!this.isDsnValid()) {
      alert('The serial number specified is not valid');
      return;
    }

    this.setLoading(true, 'Saving');
    this.selected.dsn = this.selected.dsn.replace(/\W/g, '').toUpperCase();

    if (this.selected.dsn.startsWith('M')) {
      const version = parseInt(this.selected.dsn.substr(1, 1), 16);
      this.buttonVersion = version;
    } else {
      this.buttonVersion = 1;
    }

    // Perform this call to get any errors around the device already
    // having been assigned
    try {
      const response = await this.apiClient.deviceRegisterVerify(this.selected.dsn, this.student.studentId);
      this.selected.validated = (typeof response.validated === 'string') ? response.validated === 'true' : response.validated;

      if (this.selected.validated) {
        this.selected.multiStudent = response.multiStudent;
        this.selected.commands = response.commands;
        this.switchCommand = response.commands.find(x => x.studentId == this.student.studentId)?.term;
        await this.save();
      } else {
        this.registrationStep = RegistrationStep.verification;

        this.verificationInterval = setInterval(async () => {
          if(this.selected instanceof AppTemplate) {
            return;
          }
          const response = await this.apiClient.deviceRegisterVerify(this.selected.dsn, this.student.studentId);
          this.selected.validated = (typeof response.validated === 'string') ? response.validated === 'true' : response.validated;

          if (this.selected.validated) {
            clearInterval(this.verificationInterval);
            this.save();
          }
        }, 500);
      }
    } catch (err) {
      alert(err.message);
    }
    this.setLoading(false, 'Saving');
  }

  async setStatus(status: string) {
    this.status = status;
  }

  cancel() {
    this.selected.cancel();
  }

  create() {
    this.qrCode = false;
    this.setSelected(null);
  }
  async createApp() {
    this.qrCode = true;
    let index = 1;
    let name = '';
    let existing;
    do {
      name = 'App ' + index;
      index++;
      existing = this.devices.find(x => x.deviceName == name);
    } while (existing);
    this.selected = await this.devices.addApp(name);
  }

  async remove() {
    if (!confirm(`Are you sure you want to remove ${this.selected.deviceName}`)) {
      return;
    }
    this.setLoading(true, 'Saving');
    try {
      await this.trackDevice.delete();

      if (this.devices.length > 0) {
        this.setSelected(this.devices.items[0]);
      } else {
        this.selected = null;
      }
    } catch (err) {
      alert(err.message);
    }
    this.setLoading(false, 'Saving');
  }

  async resync() {
    this.setLoading(true, 'Resync');
    try {
      await this.trackDevice.resyncSecurity();
    } catch (err) {
      alert(err.message);
    } finally {
      this.setLoading(false, 'Resync');
    }
  }

  async save() {
    this.setLoading(true, 'Saving');
    try {
      await this.selected.save();
    } catch (err) {
      alert(err.message);
    }
    this.setLoading(false, 'Saving');
  }

  async setupCodeword() {
    this.codewordSetupInProgress = true;
    await this.trackDevice.putTermSetup();
    const setupInterval = setInterval(async () => {
      try {
        const response = await this.trackDevice.getTermStatus();
        if(response.termSet === false) {
          this.switchCommand = response.term;
          this.codewordSetupInProgress = false;
          clearInterval(setupInterval);
        }
      } catch (err) {
        alert(err.message);
      }
    }, 5000);
  }
}
