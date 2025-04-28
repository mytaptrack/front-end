import { 
    AppClass, ManageClass, ManageStudentsClass, 
    MobileDevice, MobileDeviceRegistration, 
    StudentClass 
} from "..";
import { ApiClientService } from "../../services";
import * as uuid from 'uuid';
import { TrackedBehavior } from "@mytaptrack/types";

function copy(source: any) {
    return JSON.parse(JSON.stringify(source));
}

export class ManageAppAssignment {
    studentId: string;
    id: string;
    name: string;
    behaviors: TrackedBehavior[];
    groups: string[];
    get student() { return this._student; }
    private _deleting = false;
    get deleting() { return this._deleting; }
    get timezone() { return this._source.timezone;}
    get isNew() { return this._isNew; }
    
    get appObject(): MobileDeviceRegistration {
        return {
            studentId: this.studentId,
            id: this.id,
            name: this.name,
            behaviors: copy(this.behaviors),
            groups: copy(this.groups),
            timezone: this.timezone,
        };
    }

    private _app: AppClass;
    get app() {
        if(!this._app) {
            this._app = new AppClass({
                deviceId: this._manageApp.appId,
                dsn: this.id,
                deviceName: this._manageApp.device.name,
                studentId: this.studentId,
                studentName: this.name,
                timezone: this._source.timezone,
                isApp: true,
                validated: true,
                license: this.license,
                multiStudent: false,
                commands: [],
                groups: this.groups,
                events: this.behaviors.map(x => ({
                    eventId: x.id,
                    track: x.track,
                    abc: x.abc,
                    order: x.order
                })),
            }, undefined, this.api, () => {}, () => {});
        }
        return this._app;
    }

    constructor(private _source: MobileDeviceRegistration, private license: string, private _manageApp: ManageAppClass, private api: ApiClientService, private _student: StudentClass, private removeApp: (item: ManageAppAssignment)=> void, private _isNew: boolean) {
        this.studentId = _source.studentId;
        this.id = _source.id;
        this.name = _source.name;
        this.behaviors = copy(_source.behaviors);
        this.groups = _source.groups? copy(_source.groups) : [];
    }

    async setDeleting(val: boolean) {
        this._deleting = val;
    }
    async delete() {
        this.setDeleting(true);
        try {
            await this.api.deleteManagedApp({
                studentId: this.studentId,
                dsn: this.id
            });
            this.removeApp(this);
        } finally {
            this.setDeleting(false);
        }
    }
}

export class ManageAppClass {
    reassigning: boolean = false;
    appId: string;
    assignments: ManageAppAssignment[];
    tags: string[];
    device: { id: string; name: string; };

    get name() {
        return this.device?.name ?? 'Un-named App';
    }
    
    private _token: string;
    get token() { return this.assignments[0]?.app.token; }

    get selectedStudents() {
        return this._students.filter(x => this.assignments.find(y => y.studentId == x.studentId));
    }
    get unselectedStudents() {
        return this._students.filter(x => !this.assignments.find(y => y.studentId == x.studentId));
    }
    get isNew() { return this._isNew; }
    
    constructor(private data: MobileDevice, private license: string, private api: ApiClientService, private _students: StudentClass[], private _isNew: boolean) {
        this.appId = data.appId;
        this.tags = copy(data.tags);
        this.device = copy(data.device);
        this.assignments = data.assignments.map(x => {
            return new ManageAppAssignment({
                ...x,
                id: this.device.id
            }, this.license, this, api, _students.find(y => y.studentId == x.studentId), (item) => this.removeItem(item), false)
        }).filter(x => x.student);
    }

    async setReassigning(val: boolean) {
        this.reassigning = val;
    }

    private removeItem(item: ManageAppAssignment) {
        const index = this.assignments.findIndex(x => x.studentId == item.studentId);
        if (index >= 0) {
            this.assignments.splice(index, 1);
        }
    }

    async addAssignment(studentId: string, fromAssignment: ManageAppAssignment) {
        
        const student = this._students.find(x => x.studentId == studentId);
        const result = await this.api.putStudentAppV2({ 
            studentId: studentId,
            deviceId: this.device.id,
            deviceName: this.device.name,
            dsn: '',
            studentName: student.details.nickname? student.details.nickname : student.details.firstName + ' ' + student.details.lastName,
            groups: fromAssignment?.groups ?? [],
            events: fromAssignment?.behaviors.map(x => {
                const behavior = student.trackables.activeBehaviors.find(b => b.name == x.title);
                if(!behavior) {
                    return;
                }
                return{
                    eventId: behavior.id,
                    track: x.track,
                    abc: x.abc,
                    order: x.order
                };
            }).filter(x => x) ?? [],
        });
        const newItem: MobileDeviceRegistration = {
            id: undefined,
            studentId: studentId,
            name: result.studentName,
            behaviors: result.events.map(x => {
                const behavior = student.trackables.activeBehaviors.find(y => y.id == x.eventId);
                return {
                    id: x.eventId,
                    title: behavior?.name,
                    isDuration: behavior?.isDuration,
                    track: x.track,
                    abc: x.abc,
                    order: x.order,
                    templates: []
                };
            }),
            groups: result.groups,
            timezone: fromAssignment?.timezone,
        };
        newItem.id = result.dsn;
        const assignment = new ManageAppAssignment(newItem, this.license, this, this.api, student, (item) => this.removeItem(item), false);
        
        this.assignments.push(assignment);
        
        if(this._isNew) {
            await this.save();
        }
    }

    async reassign() {
        this.setReassigning(true);
        try {
            await this.api.postUpdateManagedApp({
                tags: this.tags,
                name: this.device.name,
                deviceId: this.device.id,
                license: this.license,
                reassign: true
            });
        } finally {
            this.setReassigning(false);
        }
    }

    async save() {
        await this.api.postUpdateManagedApp({
            tags: this.tags,
            name: this.device.name,
            deviceId: this.device.id,
            license: this.license,
            reassign: false
        });

        this.data.appId = this.appId;
        this.data.assignments = this.assignments.map(x => x.appObject);
        this.data.tags = copy(this.tags);
        this.data.device = copy(this.device);
        this._isNew = false;
    }

    async generateQRCode() {
        if(this.assignments.length == 0) {
            alert('At least one assignment is necessary to generate a QRCode.');
            return;
        }

        await this.assignments[0].app.getToken();
        this._token = this.assignments[0].app.token;
    }
    async clearQRCode() {
        this._token = undefined;
    }
}

export class ManageAppsClass {
    apps: ManageAppClass[];

    private _manageStudents: ManageStudentsClass;

    constructor(private license: string, private api: ApiClientService, private manage: ManageClass) {}

    async load() {
        const [result, manageStudents] = await Promise.all([
            this.api.getManagedApps(this.license),
            this.manage.getStudents()
        ]);
        this._manageStudents = manageStudents;
        this.apps = result.map(x => new ManageAppClass(x, this.license, this.api, manageStudents.students, false));
    }

    async create() {
        const id = uuid.v4();
        let index = 1;
        while(this.apps.find(x => x.device.name == `App ${index}`)) {
            index++;
        }
        
        this.api.postUpdateManagedApp
        const newItem: MobileDevice = {
            device: {
                id: `MLC-${id}`,
                name: `App ${index}`,
            },
            appId: undefined,
            assignments: [],
            tags: []
        };
        const retval = new ManageAppClass(newItem, this.license, this.api, this._manageStudents.students, true);
        this.apps.push(retval);
        return retval;
    }
}
