import { LicenseAppTemplate, AccessLevel } from '@mytaptrack/types';
import { ApiClientService } from '../../../services';
import { 
    LicenseStudentTemplate, UserSummaryRestrictions, LicenseDetails,
    AppTemplateCollection, StudentTemplateTrackables
} from '../..';

export function copy<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
}

export class StudentTemplate {
    private _restrictions: UserSummaryRestrictions = {
        behavior: AccessLevel.admin,
        milestones: AccessLevel.admin,
        schedules: AccessLevel.admin,
        abc: AccessLevel.admin,
        team: AccessLevel.admin,
        devices: AccessLevel.admin,
        data: AccessLevel.admin,
        comments: AccessLevel.admin,
        reports: AccessLevel.admin,
        notifications: AccessLevel.admin,
        documents: AccessLevel.admin,
        info: AccessLevel.admin, 
        service: AccessLevel.admin, 
        serviceData: AccessLevel.admin, 
        serviceGoals: AccessLevel.admin, 
        serviceSchedule: AccessLevel.admin
    };

    private _name: string;
    get name() { return this._name; }
    set name(value: string) {
        this._name = value;
        this.tags = value? ['Program:' + this._name] : [];
    }
    get tag() { return this.tags.join(','); }
    tags: string[];
    desc: string;
    trackables: StudentTemplateTrackables;
    appTemplates: LicenseAppTemplate[];
    devices: AppTemplateCollection;
    isNew: boolean;
    get licenseDetails() { return this._licenseDetails; }
    get studentId() { return 'N/A'; }
    get restrictions() { return this._restrictions; }

    constructor(
        private template: LicenseStudentTemplate,
        private _licenseDetails: LicenseDetails,
        private api: ApiClientService, 
        private addTemplate: (template: StudentTemplate) => void, 
        private removeTemplate: (template: StudentTemplate) => void) {
        this.trackables = new StudentTemplateTrackables(template, this.licenseDetails, api);
        this.cancel();
        this.devices = new AppTemplateCollection(this);
    }

    async getDevices() {
        return this.devices;
    }

    private toStudentTemplate(): LicenseStudentTemplate {
        return {
            name: this.name,
            desc: this.desc,
            behaviors: this.trackables.behaviors.filter(x => x.name).map(x => x.toStudentTemplateBehavior()),
            responses: this.trackables.responses.filter(x => x.name).map(x => x.toStudentTemplateBehavior()),
            appTemplates: this.devices.appTemplates,
            tags: this.tags
        };
    }

    async save() {
        const template = this.toStudentTemplate();
        await this.api.putManagedTemplate({
            license: this.licenseDetails.license,
            originalName: this.template.name,
            ...template
        });
        this.template = template;
        if(this.isNew) {
            this.addTemplate(this);
        }
    }

    cancel() {
        this.name = this.template.name;
        this.desc = this.template.desc;
        this.trackables = new StudentTemplateTrackables(this.template, this.licenseDetails, this.api);
        this.appTemplates = copy(this.template.appTemplates);
        this.tags = copy(this.template.tags);
    }

    async delete() {
        await this.api.deleteManagedTemplate({
            license: this.licenseDetails.license,
            name: this.template.name
        });
        this.removeTemplate(this);
    }
}