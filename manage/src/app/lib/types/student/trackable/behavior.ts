import { ApiClientService } from '../../../../services';
import {
    StudentClass, moment, TargetsClass
} from '../..';
import { StudentBehavior, StudentDataPut, ReportData } from '@mytaptrack/types'
import * as _ from 'lodash';

export class StudentBehaviorClass implements Partial<StudentBehavior> {
    id?: string;
    name: string;
    abbreviation?: string;
    isArchived?: boolean;
    isDuration?: boolean;
    managed?: boolean;
    desc?: string;
    daytime?: boolean;
    baseline?: boolean;
    requireResponse?: boolean;
    targetGoals: TargetsClass;
    tags: string[];
    durationStarted?: moment.Moment;
    saving: boolean;
    get duration(): string {
        if(!this.durationStarted) {
            return '';
        }
        const diff = moment().diff(this.durationStarted, 'seconds');
        return this.getDuration(diff);
    }

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

    getCurrentDuration() {
        return this.currentDuration;
    }

    constructor(
            private data: StudentBehavior, 
            private student: StudentClass, 
            private userId: string, 
            private api: ApiClientService) {
        _.merge(this, data);
        if(!data.targets) {
            data.targets = [];
        }
        this.targetGoals = new TargetsClass(JSON.parse(JSON.stringify(data.targets)), this.student.licenseDetails.features?.snapshotConfig);
        if(this.isArchived == undefined) {
            this.isArchived = false;
        }
        if(this.isDuration == undefined) {
            this.isDuration = false;
        }
    }

    private async setSaving(val: boolean) {
        this.saving = val;
    }

    cancel() {
        _.merge(this, this.data);
        this.targetGoals = new TargetsClass(JSON.parse(JSON.stringify(this.data.targets)), this.student.licenseDetails.features.snapshotConfig);
    }

    private toStudentBehavior(): StudentBehavior {
        this.targetGoals.setTargets();
        return {
            id: this.id,
            isArchived: this.isArchived,
            isDuration: this.isDuration,
            baseline: this.baseline,
            requireResponse: this.requireResponse,
            name: this.name,
            tags: this.tags,
            targets: this.targetGoals.dataModel,
            managed: this.managed,
            desc: this.desc,
            daytime: this.daytime,
        };
    }
    async save() {
        this.setSaving(true);
        try {
            let wasBaseline = this.data.baseline;
            if(!this.id) {
                const result = await this.api.putStudentBehaviorV2(this.student.studentId, this.toStudentBehavior());
                this.id = result.id;
                this.student.trackables.addBehavior(this);
            } else {
                await this.api.putStudentBehaviorV2(this.student.studentId, this.toStudentBehavior());
            }
            _.merge(this.data, this);
            this.data.targets = _.clone(this.targetGoals.dataModel);
            if(wasBaseline != this.baseline) {
                this.student.trackables.refreshBehaviorViews();
            }
        } finally {
            this.setSaving(true);
        }
    }

    async archive(archive: boolean) {
        this.setSaving(true);
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
        } finally {
            this.setSaving(false);
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
    async untrackEvent(data: ReportData) {
        this.setSaving(true);
        try {
            await this.api.removeStudentData(this.student.studentId, data);
        } finally {
            this.setSaving(false);
        }
    }

    private getDuration(stat: number) {
        const absState = Math.abs(stat);
        const seconds = Math.floor(absState % 60);
        const minutes = Math.floor(absState/60) % 60;
        const hour = Math.floor(absState / 3600);
    
        if(hour == 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${hour}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}
