import { ApiClientService } from '../../../services';
import {
    StudentClass, ScheduleClass, moment
} from '..';
import { 
    StudentDashboardSettings, Student, ReportData, ReportDetails, SummaryScope, CalculationType,
    BehaviorSettings, MetricType, StudentSummaryReport, AccessLevel,
} from '@mytaptrack/types';

export class StudentReportClass {
    private cache: { start: moment.Moment, end: moment.Moment, report: Promise<ReportDetails> }[] = [];

    private _dashboard: StudentDashboardSettings;
    get dashboardSettings() { return this._dashboard; }

    constructor(private student: StudentClass, private studentData: Student, private api: ApiClientService) {
        this._dashboard = studentData.dashboard;
    }

    async intervalInclude(time: moment.Moment, include: boolean) {
        await this.api.putExcludeInterval({
            studentId: this.student.studentId, 
            date: time.toISOString(), 
            include
        });
    }

    async addDataToReport(data: ReportData) {
        const cachedReportIndex = this.cache.findIndex(x => x.start.isBefore(data.dateEpoc) && x.end.isAfter(data.dateEpoc));
        if(cachedReportIndex == -1) {
            return;
        }
        const report = await this.cache[cachedReportIndex].report;
        report.data.push(data);
        report.data.sort((a, b) => a.dateEpoc - b.dateEpoc);
    }

    async setDashboard(dashboard: StudentDashboardSettings, userSettings: boolean) {
        if(dashboard['success']) {
            return;
        }
        if(userSettings) {
            await this.api.putSettings(this.student.studentId, dashboard);
        } else {
            await this.api.putStudentDashboard(this.student.studentId, dashboard);
        }
        this._dashboard = dashboard;
    }

    async getDefaultDashboard() {
        return await this.api.getDefaultDashboardStudent(this.student.studentId);
    }

    async setScheduleOverwrite(schedule: ScheduleClass, date: moment.Moment) {
        await this.api.putScheduleOverwrite({
            studentId: this.student.studentId, 
            date: date.format('yyyy-MM-DD'), 
            scheduleName: schedule.name
        });
    }
    async removeScheduleOverwrite(scheduleName: string, date: moment.Moment) {
        await this.api.deleteScheduleOverwrite({
            studentId: this.student.studentId,
            date: date.format('yyyy-MM-DD')
        });
    }

    async getReport(start: moment.Moment, end: moment.Moment): Promise<ReportDetails> {
        if(this.student.restrictions.data == AccessLevel.none) {
            return {
                data: [],
                startMillis: start.toDate().getTime(),
                schedules: {},
                lastUpdateDate: start.toDate().getTime(),
                excludeDays: [],
                includeDays: [],
                excludedIntervals: [],
                version: 1
            };
        } else {
            let cachedVal = this.cache.find(x => x.start.isSameOrBefore(start, 'day') && x.end.isSameOrAfter(end, 'day'));
            if(!cachedVal) {
                cachedVal = {
                    start: start.clone(),
                    end: end.clone(),
                    report: this.student.studentId? this.api.getDataV2(this.student.studentId, start, end) : Promise.resolve({ 
                        startMillis: 0, 
                        schedules: {},
                        data: [],
                        lastUpdateDate: 0,
                        excludeDays: [],
                        includeDays: [],
                        version: 1
                    } as ReportDetails)
                };
                this.cache = [cachedVal];
            }
    
            return await cachedVal.report;    
        }
    }

    clearReportCache() {
        this.cache = [];
    }

    async setDateTrackingStatus(date: moment.Moment, action: 'include' | 'exclude' | 'undo') {
        return await this.api.putStudentDataDate({
            studentId: this.student.studentId,
            date: moment(date).format('MM/DD/yyyy'),
            action
        });
    }

    async listSavedSnapshots() {
        return this.api.listSnapshots(this.student.studentId);
    }
    async getSnapshot(date: moment.Moment) {
        return await this.api.getSnapshot({
            studentId: this.student.studentId,
            date: date.format('yyyy-MM-DD'),
            timezone: moment.tz.guess()
        });
    }
    async saveSnapshot(snapshot: StudentSummaryReport) {
        await this.api.putSnapshot({
            ...snapshot,
            studentId: this.student.studentId
        });
    }

    async removeData(data: ReportData, report: ReportDetails) {
        await this.api.removeStudentData(this.student.studentId, data);
        const index = report.data.findIndex(x => x.behavior == data.behavior && x.dateEpoc == data.dateEpoc);
        if(index >= 0) {
            report.data.splice(index, 1);
        }
    }

    async getNotes(date: moment.Moment) {
        return await this.api.getNotes(this.student.studentId, date);
    }
    async saveNotes(notes: string, date: moment.Moment, lastUpdatedDate: moment.Moment) {
        await this.api.putNotes(this.student.studentId, date.format('yyyy-MM-DD'), lastUpdatedDate.format('yyyy-MM-DD') ?? '1970-01-01', notes);
    }

    async getDashboardSettings(): Promise<StudentDashboardSettings> {
        const student = this.studentData;
        let settings = student.dashboard;

        if (!settings) {
            settings = {
                behaviors: [],
                responses: [],
                antecedents: [],
                devices: [],
                velocity: {
                    enabled: false
                },
                summary: {
                    after45: SummaryScope.weeks,
                    after150: SummaryScope.months,
                    calculationType: CalculationType.avg,
                    showTargets: true,
                    averageDays: 5
                },
                autoExcludeDays: [0, 6]
            };
        }
        if (!settings.summary) {
            settings.summary = {
                after45: SummaryScope.weeks,
                after150: SummaryScope.months,
                calculationType: CalculationType.avg,
                showTargets: true,
                averageDays: 5
            };
        }

        const deviceSettings = [];
        if (!settings.devices) {
            settings.devices = deviceSettings;
        } else {
            deviceSettings.forEach(x => {
                if (!settings.devices.find(y => x.id === y.id)) {
                    settings.devices.push(x);
                }
            });
        }

        settings.behaviors = [].concat(
            ...student.behaviors
                .filter(b => !b.isArchived)
                .map(b => {
                    const existing = settings.behaviors.find(x => x.id === b.id);
                    if (existing) {
                        const hasDuration: boolean = existing.duration ? true : false;
                        if (hasDuration !== b.isDuration) {
                            if (b.isDuration) {
                                existing.duration = { };
                            } else {
                                delete existing.duration;
                            }
                        }
                        return existing;
                    }
                    const retval = {
                        id: b.id,
                        frequency: '',
                        expanded: false,
                        duration: b.isDuration ? { } : undefined
                    } as BehaviorSettings;
                    if (retval.duration) {
                        let defaultMeasurement = MetricType.avg;

                        const duration = b.targets?.find(x => x.targetType == 'duration');
                        if (duration) {
                            defaultMeasurement = duration.measurement.toString().toLowerCase() as any;
                        }
                        retval.duration[defaultMeasurement] = true;
                    }
                    return retval;
                }),
            ...student.responses.map(b => {
                const existing = settings.behaviors.find(x => x.id === b.id);
                if (existing) {
                    const hasDuration: boolean = existing.duration ? true : false;
                    if (hasDuration !== b.isDuration) {
                        if (b.isDuration) {
                            existing.duration = {
                            };
                        } else {
                            delete existing.duration;
                        }
                    }
                    return existing;
                }
                const retval = {
                    id: b.id,
                    frequency: '',
                    expanded: false,
                    duration: b.isDuration ? {} : undefined
                } as BehaviorSettings;
                if (retval.duration) {
                    let defaultMeasurement = MetricType.avg;
                    const duration = b.targets?.find(x => x.targetType == 'duration');
                    if (duration) {
                        defaultMeasurement = duration.measurement.toString().toLowerCase() as any;
                    }
                    retval.duration[defaultMeasurement] = true;
                }
                return retval;
            }));

        if (!settings.autoExcludeDays) {
            settings.autoExcludeDays = [0, 6];
        }
        return settings;
    }

    filterData(data: ReportData[], startTime: moment.Moment, endTime: moment.Moment) {
        const retval = data.filter(item => {
            const itemDate = moment(item.dateEpoc);
            if( startTime.isSameOrAfter(itemDate) && itemDate.isBefore(endTime)) {
                return item;
            }
        });
    
        return retval;
    }
}
