import { ApiClientService } from "../../../services";
import { 
    StudentClass, UserClass
} from "..";
import {
    UserSummary, UserSummaryStatus, TeamRole, 
    UserSummaryRestrictions, AccessLevel, 
} from '@mytaptrack/types'
import * as _ from 'lodash';

export class TeamMember implements UserSummary {
    userId: string;
    status: UserSummaryStatus;
    details: { email: string; name: string; };
    version: number;
    restrictions: UserSummaryRestrictions;
    get studentId() { return this._studentId; }

    constructor(private data: UserSummary, private team: TeamClass, private _studentId: string, private api: ApiClientService) {
        this.userId = data.userId;
        this.status = data.status;
        this.details = _.cloneDeep(data.details);
        this.version = data.version;
        this.restrictions = _.cloneDeep(data.restrictions);
    }

    async save() {
        if(this.restrictions.behaviors && this.restrictions.behaviors.length == 0) {
            delete this.restrictions.behaviors;
        }
        const summary = await this.api.putTeamMember(this._studentId, this.userId, this.details, this.restrictions, !this.userId);
        const team = await this.team.getTeam();
        if (!this.userId) {
            this.userId = summary.userId;
            this.details.name = this.details.email;
            team.push(this);
        }
    }

    cancel() {
        _.merge(this, this.data);
    }

    async remove() {
        await this.api.removeTeamMember(this.studentId, this.userId);
        const team = await this.team.getTeam();
        const index = team.findIndex(x => x.userId == this.userId);
        if(index >= 0) {
            team.splice(index, 1);
        }
    }
}

export class TeamClass {
    private _teamCache: Promise<TeamMember[]>;

    constructor(private user: UserClass, private student: StudentClass, private api: ApiClientService) {

    }

    public async getTeam() {
        if (!this._teamCache) {
            if(this.student.restrictions.team == AccessLevel.none) {
                this._teamCache = Promise.resolve([]);
                return;
            }
            this._teamCache = this.api.getStudentTeamMembers(this.student.studentId)
                .then(result => {
                    return result.map(member => new TeamMember(member, this, this.student.studentId, this.api));
                })
                .catch(err => {
                    console.error(err);
                    return [];
                });
        }
        return await this._teamCache;
    }

    async find(findParam: (item, index) => boolean) {
        const team = await this.getTeam();
        return team.find(findParam);
    }

    async getFromId(id: string) {
        const team = await this.getTeam();
        return team.find(m => m.userId == id);
    }

    createTeamMember() {
        return new TeamMember({ 
            restrictions: {
              devices: AccessLevel.read,
              team: AccessLevel.read,
              data: AccessLevel.read,
              documents: AccessLevel.read,
              schedules: AccessLevel.read,
              comments: AccessLevel.read,
              behavior: AccessLevel.read,
              abc: AccessLevel.read,
              notifications: AccessLevel.none,
              milestones: AccessLevel.read,
              reports: AccessLevel.read,
              transferLicense: false
            },
            details: { 
              email: ''
            } as any,
            studentId: this.student.studentId,
            userId: null,
            status: UserSummaryStatus.PendingVerification,
            version: 4
          } as UserSummary, this, this.student.studentId, this.api);
    }

    async removeTeamMember(userId: string) {
        await this.api.removeTeamMember(this.student.studentId, userId);
        const team = await this.getTeam();
        const index = team?.findIndex(x => x.userId == userId);
        if (index >= 0) {
            team.splice(index, 1);
        }
        if (userId == this.user.userId) {
            this.user.removeStudent(this.student.studentId);
        }
    }

}