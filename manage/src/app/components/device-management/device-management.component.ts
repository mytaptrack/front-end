import { Component, OnInit } from '@angular/core';
import { 
  ManageAppAssignment, ManageAppClass, ManageAppsClass, 
  ManageClass, StudentClass, UserClass 
} from '../../lib';
import { IoTDevice, LicenseFeatures } from '@mytaptrack/types';
import { UserService } from '../../services';

interface IoTDeviceEx extends IoTDevice {
  student: StudentClass;
  appId: string;
}

interface MobileDeviceEx {
  name: string;
  appId: string;
  id: string;
  assignments: IoTDeviceEx[];
  tags: string[];
}

@Component({
    selector: 'app-device-management',
    templateUrl: './device-management.component.html',
    styleUrls: ['./device-management.component.scss'],
    standalone: false
})
export class DeviceManagementComponent implements OnInit {
  private user: UserClass;
  private manage: ManageClass;
  private manageApps: ManageAppsClass;
  private students: StudentClass[];
  private _selected: ManageAppClass;
  public apps: ManageAppClass[];
  public expireInDays: number = 1;
  private _copyFrom: ManageAppAssignment;
  public addStudent = false;
  public processing: boolean = false;
  public loading: boolean = true;
  public _searchText: string;
  public searchResults: ManageAppClass[] = [];
  public features: LicenseFeatures;
  qrLoading: boolean = false;
  groupsEnabled: boolean;

  get reassigning() {
    return this._selected?.reassigning == true;
  }

  public get selected() {
    return this._selected;
  }
  public set selected(val: ManageAppClass) {
    this._selected = val;
  }

  get nonSelectedStudents() {
    return this.students.filter(x => !x.archived && !this.selected.assignments.find(y => y.studentId == x.studentId));
  }

  public get searchText() {
    return this._searchText;
  }
  public set searchText(val: string) {
    this._searchText = val;
    if(!val) {
      this.searchResults = [];
      return;
    }

    const normVal = val.toLowerCase();
    this.searchResults = this.apps.filter(x => x.device.name.indexOf(normVal) >= 0 || x.tags.find(tag => tag.toLowerCase().indexOf(normVal) >= 0));
  }
  public get activeApps() {
    return this.apps.filter(x => x.assignments && x.assignments.length > 0);
  }

  public get emptyApps() {
    return this.apps.filter(x => !x.assignments || x.assignments.length == 0);
  }

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.userService.user.subscribe(user => {
      if(!user) {
        return;
      }
      this.user = user;
      this.manage = user.management;
      this.load();
    });
  }
  setSelected(val: ManageAppClass) {
    this.selected = val;
  }
  async setProcessing(val: boolean) {
    this.processing = val;
  }
  async setLoading(val: boolean) {
    this.loading = val;
  }

  copyFrom(val: ManageAppAssignment) {
    this._copyFrom = val;
    this.addStudent = true;
  }

  async load() {
    this.setLoading(true);
    const [devices, studentsManagement, license] = await Promise.all([
      this.manage.getApps(),
      this.manage.getStudents(),
      this.user.loadLicense()
    ]);

    const features = this.user.licenseDetails.features;
    this.features = this.user.licenseDetails.features;
    this.groupsEnabled = this.features.appGroups;
      
    this.manageApps = devices;
    this.students = studentsManagement.students;
    this.apps = devices.apps;
    if(this.apps.length > 0) {
      this.apps.sort((a, b) => (a.device.name? a.device.name : '').localeCompare(b.device.name? b.device.name : ''));
      this.selected = this.apps[0];
    }
    this.setLoading(false);
  }

  async setQrLoading(val: boolean) {
    this.qrLoading = val;
  }
  async generateQrCode() {
    this.setQrLoading(true);
    try {
      await this.selected.generateQRCode();
    } finally {
      this.setQrLoading(false);
    }
  }
  getStudentName(student: StudentClass) {
    if(student.details.nickname) {
      return student.details.nickname;
    }
    return student.details.firstName + ' ' + student.details.lastName;
  }

  addStudentToApp(selectedStudentId: string) {
    this.addStudent = false;
    this.selected.addAssignment(selectedStudentId, this._copyFrom);
  }

  async updateAppName() {
    this.setLoading(true);
    try {
      await this.selected.save();
    } finally {
      this.setLoading(false);
    }
  }

  showSelectStudent() {
    this.addStudent = true;
  }

  async createApp() {
    const app = await this.manageApps.create();
    this.selected = app;
  }

  reassign() {
    if(confirm('Re-assigning an app will re-assign all historical data tracked with this device to a new mobile device. Are you sure you want to do this?')) {
      this._selected?.reassign();
    }
  }
}
