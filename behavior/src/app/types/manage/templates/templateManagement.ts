import { ApiClientService } from "../../../services";
import { LicenseDetails, StudentTemplate } from "../..";

export class ManageTemplates {
    students: StudentTemplate[];

    constructor(private license: LicenseDetails, private api: ApiClientService) {
        this.students = license.studentTemplates?.map(x => new StudentTemplate(
                x,
                license,
                this.api,
                (data) => { this.students.push(data); },
                (t) => { this.removeTemplate(t) })) ?? [];
    }

    private removeTemplate(template: StudentTemplate) {
        const index = this.students.indexOf(template);
        if(index >= 0) {
            this.students.splice(index, 1);
        }
    }


    addNewTemplate() {
        const retval = new StudentTemplate(
            {
                name: '',
                desc: '',
                behaviors: [],
                responses: [],
                tags: [],
                appTemplates: []
            },
            this.license,
            this.api,
            (data) => { this.students.push(data); },
            (t) => { this.removeTemplate(t) });
        this.students.push(retval);
        return retval;
    }
}