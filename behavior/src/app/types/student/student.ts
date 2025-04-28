import {
  Student, StudentDetails,
  UserSummaryRestrictions, Milestone,
  StudentReportClass, StudentTrackableCollection, AbcCollectionClass, TeamClass,
  LicenseSummary, StudentSummary,
  ApplyLicenseRequest, MttDocuments,
  MilestoneClass, AccessLevel, IoTDeviceCollection, SubscriptionsClass, StudentNotification,
  QLStudentUpdateInput,
  QLTrackable,
  QLTag,
  QLServiceInput,
  StudentBehavior
} from '..';
import { ApiClientService } from '../../services';
import { UserClass, StudentSchedulesClass } from '..';
import * as _ from 'lodash';

export class StudentClass {
  private studentSummary: StudentSummary;
  studentId: string;
  archived: boolean;
  deleted: boolean;
  license?: string;
  licenseDetails: LicenseSummary;
  details: StudentDetails;
  restrictions: UserSummaryRestrictions;
  milestones: MilestoneClass[];
  abc?: AbcCollectionClass;
  version: number;
  lastTracked: string;
  lastUpdateDate: string;
  tags: string[];
  reports: StudentReportClass;
  schedules: StudentSchedulesClass;
  trackables: StudentTrackableCollection;
  team: TeamClass;
  saving: boolean;
  private _documents: MttDocuments;
  private _subscriptions: SubscriptionsClass;
  
  get awaitingResponse(): boolean {
    return this.studentSummary?.awaitingResponse ?? false;
  }
  
  get displayName() {
    if(this.details.nickname) {
      return this.details.nickname;
    }
    return this.details.firstName + ' ' + this.details.lastName;
  }

  get alertCount() {
    const studentAlerts = this.user?.students?.find(x => x.studentId == this.studentId)?.alertCount ?? 0;
    return studentAlerts;
  }

  get displayTags() {
    return this.tags?.filter(x => !x.startsWith('Program:')) ?? [];
  }

  get dashboard() { return this.reports.dashboardSettings; }

  private _notificationCache: Promise<StudentNotification[]>;
  private _deviceCache: IoTDeviceCollection;

  constructor(private student: Student, private apiClient: ApiClientService, private user: UserClass) {
    const self = this;
    Object.keys(this.student).forEach(key => {
      if(key != 'dashboard' && key != 'reports' && key != 'abc' && key != 'schedules' && key != 'trackables' && key != 'team') {
        self[key] = student[key]
      }
    });
    this.trackables = new StudentTrackableCollection(this, student, this.user?.userId, this.apiClient);
    this.reports = new StudentReportClass(this, student, this.apiClient);
    this.milestones = this.student.milestones?.map(x => new MilestoneClass(x, this, this.apiClient)) ?? [];

    if(!this.student.partial) {
      this.abc = new AbcCollectionClass(student.abc, this, this.apiClient);
      this.schedules = new StudentSchedulesClass(this, this.apiClient);
      this.team = new TeamClass(this.user, this, this.apiClient);
    }

    this.studentSummary = user?.students?.find(x => x.studentId == self.studentId);
  }

  async saveGraphQL() {
    const student: QLStudentUpdateInput = {
      studentId: this.student.studentId,
      license: this.student.license,
      licenseDetails: {
        fullYear: this.student.licenseDetails.fullYear,
        flexible: this.student.licenseDetails.flexible,
        services: this.student.licenseDetails.services,
        transferable: this.student.licenseDetails.transferable
      },
      schoolStudentId: this.student.schoolStudentId,
      details: this.student.details,
      archived: this.student.archived,
      milestones: this.student.milestones.map(m => ({
        date: m.date,
        title: m.title ?? '',
        description: m.description ?? ''
      })),
      abc: this.student.abc,
      behaviors: this.trackables.behaviors?.map(b => ({
        id: b.id,
        name: b.name,
        isArchived: b.isArchived,
        isDuration: b.isDuration,
        managed: b.managed,
        desc: b.desc,
        daytime: b.daytime,
        baseline: b.baseline,
        trackAbc: b.trackAbc,
        requireResponse: b.requireResponse,
        targets: b.targetGoals.dataModel?.map(t => ({
            targetType: t.targetType,
            target: t.target,
            progress: t.progress ?? 0,
            measurements: t.measurements.map(m => ({
                name: m.name,
                value: m.value
            })),
            measurement: t.measurement
        })),
        tags: b.tags?.map(t => ({ tag: t, type: 'user' } as QLTag)) ?? []
      } as QLTrackable)),
      responses: this.trackables.responses?.map(b => ({
        id: b.id,
        name: b.name,
        isArchived: b.isArchived,
        isDuration: b.isDuration,
        managed: b.managed,
        desc: b.desc,
        daytime: b.daytime,
        baseline: false,
        trackAbc: false,
        requireResponse: b.requireResponse,
        targets: b.targets?.map(t => ({
            targetType: t.targetType,
            target: t.target,
            progress: t.progress ?? 0,
            measurements: t.measurements.map(m => ({
                name: m.name,
                value: m.value
            })),
            measurement: t.measurement
        })),
        tags: b.tags?.map(t => ({ tag: t, type: 'user' } as QLTag)) ?? []
      } as QLTrackable)),
      services: this.student.services?.map(s => ({
        id: s.id,
        name: s.name,
        desc: s.desc,
        durationRounding: s.durationRounding,
        target: s.target,
        detailedTargets: s.detailedTargets.map(dt => ({
          date: dt.date,
          target: dt.target,
          groupId: dt.groupId,
          type: dt.type
        })),
        modifications: s.modifications,
        goals: s.goals,
        startDate: s.startDate,
        endDate: s.endDate,
        isArchived: s.isArchived
      } as QLServiceInput)),
      scheduleCategories: this.student.scheduleCategories
    }

    console.info('Student:', JSON.stringify(student));
    const studentResult = await this.apiClient.updateStudent(student);

    if(!this.studentId) {
      this.studentId = studentResult.studentId;
      this.user.students.push({
        studentId: studentResult.studentId,
        firstName: studentResult.details.firstName,
        lastName: studentResult.details.lastName,
        lastTracked: studentResult.lastTracked,
        tags: studentResult.details.tags.map(t => t.tag ),
        displayTags: (this.licenseDetails?.features?.displayTags ?? []).map(x => {
          if(student.details.tags.find(y => y.tag == x.tagName)) {
            return x;
          }
          return;
        }).filter(x => x? true : false).sort((a, b) => a.order - b.order).map(x => x.tagName),
        alertCount: 0,
        awaitingResponse: false
      });
      this.studentId = studentResult.studentId;
      this.student.studentId = studentResult.studentId;
    }

    this.student.behaviors = studentResult.behaviors.map(b => ({
      ...b,
      tags: b.tags.map(t => t.tag)
    } as StudentBehavior));

    this.setDetails(this.student);
    // this.user?.loadStudent(null);
    // this.user?.loadStudent(student.studentId);

    return studentResult;
  }
  async save() {
    const student = await this.apiClient.createStudent({
      studentId: this.studentId,
      tags: this.tags,
      milestones: this.milestones.map(x => x.milestone),
      ...this.details,
      subtext: this.details.nickname ?? undefined,
      archived: this.archived? true : undefined
    });
    if(!this.studentId) {
      this.user.students.push({
        studentId: student.studentId,
        firstName: student.details.firstName,
        lastName: student.details.lastName,
        lastTracked: student.lastTracked,
        tags: student.tags,
        displayTags: (this.licenseDetails?.features?.displayTags ?? []).map(x => {
          if(student.tags.find(y => y == x.tagName)) {
            return x;
          }
          return;
        }).filter(x => x? true : false).sort((a, b) => a.order - b.order).map(x => x.tagName),
        alertCount: 0,
        awaitingResponse: false
      });
      this.studentId = student.studentId;
    }
    this.setDetails(student);
    this.user?.loadStudent(null);
    this.user?.loadStudent(student.studentId);
    
    return this;
  }

  async remove() {
    this.saving = true;
    try {
      await this.apiClient.permanentlyDeleteStudent(this.studentId);
      this.deleted = true;
    } finally {
      this.saving = false;
    }
  }

  createMilestone(milestone: Milestone) {
    return new MilestoneClass(milestone, this, this.apiClient);
  }

  private setDetails(student: Student) {
    this.student = student;

    const self = this;
    Object.keys(this.student).forEach(key => {
      if(key != 'dashboard' && key != 'reports' && key != 'abc' && key != 'schedules' && key != 'trackables' && key != 'team' && key != 'milestones') {
        self[key] = student[key];
      }
    });
    this.trackables = new StudentTrackableCollection(this, student, this.user?.userId, this.apiClient);
    this.reports = new StudentReportClass(this, student, this.apiClient);

    Object.keys(this.student).forEach(key => {
      if(key != 'dashboard' && key != 'reports' && key != 'abc' && key != 'schedules' && key != 'trackables' && key != 'team' && key != 'milestones') {
        self[key] = this.student[key]
      }
    });
    
    if(!this.student.partial) {
      this.abc = new AbcCollectionClass(student.abc, this, this.apiClient);
      this.schedules = new StudentSchedulesClass(this, this.apiClient);
      this.team = new TeamClass(this.user, this, this.apiClient);
    }
  }

  async ensureFullStudent() {
    if(!this.student.partial) {
      return;
    }

    this.student = await this.apiClient.getStudentV2(this.studentId);

    this.setDetails(this.student);
  }

  async getNotifications(): Promise<StudentNotification[]> {
    if (!this._notificationCache && this.studentId) {
      if(this.student.restrictions.data == AccessLevel.none) {
        this._notificationCache = Promise.resolve([]);
      } else {
        const results = this.apiClient.getNotificationsStudent(this.studentId);
        this._notificationCache = results.then(notifications => {
          return notifications.map(notification => new StudentNotification(this, notification, this.apiClient));
        });  
      }
    }
    const result = await this._notificationCache;
    return result;
  }

  async getSubscriptions() {
    if(!this._subscriptions) {
      this._subscriptions = new SubscriptionsClass(this, this.apiClient);
      await this._subscriptions.load();
    }
    return this._subscriptions;
  }

  public async getDevices(): Promise<IoTDeviceCollection> {
    if (!this._deviceCache) {
      this._deviceCache = new IoTDeviceCollection(this.apiClient, this);
      console.log('Loading devices');
      await this._deviceCache.load();
      console.log('Devices loaded');
    }
    return this._deviceCache;
  }

  async applyLicense(type: '' | 'No License' | 'Single' | 'Multi' | 'Other' | 'Archive') {
    this.saving = true;
    try {
      if(this.license == (this.user?.license ?? this.student.license)) {
        if(this.student.licenseDetails?.fullYear && type == 'Single') {
          return;
        }
        if(this.student.licenseDetails?.flexible && type == 'Multi') {
          return;
        }
      }

      if (type == 'Single' || type == 'Multi') {
        const input = {
          license: this.user?.license ?? this.student.license,
          licenseDetails: {
            fullYear: type == 'Single',
            flexible: type == 'Multi'
          },
          studentId: this.studentId,
          archive: false
        } as ApplyLicenseRequest;
        if(!input.license) {
          alert('Could not identify the license to apply');
          return;
        }
        const [result] = await Promise.all([
          this.apiClient.putLicenseStudent(input),
        ]);
        if (type == 'Single' && this.user) {
          this.user.licenseDetails.singleUsed++;
        }
        this.license = result.license;
        this.licenseDetails = result.licenseDetails;
        if(result.behaviors) {
          this.setDetails(result);
        }
      } else if (type == 'No License') {
        const result = await Promise.all([
          this.apiClient.putLicenseStudent({
            license: this.license,
            licenseDetails: {
              fullYear: false,
              flexible: false
            },
            studentId: this.studentId,
            archive: false
          })
        ]);
        this.student.licenseDetails.flexible = false;
        this.student.licenseDetails.fullYear = false;
        
        if (this.licenseDetails.fullYear) {
          this.user.licenseDetails.singleUsed--;
        }
      } else if (type == 'Archive') {
        const result = await this.apiClient.putLicenseStudent({
          license: this.license,
          licenseDetails: {
            fullYear: false,
            flexible: false
          },
          studentId: this.studentId,
          archive: true
        });
        if (this.licenseDetails.fullYear) {
          this.user.licenseDetails.singleUsed--;
        }
        this.student.licenseDetails.flexible = false;
        this.student.licenseDetails.fullYear = false;
        this.archived = true;
      }
    } finally {
      this.saving = false;
    }
  }

  async dismissNotifications() {
    await this.apiClient.ignoreNotificationsForStudent(this.studentId);
    this._notificationCache = null;
  }

  async dismissPending() {
    await this.apiClient.ignorePendingForStudent(this.studentId);
    this._notificationCache = null;
  }

  async getDocuments() {
    if(!this._documents) {
      this._documents = new MttDocuments(this, this.apiClient);
      await this._documents.load();
    }
    return this._documents;
  }
}
