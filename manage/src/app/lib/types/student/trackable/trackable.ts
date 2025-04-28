import { ApiClientService } from '../../../../services';
import {
    StudentClass, StudentBehaviorClass, StudentResponseClass, moment
} from '../..';
import { StudentBehavior, StudentResponse, Student } from '@mytaptrack/types'
import * as _ from 'lodash';

export class StudentTrackableCollection {
    behaviors: StudentBehaviorClass[];
    activeBehaviors: StudentBehaviorClass[];
    archivedBehaviors: StudentBehaviorClass[];
    baselineBehaviors: StudentBehaviorClass[];

    responses: StudentResponseClass[];
    activeResponses: StudentResponseClass[];
    archivedResponses: StudentResponseClass[];

    constructor(private student: StudentClass, studentData: Student, private userId: string, private api: ApiClientService) {
        if(!studentData.behaviors) {
            studentData.behaviors = [];
        }
        this.behaviors = studentData.behaviors.map(x => new StudentBehaviorClass(x, this.student, this.userId, api));
        if (this.behaviors) {
            this.behaviors.sort((a, b) => a.name.localeCompare(b.name));
        }
        this.refreshBehaviorViews();
        if(!studentData.responses) {
            studentData.responses = [];
        }
        this.responses = studentData.responses.map(x => new StudentResponseClass(x, this.student, this.userId, api));
        if (this.responses) {
            this.responses.sort((a, b) => a.name.localeCompare(b.name));
        }
        this.refreshResponseViews();
    }

    refreshBehaviorViews() {
        this.activeBehaviors = this.behaviors.filter(x => !x.isArchived && !x.baseline);
        this.archivedBehaviors = this.behaviors.filter(x => x.isArchived);
        this.baselineBehaviors = this.behaviors.filter(x => x.baseline);
    }
    private refreshResponseViews() {
        this.activeResponses = this.responses.filter(x => !x.isArchived);
        this.archivedResponses = this.responses.filter(x => x.isArchived);
    }

    async refreshTrackingStatus() {
        const results = await this.api.getDurationStatus(this.student.studentId);

        results.behaviorStates.forEach(x => {
            const behavior = this.behaviors.find(y => y.id == x.behaviorId);
            if(behavior.durationStarted) {
                return;
            }
            if(behavior) {
                if(!x.started) {
                    delete behavior.durationStarted;
                } else {
                    behavior.durationStarted = moment(behavior.currentDuration);
                }
            }
        })
    }

    async addBehavior(data?: StudentBehavior) {
        if(data instanceof StudentBehaviorClass) {
            this.behaviors.push(data);
            this.behaviors.sort((a, b) => a.name.localeCompare(b.name));
            this.refreshBehaviorViews();
            return data;
        }
        const retval = new StudentBehaviorClass(data, this.student, this.userId, this.api);
        return retval;
    }
    async addResponse(data?: StudentResponse) {
        if(data instanceof StudentResponseClass) {
            this.responses.push(data);
            this.responses.sort((a, b) => a.name.localeCompare(b.name));
            this.refreshResponseViews();
        }
        const retval = new StudentResponseClass({ name: data.name, tags: data.tags }, this.student, this.userId, this.api);
        return retval;
    }

    getBehaviorName(behaviorId: string): string {
        let bresult = this.behaviors.find(x => x.id === behaviorId);
        if (bresult) {
            return bresult.name;
        }

        const rresult = this.responses.find(x => x.id === behaviorId);
        if (rresult) {
            return 'Response: ' + rresult.name;
        }

        return behaviorId;
    }
}