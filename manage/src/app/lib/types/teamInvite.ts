import { ApiClientService } from "../../services";
import { 
    UserClass, moment
} from '.';
import { Notification, NotificationDetailsTeam } from '@mytaptrack/types';

export class TeamInviteClass {
    date: moment.Moment;
    details: NotificationDetailsTeam;

    constructor(private data: Notification<NotificationDetailsTeam>, private api: ApiClientService, private user: UserClass) {
        this.date = moment(data.date);
        this.details = data.details;
    }

    async accept() {
        const result = await this.api.acceptTeamMemberInvite(this.details.studentId, this.date.toDate().getTime());
        this.user.students = [
            {
                studentId: this.details.studentId,
                firstName: this.details.firstName,
                lastName: this.details.lastName,
                tags: result.tags,
                displayTags: [],
                alertCount: 0,
                awaitingResponse: false
            },
            ...this.user.students
        ];
        const inviteIndex = this.user.teamInvites.findIndex(x => x == this);
        this.user.teamInvites.splice(inviteIndex, 1);
        this.user.loadStudent(this.details.studentId);
    }

    async decline() {
        await this.api.ignoreTeamInvite(this.details.studentId, this.date.toDate().getTime());
        const inviteIndex = this.user.teamInvites.findIndex(x => x == this);
        this.user.teamInvites.splice(inviteIndex, 1);
        this.user.studentsChanged.next(this.user.students);
    }
}
