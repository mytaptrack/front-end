import { ApiClientService, DateTimeService } from '../../../services';
import {
    StudentClass, Activity, ReportData, ReportDetails, ScheduleClass, 
    ActivityData, ScheduledReportData, ScheduleCategoryClass, AccessLevel, moment
} from '../..';
import * as _ from 'lodash';

export class StudentSchedulesClass {
    private _items: ScheduleCategoryClass[] = [];
    private dateTimeService: DateTimeService = new DateTimeService();
    private _loaded: Promise<void>;
    public get loaded() { return this._loaded; }

    get length(): number { return this._items.length; }
    toString(): string { return this._items.toString(); }
    toLocaleString(): string { return this._items.toLocaleString(); }
    forEach(callbackfn: (value: ScheduleCategoryClass, index: number, array: ScheduleCategoryClass[]) => void, thisArg?: any): void {
        return this._items.forEach(callbackfn);
    }
    map<U>(callbackfn: (value: ScheduleCategoryClass, index: number, array: ScheduleCategoryClass[]) => U, thisArg?: any): U[] {
        return this._items.map(callbackfn);
    }
    filter(predicate: (value: ScheduleCategoryClass, index: number, array: ScheduleCategoryClass[]) => unknown, thisArg?: any): ScheduleCategoryClass[];
    filter(predicate: unknown, thisArg?: unknown): ScheduleCategoryClass[] {
        return this._items.filter(predicate as any, thisArg);
    }
    find(predicate: (value: ScheduleCategoryClass, index: number, obj: ScheduleCategoryClass[]) => unknown, thisArg?: any): ScheduleCategoryClass;
    find(predicate: unknown, thisArg?: unknown): ScheduleCategoryClass {
        return this._items.find(predicate as any, thisArg);
    }
    findIndex(predicate: (value: ScheduleCategoryClass, index: number, obj: ScheduleCategoryClass[]) => unknown, thisArg?: any): number {
        return this._items.findIndex(predicate as any, thisArg);
    }
    entries(): IterableIterator<[number, ScheduleCategoryClass]> {
        return this._items.entries();
    }
    keys(): IterableIterator<number> {
        return this._items.keys();
    }
    values(): IterableIterator<ScheduleCategoryClass> {
        return this._items.values();
    }
    includes(searchElement: ScheduleCategoryClass, fromIndex?: number): boolean {
        return this._items.includes(searchElement, fromIndex);
    }
    [Symbol.iterator](): IterableIterator<ScheduleCategoryClass> {
        return this._items[Symbol.iterator]();
    }
    getItem(index: number) {
        return this._items[index];
    }
    // [Symbol.unscopables](): { copyWithin: boolean; entries: boolean; fill: boolean; find: boolean; findIndex: boolean; keys: boolean; values: boolean; } {
    //     throw new Error('Method not implemented.');
    // }

    constructor(private student: StudentClass, private api: ApiClientService) {
        this._loaded = this.load();
    }

    async load() {
        const schedules = this.student.studentId && this.student.restrictions?.schedules != AccessLevel.none? await this.api.getSchedules(this.student.studentId) : [];
        
        schedules.forEach(item => {
            let cat = this.find(s => s.name === item.name);
            if(!cat) {
                cat = new ScheduleCategoryClass(item.name, 
                    item.schedules.map(sch => new ScheduleClass(sch, this.student.studentId, this.api)), 
                    this.student.studentId, this, this.api);
                this._items.push(cat);
            }
        });
        this.sortItems();
    }

    sortItems() {
        this._items.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
    }

    async remove(category: ScheduleCategoryClass) {
        const index = this.findIndex(x => x == category);
        if(index < 0) {
            return;
        }
        await category.delete();
        this._items.splice(index, 1);
    }

    newCategory(): ScheduleCategoryClass {
        const retval = new ScheduleCategoryClass('', [], this.student.studentId, this, this.api, true);
        this._items.push(retval);
        return retval;
    }

    getAllSchedules(): ScheduleCategoryClass[] {
        return [...this._items];
    }
    async getSchedule(targetDate: moment.Moment, scheduleParent?: { scheduleName: string; }) {
        await this.loaded;
        let dates = targetDate ? [targetDate] : null;
        const weekStart = targetDate.clone().startOf('week');
        const reportData = await this.student.reports.getReport(targetDate, weekStart.clone().add(1, 'week'));
        if (!dates) {
            dates = [];
            let onDate = moment(reportData.startMillis);
            for (let i = 0; i < 7; i++) {
                dates.push(onDate.add(1, 'day').clone());
            }
        }

        await this.loaded;
        let name = '';
        const result = await Promise.all(dates.map(async tdate => {
            name = reportData.schedules[tdate.format('yyyyMMDD')];
            let schedule;
            const schedules = this.getAllSchedules().map(x => x.getSchedule(targetDate)).filter(x => x? true : false);

            const currentTime = tdate;
            const day = tdate.weekday();
            console.log(currentTime);
            const applySchedule = schedules.find(x => {
                const startDate = x.start;
                const applyDay = x.applyDays.find(d => d === day);
                const matchName = name? x.name == name : false;
                const startTimeValid = startDate?.isSameOrBefore(currentTime, 'day');
                return startTimeValid &&
                    (applyDay ? true : false || matchName);
            });
            if (applySchedule) {
                schedule = {
                    activities: JSON.parse(JSON.stringify(applySchedule.activities)),
                    scheduleName: applySchedule.name
                };

                if (scheduleParent) {
                    scheduleParent.scheduleName = schedule ? schedule.scheduleName : '';
                }
            }
            name = schedule?.scheduleName;
            return await this.getScheduledItems(schedule?.activities || [], tdate, reportData);
        }));

        return { name, activities: [].concat(...result) as ActivityData[] };
    }

    private async getScheduledItems(schedule: Activity[], date: moment.Moment, studentReport?: ReportDetails): Promise<ActivityData[]> {
        const retval: ActivityData[] = [];

        if (!studentReport) {
            const endDate = date.clone().add(1, 'week');
            studentReport = await this.student.reports.getReport(date, endDate);
            if (!studentReport) {
                return retval;
            }
        }

        //Copy student data to array we can change
        let studentData: Array<ReportData> = [];
        this.addToSchedule(studentReport, schedule, studentData, date);

        let midnight = date.clone().startOf('day');
        let nextMidnight = midnight.clone().add(1, 'day');

        if (schedule.length > 0) {
            const scheduleStart = this.dateTimeService.parseHoursMinutes(schedule[0].startTime, undefined, date);
            if (scheduleStart.isAfter(midnight)) {
                const scheduleActivity = {
                    title: 'Unspecified',
                    startTime: midnight,
                    endTime: schedule[0].startTime,
                    data: this.filterData(studentData, midnight, scheduleStart)
                };

                if (scheduleActivity.data && scheduleActivity.data.length > 0) {
                    retval.push(scheduleActivity);
                }
            }
        }

        schedule.forEach((scheduleItem, i) => {
            if (scheduleItem.title === 'Unspecified') {
                const data = this.filterData(studentData, 
                    this.dateTimeService.parseHoursMinutes(scheduleItem.startTime, undefined, date),
                    this.dateTimeService.parseHoursMinutes(scheduleItem.endTime, undefined, date));
                if(data.length > 0) {
                    retval.push({
                        title: scheduleItem.title,
                        startTime: scheduleItem.startTime,
                        endTime: scheduleItem.endTime,
                        data
                    });
                }
                return;
            }
            if(typeof(scheduleItem.startTime) == 'string') {
                scheduleItem.startTime = this.dateTimeService.parseHoursMinutes(scheduleItem.startTime, undefined, date);
            }

            if (retval.length > 0) {
                let lastItem = retval[retval.length - 1];

                const lastEndTime = this.dateTimeService.parseHoursMinutes(lastItem.endTime, undefined, date);
                const currentStartTime = this.dateTimeService.parseHoursMinutes(scheduleItem.startTime, undefined, date)
                if (lastItem && !lastEndTime.isSame(currentStartTime, 'second')) {
                    const endTime = scheduleItem.startTime;
                    retval.push({
                        title: 'Unspecified',
                        startTime: lastItem.endTime,
                        endTime: scheduleItem.startTime,
                        data: this.filterData(studentData,
                            this.dateTimeService.parseHoursMinutes(lastItem.endTime, undefined, date),
                            this.dateTimeService.parseHoursMinutes(endTime, undefined, date))
                    });
                }
            }
            const startTime = this.dateTimeService.parseHoursMinutes(scheduleItem.startTime, undefined, date);
            const endTime = this.dateTimeService.parseHoursMinutes(scheduleItem.endTime, undefined, date);
            retval.push({
                data: this.filterData(studentData, startTime, endTime),
                ...scheduleItem
            });
        });

        if (!retval || retval.length === 0) {
            console.log('Setting the global day unspecified');
            retval.push({
                title: 'Unspecified',
                startTime: midnight,
                endTime: nextMidnight,
                data: this.filterData(studentData, midnight, nextMidnight)
            });
        } else {
            const endTime = this.dateTimeService.parseHoursMinutes(retval[retval.length - 1].endTime, undefined, date)
            if (endTime < nextMidnight) {
                let lastActivity = retval[retval.length - 1];
                const scheduleActivity = {
                    title: 'Unspecified',
                    startTime: lastActivity.endTime,
                    endTime: nextMidnight,
                    data: this.filterData(studentData, endTime, nextMidnight)
                };
                if (scheduleActivity.data && scheduleActivity.data.length > 0) {
                    retval.push(scheduleActivity);
                }
            }
        }

        return retval;
    }

    addToSchedule(dataset: ReportDetails, schedule: Activity[], studentData: Array<ReportData>, date: moment.Moment) {
        const dateM = moment(date).local();
        if (dataset && dataset.data) {
            const durationMap: { [key: string]: ScheduledReportData } = {};
            const counter: { [key: string]: number } = {};
            this.student.trackables.behaviors.forEach(value => {
                if (value.isDuration) {
                    durationMap[value.id] = null;
                    counter[value.id] = 0;
                }
            });
            if (this.student.trackables.responses) {
                this.student.trackables.responses.forEach(value => {
                    if (value.isDuration) {
                        durationMap[value.id] = null;
                        counter[value.id] = 0;
                    }
                });
            }
            for (let value of dataset.data) {
                const behavior = this.student.trackables.behaviors.find(x => x.id === value.behavior);
                if (behavior && behavior.daytime && !dateM.isSame(moment(value.dateEpoc).local(), 'day')) {
                    continue;
                }
                if (durationMap[value.behavior] !== undefined) {
                    const copy = JSON.parse(JSON.stringify(value)) as ScheduledReportData;
                    copy.isDuration = true;
                    if (durationMap[value.behavior] === null) {
                        durationMap[value.behavior] = copy;
                        counter[value.behavior]++;
                        copy.occurance = counter[value.behavior];
                        copy.isStart = true;
                    } else {
                        const start = durationMap[value.behavior];
                        start.duration = copy.dateEpoc - start.dateEpoc;
                        copy.duration = start.duration;
                        copy.isStart = false;
                        copy.occurance = counter[value.behavior];
                        durationMap[value.behavior] = null;
                    }
                    studentData.push(copy);
                } else {
                    studentData.push(value);
                }
            }
        }
    }

    private filterData(data: ReportData[], startTime: moment.Moment, endTime: moment.Moment) {
        const start = startTime.toDate().getTime();
        const end = endTime.toDate().getTime();
        const retval = data.filter(item => {
            if (start <= item.dateEpoc && item.dateEpoc < end) {
                return item;
            }
        });

        return retval;
    }

    async save() {
        await this.student.save();
    }

    async getScheduleAndItems(reportData: ReportDetails, targetDate?: moment.Moment, scheduleParent?: { scheduleName: string }): Promise<{name: string, activities: ActivityData[]}> {
        if(!targetDate) {
            targetDate = moment();
        }
        let dates = targetDate? [targetDate] : null;
        if(!dates) {
            dates = [];
            let onDate = moment(reportData.startMillis);
            for(let i = 0; i < 7; i++) {
                dates.push(onDate.clone().add(1, 'day'));
            }
        }
    
        const start = targetDate.toDate().getTime();
        const end = targetDate.clone().endOf('day').toDate().getTime();
        const data = reportData.data.filter(x => start < x.dateEpoc && x.dateEpoc < end);
        let name = '';
        const result = await Promise.all(dates.map(async tdate => {
            let schedule = await this.getSchedule(tdate);
            name = schedule.name;
            const retval = await this.getScheduledItems(schedule?.activities || [], tdate, reportData);
            return retval;
        }));
    
        return {name, activities: [].concat(...result)};
      }
}
