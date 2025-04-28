import { ApiClientService } from "../../services";
import { NotificationDetailsBehavior, Notification, StudentClass, moment } from "..";

export class StudentNotification implements Notification<NotificationDetailsBehavior> {
    private _date: moment.Moment;

    date: number;
    get dateString(): string {
        return this._date.format("MM/DD/YYYY hh:mm:ss A");
    }
    details: NotificationDetailsBehavior;

    constructor(private student: StudentClass, private data: Notification<NotificationDetailsBehavior>, private api: ApiClientService) {
        this.date = data.date;
        this._date = moment(data.date);
        this.details = data.details;
    }

    async ignore() {
        await this.api.ignoreNotification(this.data);
        const array = await this.student.getNotifications();
        const index = array.findIndex(x => x == this);
        array.splice(index, 1);
    }
}