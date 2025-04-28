import { ApiClientService } from "../../../../services";
import { StudentClass, SubscriptionGroupClass } from "..";

export class SubscriptionsClass {
    private _items: SubscriptionGroupClass[];
    private updateEpoc: number = 0;
    get items() { return this._items; }

    constructor(private student: StudentClass, private api: ApiClientService) {
    }

    async load() {
        const response = await this.api.getSubscriptions(this.student.studentId);
        this.updateEpoc = response.updateEpoc || 0;
        this._items = response?.notifications.map(x => new SubscriptionGroupClass(x, this, false)) || [];
    }

    create() {
        let name = 'Notification';
        let index = 2;
        while(this._items.find(x => x.name == name)) {
            name = 'Notification ' + index;
            index++;
        }
        const retval = new SubscriptionGroupClass({
            name,
            behaviorIds: [],
            responseIds: [],
            notifyUntilResponse: false,
            emails: [],
            mobiles: [],
            userIds: [],
            deviceIds: [],
            messages: {
                default: `An event has occurred for {FirstName}.
To find out more log into mytaptrack.com for details.`,
                email: '',
                text: '',
                app: ''
            }
        }, this, true);

        this._items.push(retval);
        return retval;
    }

    async save() {
        if(!this._items.find(x => x.hasChanged || x.isNew)) {
            return;
        }

        await this.api.putSubscriptions({
            studentId: this.student.studentId,
            license: this.student.license,
            notifications: this._items.map(x => x.group),
            updateEpoc: this.updateEpoc
        });
        this._items.forEach(x => x.isNew = false);
    }
}