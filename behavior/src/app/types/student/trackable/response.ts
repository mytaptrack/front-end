import { ApiClientService } from '../../../services';
import {
    StudentClass, MeasurementType, StudentResponse,
    StudentResponseSetting,
    StudentDataPut, moment
} from '../..';
import * as _ from 'lodash';

export class StudentResponseClass implements StudentResponse {
    id?: string;
    name: string;
    isArchived?: boolean;
    isDuration?: boolean;
    managed?: boolean;
    desc?: string;
    daytime?: boolean;
    requireResponse?: boolean;
    targets?: { 
        targetType: string;
        target: number;
        progress?: number;
        measurement: MeasurementType;
        measurements: {
            name: string;
            value: number;
        }[];
    }[];
    tags: string[];
    appliedToBehaviors: StudentResponseSetting[];
    durationStarted?: moment.Moment;
    saving: boolean;

    get currentDuration(): string {
        if(!this.durationStarted) {
            return;
        }
        const diff = moment().diff(this.durationStarted, 'seconds');
        const hours = Math.floor(diff / 60 / 60).toString().padStart(2, '0');
        const minutes = Math.floor(diff % (60*60) / 60).toString().padStart(2, '0');
        const seconds = Math.floor(diff % 60).toString().padStart(2, '0');

        return `${hours}:${minutes}:${seconds}`;
    }

    constructor(private data: StudentResponse, private student: StudentClass, private userId: string, private api: ApiClientService) {
        if(!data) {
            this.data = {
                name: '',
                tags: []
            };
        }
        _.merge(this, data);
        if(!this.appliedToBehaviors) {
            this.appliedToBehaviors = [];
        }
    }

    private async setSaving(val: boolean) {
        this.saving = val;
    }

    cancel() {
        _.merge(this, this.data);
    }

    private toStudentResponse(): StudentResponse {
        return {
            id: this.id,
            isArchived: this.isArchived,
            isDuration: this.isDuration,
            requireResponse: this.requireResponse,
            name: this.name,
            tags: this.tags,
            targets: this.targets,
            managed: this.managed,
            desc: this.desc,
            daytime: this.daytime,
        };
    }
    async save() {
        if(!this.id) {
            const result = await this.api.putStudentResponseV2(this.student.studentId, this.toStudentResponse());
            this.id = result.id;
            this.student.trackables.addResponse(this);
        } else {
            await this.api.putStudentResponseV2(this.student.studentId, this.toStudentResponse());
        }
        _.merge(this.data, this);
    }

    async archive(archive: boolean) {
        const original = this.isArchived;
        try {
            this.isArchived = archive;
            if(archive) {
                const devices = await this.student.getDevices();
                await Promise.all(devices.items.map(async x => {
                    const index = x.events.findIndex(x => x.eventId == this.id);
                    if(index >= 0) {
                        x.events[index].track = false;
                        x.events[index].alert = false;
                        await x.save();
                    }
                }));
            }
            await this.save();
        } catch(err) {
            this.isArchived = original;
        }
        this.student.trackables.refreshBehaviorViews();    
    }

    async trackEvent(date: moment.Moment = moment(), abc?: { a: string, c: string }) {
        this.setSaving(true);
        try {
            const data: StudentDataPut = {
                studentId: this.student.studentId,
                behaviorId: this.id,
                eventDate: date.toISOString(),
                abc
            };
            await this.api.putStudentDataV2(data);
            await this.student.reports.addDataToReport({
                dateEpoc: date.toDate().getTime(),
                behavior: this.id,
                isManual: true,
                source: {
                    device: 'website',
                    rater: this.userId
                }
            });

            if(this.isDuration) {
                if(!this.durationStarted) {
                    this.durationStarted = date.clone();
                } else {
                    delete this.durationStarted;
                }    
            }
        } finally {
            this.setSaving(false);
        }
    }
}