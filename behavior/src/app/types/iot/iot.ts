import { 
    IoTDeviceEvent, IoTDeviceSubscription, CommandSwitchStudent,
    BehaviorCalculation, IoTDevice, StudentClass
} from '..';
import { ApiClientService } from '../../services';
import * as _ from 'lodash';

export abstract class IoTDeviceClass implements IoTDevice {
    dsn: string;
    studentId: string;
    license: string;
    studentName: string;
    deviceName: string;
    events: IoTDeviceEvent[];
    timezone: string;
    isApp: boolean;
    deleted?: boolean;
    validated?: boolean;
    multiStudent: boolean;
    subscriptions?: IoTDeviceSubscription[];
    termSetup?: boolean;
    commands: CommandSwitchStudent[];
    saving: boolean;
    loading: boolean;
    isNew: boolean;

    public get calculation(): BehaviorCalculation {
        const setting = this.student.dashboard.devices.find(x => x.id === this.dsn);
        if(!setting) {
            return BehaviorCalculation.Pooled;
        }
        return setting.calculation;
    }
    public set calculation(val: BehaviorCalculation) {
        const setting = this.student.dashboard.devices.find(x => x.id === this.dsn);
        if(!setting) {
            this.student.dashboard.devices.push({ name: this.deviceName, id: this.dsn, calculation: val });
        } else {
            setting.calculation = val;
        }
    }

    constructor(protected source: IoTDevice, protected student: StudentClass, protected api: ApiClientService, protected onAdd: (item: IoTDeviceClass) => void, protected onRemove: (item: IoTDeviceClass) => void) {
        Object.keys(this.source).forEach(x => this[x] = this.source[x]);
        this.events = JSON.parse(JSON.stringify(this.source.events));
        this.subscriptions = this.source.subscriptions? JSON.parse(JSON.stringify(this.source.subscriptions)) : undefined;
        this.commands = this.source.commands? JSON.parse(JSON.stringify(this.source.commands)) : undefined;
        this.isNew = !this.dsn;
    }

    protected copySource() {
        Object.keys(this.source).forEach(x => this[x] = this.source[x]);
        this.events = JSON.parse(JSON.stringify(this.source.events));
        this.subscriptions = this.source.subscriptions? JSON.parse(JSON.stringify(this.source.subscriptions)) : undefined;
        this.commands = this.source.commands? JSON.parse(JSON.stringify(this.source.commands)) : undefined;
    }

    cancel() {
        this.copySource();
    }

    protected async setSaving(val: boolean) {
        this.saving = val;
    }
    protected async setLoading(val: boolean) {
        this.loading = val;
    }

    abstract save(): Promise<void>;
    abstract refresh(): Promise<void>;

    protected hasChanged() {
        const index = Object.keys(this.source).findIndex(key => !_.isEqual(this[key], this.source[key]));
        if(index >= 0) {
            return true;
        }

        if(this.events.length !== this.source.events.length) {
            return true;
        }
        const notEqual = this.events.find(x => !_.isEqual(x, this.source.events.find(y => y.eventId === x.eventId)));
        if(notEqual) {
            return true;
        }
        return false;
    }
}
