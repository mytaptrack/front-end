import {
    Notification, NotificationDetailsTeam, UserDetails, LicenseDetails,
    StudentSummary, AccessLevel, TeamInviteClass, copy
} from '.';
import { BehaviorSubject } from 'rxjs';
import { User, moment, ManageClass, StudentClass } from '.';
import { ApiClientService } from '../services';

export class UserClass {
    private _studentIdInProgress: string;
    get admin() { return this._admin; }
    get licenses() { return this._licenses ?? []; }
    private _manage: ManageClass;
    get management() {
        return this._manage;
    }

    get manageFeature() { return this.licenses?.length > 0; }

    get userId(): string {
        return this.data.userId;
    }
    get terms(): string {
        return this.data.terms;
    }
    get details(): UserDetails {
        return this.data.details;
    }
    get license(): string {
        return this.licenses[0];
    }
    get licenseDetails(): LicenseDetails {
        return this.data.licenseDetails;
    }
    get students(): StudentSummary[] { 
        if (moment().isAfter(this._teamInviteTimeout)) {
            this.reloadInvites(null);
        }
        return this.data.students;
    }
    set students(val: StudentSummary[]) {
        this.data.students = val;
        this.studentsChanged.next(val);
    }

    studentsChanged: BehaviorSubject<StudentSummary[]> = new BehaviorSubject<StudentSummary[]>(null);
    _selectedStudent: BehaviorSubject<StudentClass>;
    get selectedStudent() { return this._selectedStudent; }

    private _teamInviteTimeout: moment.Moment;
    private _teamInvites: TeamInviteClass[] = [];
    get teamInvites(): TeamInviteClass[] {
        if (moment().isAfter(this._teamInviteTimeout)) {
            this.reloadInvites(null);
        }
        return this._teamInvites;
    }

    constructor(private data: User, private _licenses: string[], private _admin: boolean, private api: ApiClientService) {
        this._selectedStudent = new BehaviorSubject<StudentClass>(null);
        this.reloadInvites(null);
        if(!_licenses || _licenses.length == 0) {
            this._licenses = data.license? [data.license] : [];
        }
        this._teamInviteTimeout = moment().add(30, 'seconds');
        this._manage = this._licenses.length > 0 ? new ManageClass(this.api, this._licenses[0]) : undefined;
        this.data.students?.sort((a, b) => {
            if (!a) {
                return -1;
            }
            if (!b) {
                return 1;
            }
            if(a.firstName.toLowerCase() == b.firstName.toLowerCase()) {
                return a.lastName.localeCompare(b.lastName);
            }
            return a.firstName.localeCompare(b.firstName);
        });
    }

    async loadLicense(license: string = undefined) {
        if(!license) {
            license = this.license;
            if(!license) {
                return;
            }
        }
        if(this.licenseDetails) {
            return;
        }
        try {
            const retval = await this.api.getLicense(license);
            this.data.licenseDetails = retval;
        } catch (e) {

        }
    }

    async reloadInvites(data: Notification<NotificationDetailsTeam>[]) {
        if (!data) {
            this._teamInviteTimeout = moment().add(30, 'seconds');
            const stats = await this.api.getStudentStats();
            data = stats.invites;
            
            this.students.forEach(s => {
                const stat = stats.stats.find(x => x.studentId == s.studentId);
                if(stat) {
                    s.alertCount = stat.alertCount;
                    s.awaitingResponse = stat.awaitingResponse;
                } else {
                    s.alertCount = 0;
                    s.awaitingResponse = false;
                }
            });
        }
        this._teamInvites = data.map(x => new TeamInviteClass(x, this.api, this));
        if (this.data.students) {
            this.data.students.forEach(x => {
                x.tags = x.tags?.filter(x => !x.startsWith('Program:')) ?? [];
            });
            this.data.students.sort((a, b) => {
                if (!a) {
                    return -1;
                }
                if (!b) {
                    return 1;
                }
                return a.firstName.localeCompare(b.firstName)
            });
        }
    }

    acceptTerms() {
        this.data.terms = new Date().toString()
    }

    removeStudent(studentId: string) {
        const index = this.data.students.findIndex(x => x.studentId == studentId);
        if (index >= 0) {
            this.data.students.splice(index, 1);
        }
        if (this.selectedStudent.value && this.selectedStudent.value.studentId == studentId) {
            if (this.students.length > 0) {
                this.loadStudent(this.students[0].studentId);
            } else {
                this.selectedStudent.next(null);
            }
        }
    }

    async ensureInit(routeStudentId: string) {
        if(this.selectedStudent.value || this._studentIdInProgress || this.students.length == 0) {
            return;
        }

        if(routeStudentId && this.students.find(x => x.studentId == routeStudentId)) {
            await this.loadStudent(routeStudentId);
        } else {
            await this.loadStudent(this.students[0].studentId);
        }
    }
    
    async loadStudent(studentId: string): Promise<StudentClass> {
        if(this._studentIdInProgress == studentId) {
            if(this.selectedStudent.value?.studentId == studentId) {
                return this.selectedStudent.value;
            }

            return new Promise((resolve) => {
                const ih = setInterval(() => {
                    if(this.selectedStudent.value?.studentId == studentId) {
                        clearInterval(ih);
                        resolve(this.selectedStudent.value);
                    }
                }, 100);
            });
        }
        this._studentIdInProgress = studentId;
        const selected = this.selectedStudent.getValue()
        if (selected && selected.studentId == studentId) {
            return this.selectedStudent.value;
        }

        const details = await this.api.getStudentV2(studentId);
        const student = new StudentClass(details, this.api, this);
        this.selectedStudent.next(student);
        return this.selectedStudent.value;
    }

    async save(): Promise<User> {
        const retval = await this.api.putUserProfile(this.data, true);
        if (retval) {
            this.data.license = retval.license;
        }
        return retval;
    }

    createStudent() {
        const retval = new StudentClass({
            studentId: undefined,
            behaviors: [],
            responses: [],
            documents: [],
            restrictions: {
                abc: AccessLevel.admin,
                behavior: AccessLevel.admin,
                milestones: AccessLevel.admin,
                reports: AccessLevel.admin,
                data: AccessLevel.admin,
                schedules: AccessLevel.admin,
                devices: AccessLevel.admin,
                team: AccessLevel.admin,
                comments: AccessLevel.admin,
                notifications: AccessLevel.admin,
                documents: AccessLevel.admin,
                info: AccessLevel.admin,
                service: AccessLevel.admin,
                serviceData: AccessLevel.admin,
                serviceGoals: AccessLevel.admin,
                serviceSchedule: AccessLevel.admin
            },
            absences: [],
            license: this.license,
            licenseDetails: {
                fullYear: false,
                flexible: false,
                features: this.licenseDetails?.features,
                expiration: this.licenseDetails?.expiration
            },
            milestones: [],
            services: [],
            details: {
                firstName: '',
                lastName: '',
                nickname: ''
            },
            tags: [],
            lastTracked: moment().toISOString(),
            lastUpdateDate: moment().toISOString(),
            version: 1
        }, this.api, this);
        this.selectedStudent.next(retval);
        return retval;
    }

    toUser(): User {
        return {
            userId: this.userId,
            details: copy(this.details),
            terms: this.terms,
            teamInvites: [],
            license: this.license,
            licenseDetails: this.licenseDetails,
            students: this.students,
            version: 1
        };
    }

    async acceptAllInvites() {
        const result = await this.api.acceptAllTeamMemberInvites();
        window.location.reload();
    }
}