import { ApiClientService } from "../../../../services";
import { StudentTemplateBehaviorClass } from "../..";
import { LicenseDetails, LicenseStudentTemplate, } from '@mytaptrack/types';

export class StudentTemplateTrackables {
    behaviors: StudentTemplateBehaviorClass[];
    get activeBehaviors() { return this.behaviors.filter(x => x.id); };
    archivedBehaviors: StudentTemplateBehaviorClass[];

    private _responses: StudentTemplateBehaviorClass[];
    get responses() { return this._responses; }
    get activeResponses() { return this.responses.filter(x => x.id); }
    archivedResponses: StudentTemplateBehaviorClass[];

    constructor(private studentData: LicenseStudentTemplate, private license: LicenseDetails, private api: ApiClientService) {
        if(!studentData.behaviors) {
            studentData.behaviors = [];
        }
        this.behaviors = studentData.behaviors.map(x => new StudentTemplateBehaviorClass(x, this.license.features.snapshotConfig, (item) => { this.removeBehavior(item); }));
        if (this.behaviors) {
            this.behaviors.sort((a, b) => a.name.localeCompare(b.name));
        }
        this.refreshBehaviorViews();
        if(!studentData.responses) {
            studentData.responses = [];
        }
        this._responses = studentData.responses.map(x => new StudentTemplateBehaviorClass(x, this.license.features.snapshotConfig, (item) => { this.removeResponse(item); }));
        if (this._responses) {
            this._responses.sort((a, b) => a.name.localeCompare(b.name));
        }
        this.archivedResponses = [];
        this.archivedBehaviors = [];
        this.refreshResponseViews();
    }

    refreshBehaviorViews() {
    }
    private refreshResponseViews() {
    }
    async addBehavior(data?: StudentTemplateBehaviorClass) {
        if(data) {
            this.behaviors.push(data);
            this.behaviors.sort((a, b) => a.name.localeCompare(b.name));
            this.refreshBehaviorViews();
            return data;
        }
        const retval = new StudentTemplateBehaviorClass({ name: '', desc: '' }, this.license.features.snapshotConfig, (item) => { this.removeBehavior(item); });
        this.behaviors.push(retval);
        return retval;
    }
    async addResponse(data?: StudentTemplateBehaviorClass) {
        if(data instanceof StudentTemplateBehaviorClass) {
            this._responses.push(data);
            this._responses.sort((a, b) => a.name.localeCompare(b.name));
            this.refreshResponseViews();
            return data;
        }
        const retval = new StudentTemplateBehaviorClass({ name: '', desc: '' }, this.license.features.snapshotConfig, (item) => { this.removeResponse(item); });
        this._responses.push(retval);
        return retval;
    }

    getBehaviorName(behaviorId: string): string {
        let bresult = this.behaviors.find(x => x.id === behaviorId);
        if (bresult) {
            return bresult.name;
        }

        const rresult = this._responses.find(x => x.id === behaviorId);
        if (rresult) {
            return 'Response: ' + rresult.name;
        }

        return behaviorId;
    }

    removeBehavior(behavior: StudentTemplateBehaviorClass) {
        this.behaviors.splice(this.behaviors.indexOf(behavior), 1);
        this.refreshBehaviorViews();
    }
    removeResponse(response: StudentTemplateBehaviorClass) {
        this._responses.splice(this._responses.indexOf(response), 1);
        this.refreshBehaviorViews();
    }
}
