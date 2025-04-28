import { ApiClientService } from "../../../services";
import { 
    StudentClass, IoTDeviceClass, moment 
} from "..";
import { DevicePutRequestEvent, IoTDevice } from '@mytaptrack/types';

export class TrackClass extends IoTDeviceClass {
    private verifyStartTime: moment.Moment;
    private verifyInterval?: NodeJS.Timer | number;

    isRegistered: boolean;

    private get termCommand() {
        const command = this.commands.find(x => x.studentId == this.studentId);
        return command;
    }

    get term() {
        return this.termCommand?.term;
    }
    get isVerified(): boolean {
        if(!this.validated && !this.verifyStartTime) {
            this.verifyStartTime = moment();
            this.verifyInterval = setInterval(() => { this.verifyRegistration(); }, 5000);
        }
        return this.validated;
    }
    constructor(source: IoTDevice, student: StudentClass, api: ApiClientService, onAdd: (item: IoTDeviceClass) => void, onRemove: (item: IoTDeviceClass) => void) {
        super(source, student, api, onAdd, onRemove);
        if(!source.dsn) {
            this.isRegistered = false;
        }
    }

    private async verifyRegistration() {
        if(!this.verifyStartTime || moment().add(-10, 'second').isAfter(this.verifyStartTime)) {
            clearInterval(this.verifyInterval as number);
            delete this.verifyStartTime;
            return;
        }

        await this.refresh();
    }

    async register() {
        if(this.validated) {
            throw new Error('Device already registered');
        }
        this.setSaving(true);
        try {
            await this.api.putTrackRegistrationV2({
                dsn: this.dsn,
                studentId: this.studentId
            });
            this.isRegistered = true;
            this.validated = false;
        } finally {
            this.setSaving(true);
        }
    }

    async save(): Promise<void> {
        this.setSaving(true);
        try {
            await this.api.putTrackDeviceV2({
                dsn: this.dsn,
                studentId: this.studentId,
                deviceName: this.deviceName,
                timezone: moment.tz.guess(),
                events: this.events.map(x => ({
                    eventId: x.eventId,
                    presses: x.presses,
                    order: x.presses
                } as DevicePutRequestEvent))
            });

            this.source.events = JSON.parse(JSON.stringify(this.events));
        } finally {
            this.setSaving(false);
        }
    }
    async refresh(): Promise<void> {
        this.setLoading(true);
        try {
            this.source = await this.api.getTrackDeviceV2(this.studentId, this.dsn);
            const studentId = this.studentId;
            const wasVerified = this.validated;
            Object.keys(this.source).forEach(x => this[x] = this.source[x]);
            this.studentId = studentId;
            if(this.source.events) {
                this.events = JSON.parse(JSON.stringify(this.source.events));
            } else {
                this.events = [
                    { eventId: '', presses: 1 },
                    { eventId: '', presses: 2 },
                    { eventId: '', presses: 3 },
                    { eventId: '', presses: 4 },
                    { eventId: '', presses: 5 }
                ];
            }
            this.subscriptions = this.source.subscriptions? JSON.parse(JSON.stringify(this.source.subscriptions)) : undefined;
            this.commands = this.source.commands? JSON.parse(JSON.stringify(this.source.commands)) : [ {studentId: this.studentId, term: '' }];

            if(!wasVerified && this.validated) {
                this.onAdd(this);
                await this.save();
            }
        } finally {
            this.setLoading(false);
        }
    }

    async delete() {
        this.setSaving(true);
        try {
            await this.api.deleteTrackDeviceV2({
                dsn: this.dsn,
                studentId: this.studentId
            });
            this.onRemove(this);
        } finally {
            this.setSaving(false);
        }
    }

    async putTermSetup(): Promise<void> {
        this.setLoading(true);
        try {
            await this.api.putTrackTermSetupV2({
                dsn: this.dsn,
                studentId: this.studentId
            });
        } finally {
            this.setLoading(false);
        }
    }
    async getTermStatus(): Promise<{termSet: boolean, term: string}> {
        this.setLoading(true);
        try {
            const status = await this.api.getTrackTermSetupV2(this.studentId, this.dsn);
            if(status && status.termSet == false) {
                this.termCommand.term = status.term;
            }
            return status;
        } finally {
            this.setLoading(false);
        }
    }

    async resyncSecurity() {
        this.setSaving(true);
        try {
            await this.api.postTrackResyncV2({
                dsn: this.dsn,
                studentId: this.studentId
            });    
        } finally {
            this.setSaving(false);
        }
    }
}