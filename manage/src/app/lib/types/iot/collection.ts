import { ApiClientService } from "../../../services";
import { 
    IoTDeviceClass, StudentClass,
    AppClass, TrackClass, moment
} from "..";
import { AccessLevel, IoTAppDevice,  } from '@mytaptrack/types';

export class IoTDeviceCollection {
    private _items: IoTDeviceClass[] = [];
    public get items() { return this._items; }
    public get apps() {
        const retval = this._items.filter(x => x.isApp);
        return retval as AppClass[];
    }
    get length() { return this._items.length; }

    constructor(private api: ApiClientService, private student: StudentClass) {
    }

    private async onAddDevice(item: IoTDeviceClass) {
        if(!this._items.find(x => x == item)) {
            this._items.push(item);
        }
    }
    private async onRemoveDevice(item: IoTDeviceClass) {
        const index = this._items.findIndex(x => x == item);
        if(index >= 0) {
            this._items.splice(index, 1);
        }
    }
    find(predicate: (val: IoTDeviceClass) => boolean) {
        return this._items.find(predicate);
    }
    map(callbackfn: (value: IoTDeviceClass, index: number, array: IoTDeviceClass[]) => unknown) {
        return this._items.map(callbackfn);
    }
    filter(predicate: (value: IoTDeviceClass, index: number, array: IoTDeviceClass[]) => boolean) {
        return this._items.filter(predicate);
    }
    async load() {
        if(this.student.restrictions.devices == AccessLevel.none) {
            return;
        }
        
        try {
            const devices = await this.api.getStudentDevicesV2(this.student.studentId);
            
            const managedItems = devices.map(x => {
                if (x.isApp) {
                    return new AppClass(x as IoTAppDevice, this.student, this.api, (val) => { this.onAddDevice(val); }, (val) => { this.onRemoveDevice(val); });
                } else {
                    return new TrackClass(x, this.student, this.api, (val) => { this.onAddDevice(val); }, (val) => { this.onRemoveDevice(val); });
                }
            });
            this._items.push(...managedItems);
        } catch (error) {
            console.error('Failed to load student devices:', error);
            // Optionally show user-friendly error message
            // You could emit an event or set a flag here to show an error message in the UI
        }
    }

    public addTrack2(): TrackClass {
        let name = 'Track 2.0 (1)';
        for(let i = 2; this.items.find(x => x.deviceName == name); i++) {
            name = `Track 2.0 (${i})`;
        }
        return new TrackClass({
            dsn: '',
            deviceName: name,
            license: this.student.license,
            studentId: this.student.studentId,
            timezone: moment.tz.guess(),
            events: [],
            isApp: false,
            multiStudent: true,
            commands: [{ studentId: this.student.studentId, term: '' }]
        }, this.student, this.api, (val) => { this.onAddDevice(val); }, (val) => { this.onRemoveDevice(val); });
      }
      public async addApp(deviceName: string): Promise<AppClass> {
        const retval = new AppClass({
          dsn: '',
          deviceId: '',
          deviceName,
          studentId: this.student.studentId,
          studentName: this.student.details.firstName + ' ' + this.student.details.lastName,
          license: this.student.license,
          timezone: moment.tz.guess(),
          events: [],
          groups: [],
          isApp: true,
          multiStudent: false,
          commands: []
        }, this.student, this.api, (val) => { this.onAddDevice(val); }, (val) => { this.onRemoveDevice(val); });
        return retval;
    }
}
