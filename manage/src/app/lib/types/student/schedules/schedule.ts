import { ApiClientService, DateTimeService } from '../../../../services';
import {
    ActivityGroupDetails,
    Activity, ReportData
} from '@mytaptrack/types';
import { moment } from '../..';
import * as _ from 'lodash';

export interface ActivityData extends Activity {
    title: string;
    data: Array<ScheduledReportData>;
}

export interface ScheduledReportData extends ReportData {
    isDuration?: boolean;
    isStart?: boolean;
    duration?: number;
    occurance?: number;
}

export interface ScheduleValidationError {
    titleError: string;
    startError: string;
    endError: string;
}

// const dateTimeService = new DateTimeService();

export class ScheduleClass implements ActivityGroupDetails {
    activities: Activity[];
    name: string;
    applyDays: number[];
    deleted?: boolean;
    dateTimeService = new DateTimeService();

    addCallback: (val: ScheduleClass) => void;
    removeCallback: (val: ScheduleClass) => void;
    private _isNew: boolean;
    get isNew() { return this._isNew; }

    private _startDate: string;
    get startDate(): string {
        return this._startDate;
    }
    set startDate(val: string) {
        this._startDate = val;
        this._start = val? moment(val) : moment(new Date(1970, 1, 1));
    }
    
    private _start: moment.Moment;
    get start(): moment.Moment {
        return this._start;
    } 
    set start(val: moment.Moment) {
        this.startDate = val.format('yyyy-MM-DD');
        this._start = val.clone();
    }

    constructor(private data: ActivityGroupDetails, private studentId: string, private api: ApiClientService, isNew: boolean = false) {
        this._isNew = isNew;
        _.merge(this, data);
    }

    clone(): ScheduleClass {
        const details = this.toDetails();
        const retval = new ScheduleClass(this.toDetails(), this.studentId, this.api, true);
        retval.addCallback = this.addCallback;
        retval.removeCallback = this.removeCallback;
        return retval;
    }

    toDetails(): ActivityGroupDetails {
        return JSON.parse(JSON.stringify({
            activities: this.activities,
            name: this.name,
            applyDays: this.applyDays,
            deleted: this.deleted,
            startDate: this.startDate
        } as ActivityGroupDetails));
    }

    validate(): ScheduleValidationError[] {
        this.activities.sort((a, b) => { 
            const aStartTime = this.dateTimeService.parseHoursMinutes(a.startTime);
            const bStartTime = this.dateTimeService.parseHoursMinutes(b.startTime);
            
            return aStartTime.toDate().getTime() - bStartTime.toDate().getTime() ;
        });
        const errors: ScheduleValidationError[] = this.activities.map(x => ({
            titleError: '',
            startError: '',
            endError: ''
        }));
        this.activities.forEach((a, i) => {
            if(!a.title) {
              errors[i].titleError = 'Name must have a value';
            }
            if(!a.startTime || !this.dateTimeService.parseHoursMinutes(a.startTime)) {
              errors[i].startError = 'Could not identify the time specified';
            }
            if(!a.endTime || !this.dateTimeService.parseHoursMinutes(a.startTime)) {
              errors[i].endError = 'Could not identify the time specified';
            }
        });
        
        return errors;
    }

    async save() {
        await this.api.putSchedule({
            studentId: this.studentId,
            schedule: this.toDetails()
        });
        if(this.isNew) {
            this.addCallback(this);
            this._isNew = false;
        }
    }

    async cancel() {
        _.merge(this, this.data);
    }

    async delete() {
        await this.api.deleteSchedule({
            studentId: this.studentId,
            category: this.name,
            date: this.startDate
        });
        this.removeCallback(this);
    }
}

