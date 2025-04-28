import { ApiClientService } from "../../services";
import { copy, IoTAppDevice, StudentClass, IoTDeviceClass } from "..";

export class AppClass extends IoTDeviceClass {
    token: string;
    deviceId: string;
    groups: string[];
    textAlerts: boolean;

    constructor(source: IoTAppDevice, student: StudentClass, api: ApiClientService, onAdd: (item: IoTDeviceClass) => void, onRemove: (item: IoTDeviceClass) => void) {
        super(source, student, api, onAdd, onRemove);
        if(!source.groups) {
            source.groups = [];
        }
        this.studentId = student?.studentId ?? source.studentId;
        this.groups = copy(source.groups);
        this.textAlerts = source.textAlerts ?? true;
    }

    toAppObject(): IoTAppDevice {
        return {
            ...this.source,
            dsn: this.dsn,
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            studentId: this.studentId,
            studentName: this.studentName,
            textAlerts: this.textAlerts,
            groups: this.groups ?? [],
            events: this.events.map(x => ({
                eventId: x.eventId,
                abc: x.abc,
                alert: x.alert,
                track: x.track,
                order: x.order
            }))
        };
    }

    async save() {

        if(!this.hasChanged()) {
            console.debug('Nothing to save');
            return;
        }
        this.setSaving(true);
        try {
            const result = await this.api.putStudentAppV2({
                dsn: this.dsn,
                deviceId: this.deviceId,
                deviceName: this.deviceName,
                studentId: this.studentId,
                studentName: this.studentName,
                textAlerts: this.textAlerts,
                groups: this.groups ?? [],
                events: this.events.map(x => ({
                    eventId: x.eventId,
                    abc: x.abc,
                    alert: x.alert,
                    track: x.track,
                    order: x.order
                }))
            });
            if(this.isNew) {
                this.onAdd(this);
            }
            if(!result.groups) {
                result.groups = [];
            }
            this.source = result;
            this.dsn = result.dsn;
            this.deviceId = result.deviceId;
            this.copySource();
            this.groups = copy(result.groups ?? []);
            this.isNew = false;
        } finally {
            this.setSaving(false);
        }
    }

    async delete() {
        this.setSaving(true);
        try {
            await this.api.deleteStudentAppV2(this.studentId, this.dsn);
            this.onRemove(this);
        } finally {
            this.setSaving(false);
        }
    }

    async getToken() {
        this.setLoading(true);
        try {
            const result = await this.api.getStudentAppTokenV2(this.studentId, this.dsn);
            this.token = result.token;    
        } finally {
            this.setLoading(false);
        }
    }

    hideToken() {
        this.token = '';
    }

    async refresh() {
        this.setLoading(true);
        try {
            const result = await this.api.getStudentAppV2(this.studentId, this.dsn, this.deviceId);
            this.source = result;
            Object.keys(this.source).forEach(x => this[x] = this.source[x]);
        } finally {
            this.setLoading(false);
        }
    }
}
