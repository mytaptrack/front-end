import * as _ from "lodash";
import { SubscriptionsClass } from "../..";
import { StudentSubscriptionsGroup } from '@mytaptrack/types'

export class SubscriptionGroupClass implements StudentSubscriptionsGroup {
    name: string;
    behaviorIds: string[];
    responseIds: string[];
    notifyUntilResponse: boolean;
    userIds: string[];
    emails: string[];
    mobiles: string[];
    deviceIds: string[];
    messages: { default?: string; email?: string; text?: string; app?: string; };

    constructor(private data: StudentSubscriptionsGroup, private parent: SubscriptionsClass, public isNew: boolean) {
        const cpy = JSON.parse(JSON.stringify(data));
        _.merge(this, cpy);
    }

    get hasChanged(): boolean {
        return !_.isEqual(this.data, this);
    }

    get group(): StudentSubscriptionsGroup {
        return {
            name: this.name,
            behaviorIds: this.behaviorIds,
            responseIds: this.responseIds,
            notifyUntilResponse: this.notifyUntilResponse,
            userIds: this.userIds,
            emails: this.emails,
            mobiles: this.mobiles,
            deviceIds: this.deviceIds,
            messages: this.messages
        };
    }

    cancel() {
        const cpy = JSON.parse(JSON.stringify(this.data));
        _.merge(this, cpy);
    }

    async delete() {
        const index = this.parent.items.findIndex(x => x == this);
        if(index >= 0) {
            const isNew = this.isNew;
            this.parent.items.splice(index, 1);
            if(!isNew) {
                await this.parent.save();
            }
        }
    }
}