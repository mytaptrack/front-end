import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ChartConfiguration, Chart, ChartEvent, ActiveElement } from 'chart.js';
import { ActivatedRoute, Router } from '@angular/router';
import { read as readXlsx } from 'xlsx';
import {
  StudentNotification, UserClass, StudentClass, ViewerConfigService, ScheduleCategoryClass,
  DateTimeService, ReportDuration, ChartUtilsService, IntervalModel, Notification, AccessLevel, 
  BehaviorCalculation, BehaviorSettings, CalculationType, LicenseFeatures, 
  MetricType, Milestone, NotificationDetails, ReportData,
  ReportDefinitionMetric, StudentBehavior, StudentDashboardSettings, StudentDataPut, 
  SummaryScope, UserSummaryRestrictions, StudentSchedulesClass, ReportDetails, ScheduledReportData, 
  IoTDeviceCollection, TeamMember, AbcCollectionClass, UserService, moment, Moment
} from '../../..';

export const colors = [
  ['#C94CE0','#CA72F5','#B287DE','#D5C2FF'],
  ['#487DE0','#6EB3F5','#83C1DE','#BDF5FF'],
  ['#4CE099','#73F59E','#87DE94','#C4FFC2'],
  ['#E0D14C','#F5E073','#DECA87','#FFEDC2'],
  ['#E0723D','#F58563','#DE8678','#FFB4B0'],
  ['#E04734','#F55A57','#DE6F8C','#FFA6DA'],
  ['#9651E0','#A36CF5','#936FDE','#AF94FF'],
  ['#4AE0DE','#71F5DB','#85DEBC','#BFFFDB'],
  ['#80E046','#BFF56D','#CDDE81','#FFFEBA'],
  ['#E0A641','#F5B867','#DEAA7C','#FFD1B5'],
];
const colors_light = ['#C2C2FF', '#FFC2C2', '#C2FFC2', '#777', '#33ffff', '#ff66ff', '#ffb266', '#9933ff'];

interface DisplayMilestones extends Milestone {
  color: string;
}

interface DisplayBehavior extends StudentBehavior {
  color: string;
  metricType: string;
}

interface StudentSettings {
  studentId: string;
  behaviors: BehaviorSettings[];
}

interface UserSettings {
  students: StudentSettings[];
}

export interface TableData extends ScheduledReportData {
  activity: string;
  activityStart: string;
  activityEnd: string;
  rowSpan: number;
  name: string;
  time: string;
  raw: ReportData;
  canDelete: boolean;
  saving?: boolean;
}

interface ColorMap {
  [key: string]: {
    colors: string[];
    onIndex: number;
  }
}

enum DailyTabs {
  frequency = 'frequency',
  duration = 'duration',
  interval = 'interval',
  notes = 'notes'
}

interface ChartElement {
  left: number;
  top: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface AbcStatGroup {
  behavior: string;
  stats: AbcStat[];
  events: number;
}
export interface AbcStat {
  a: string;
  b: string;
  c: string;
  events: number;
  percent: number;
}

let intervalCheckHandle;

@Component({
  selector: 'app-dashboard2',
  templateUrl: './dashboard2.component.html',
  styleUrls: ['./dashboard2.component.scss'],
  standalone: false
})
export class Dashboard2Component implements OnInit {
  warning: string = "";
  user: UserClass = null;
  dataErrors: string[] = [];
  userSettings: UserSettings = { students: [] };
  selectedStudent: StudentClass = null;
  student: StudentClass = null;
  settings: StudentDashboardSettings = { behaviors: [], responses: [], antecedents: [], devices: [], velocity: { enabled: false }, summary: { after45: SummaryScope.weeks, after150: SummaryScope.months, showTargets: true, calculationType: CalculationType.avg, averageDays: 5 }, autoExcludeDays: [0, 6] };
  frequencyChart: ChartConfiguration = null;
  durationChart: ChartConfiguration = null;
  abcStats: AbcStat[];
  abcBStats: ChartConfiguration[];
  abcAChart: ChartConfiguration;
  chartCount = 0;
  dotChart: ChartConfiguration = null;
  dayChart: ChartConfiguration = null;
  notesUnsaved = false;
  
  get hasUnsavedChanges() { 
    return this.notesUnsaved; 
  }

  _currentDay: Moment = moment();
  get currentDay(): Moment {
    return this._currentDay;
  }
  set currentDay(value: Moment) {
    this._currentDay = value;
    this.router.navigate([], { 
      queryParams: { 
        date: this.currentDay.format('YYYY-MM-DD')
      },
      queryParamsHandling: 'merge'
    });
  }

  startDate: Moment;
  endDate: Moment;
  reportData: ReportDetails = null;
  private _dailyChartType: DailyTabs = DailyTabs.frequency;
  get dailyChartType(): DailyTabs {
    return this._dailyChartType;
  }
  set dailyChartType(value: DailyTabs) {
    this._dailyChartType = value;
    this.router.navigate([], {
      queryParams: {
        dailyTab: this.dailyChartType
      },
      queryParamsHandling: 'merge'
    });
  }
  screenHeight: string = '100px';
  dayDetails: TableData[] = [];
  abcAvailable: boolean = false;
  scheduleName: string = '';
  hasDuration: boolean = false;
  loading: boolean = true;
  loadingDay: boolean = true;
  private hoursCache: string[] = null;
  showSettingsDropdown: boolean = false;
  intervalMinutes: number = 1;
  studentNotifications: Notification<NotificationDetails>[] = [];
  schedules: StudentSchedulesClass;
  behaviorsAndResponses: StudentBehavior[];
  showCustomInterval: boolean;
  redirectToMobile: boolean = true;
  intervalType: 'minutes' | 'seconds' = 'minutes';
  awaitingResponse: boolean;
  savingEvent: boolean;
  intervalData: IntervalModel = {
    startHour: 0,
    endHour: 24,
    data: [],
    dayStart: this.currentDay,
    dayEnd: this.currentDay
  };
  notes: string;
  protected metrics: ReportDefinitionMetric[] = [];
  @ViewChild('details', { static: true })
  protected details: ElementRef;
  @ViewChild('dashboardBody', { static: true })
  dashboardBody: ElementRef;
  showAddEvent: boolean = false;
  addEventBehavior: string;
  addEventTime: string;
  addEventStopTime: string;
  addEventDurationType: 'missing' | 'new';
  restrictions: UserSummaryRestrictions;
  scheduleAdmin: boolean;
  dataAdmin: boolean;
  commentsAdmin: boolean;
  commentsRead: boolean;
  alertsActionInProgress: boolean = false;
  milestones: DisplayMilestones[] = [];
  displayBehaviors: DisplayBehavior[] = [];
  displayTargets: DisplayBehavior[] = [];
  excludeDates: string[] = [];
  includeDates: string[] = [];
  scheduledExcludes: string[] = [];
  colorMap: ColorMap = {};
  showLarge: string;
  largeChartSize: number = 30;
  showDataSource: boolean = false;
  features: LicenseFeatures = {} as any;
  protected includeArchive = true;
  protected initInterval;
  inlinePluginFrequency = [{
    id: 'boundaryPlugin1',
    afterDraw: (chart: Chart) => {
      if(chart.canvas.id == 'trendChart') {
        this.generateEventLines('trendChart', 'trendChartMilestones', chart);
      }
    }
  }];
  inlinePluginDuration = [{
    id: 'boundaryPlugin2',
    afterDraw: (chart: Chart) => {
      if(chart.canvas.id == 'durationChart') {
        this.generateEventLines('durationChart', 'durationChartMilestones', chart);
      }
    }
  }];
  inlinePluginDot = [{
    id: 'boundaryPlugin3',
    afterDraw: (chart: Chart) => {
      // this.generateEventLines('dotChart', 'dotChartMilestones', chart);
    }
  }];

  inlinePluginLargeFrequency = [{
    id: 'boundaryPluginLarge1',
    afterDraw: (chart: Chart) => {
      this.generateEventLines('largeTrendChart', 'largeTrendChartMilestones', chart);
    }
  }];
  inlinePluginLargeDuration = [{
    id: 'boundaryPluginLarge2',
    afterDraw: (chart: Chart) => {
      this.generateEventLines('largeDurationChart', 'largeDurationChartMilestones', chart);
    }
  }];
  inlinePluginLargeDot = [{
    id: 'boundaryPluginLarge3',
    afterDraw: (chart: Chart) => {
      this.generateEventLines('largeDotChart', 'largeDotChartMilestones', chart);
    }
  }];
  get showAlerts(): boolean {
    const retval: boolean = (this.studentNotifications && this.studentNotifications.length > 0) || 
      this.dataErrors.length > 0 || 
      this.selectedStudent.alertCount > 0 ||
      (this.student?.awaitingResponse)? true : false;
    return retval;
  }

  @ViewChild('importFileElement') importFileElement: ElementRef;
  private _importFile: any;
  get importFile() {
    return this._importFile;
  }
  set importFile(val: any) {
    this._importFile = val;
    this.loadImportFile();
  }

  get abc(): AbcCollectionClass {
    if(!this.student || !this.student.details || !this.student.abc) {
      return {} as any;
    }
    return this.student.abc;
  }
  get isMobile() {
    return this.viewerConfigService.isMobile;
  }
  get DailyChartWidth() {
    if(this.viewerConfigService.isMobile) {
      return window.innerWidth;
    }
    return 500;
  }

  get DailyChartHeight() {
    if( this.viewerConfigService.isMobile ) {
      return window.innerWidth;
    }
    if(window.innerWidth < 1000) {
      return 500;
    }

    return 100;
  }

  get abcPermission() {
    return this.selectedStudent?.restrictions?.abc && 
      this.selectedStudent?.restrictions?.abc !== AccessLevel.none;
  }
  private _showAbc: boolean;
  get showAbc() {
    return this._showAbc;
  }
  set showAbc(val: boolean) {
    this._showAbc = val;
  }

  get abcAChartHeight(): number {
    if(!this.abcAChart?.data?.labels || !this.abcAChart?.data?.datasets) {
      return 60;
    }
    return this.abcAChart.data.labels.length * this.abcAChart.data.datasets.length * 10 + 50
  }

  private _devices: IoTDeviceCollection;
  private _deviceLoading = false;
  get devices() {
    if(!this._devices && !this._deviceLoading) {
      this._deviceLoading = true;
      this.student.getDevices().then(devices => {
        this._devices = devices;
        this._deviceLoading = false;
      });
    }
    return this._devices;
  }

  private _team: TeamMember[];
  private _teamLoading = false;
  get team() {
    if(!this._team && !this._teamLoading) {
      this._teamLoading = true;
      this.student.team.getTeam().then(team => {
        this._team = team;
        this._teamLoading = false;
      });
    }
    return this._team;
  }
  @ViewChild('intervalReport') intervalElement: ElementRef;

  constructor(protected userService: UserService,
    protected chartService: ChartUtilsService,
    protected dateService: DateTimeService,
    protected viewerConfigService: ViewerConfigService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected cd: ChangeDetectorRef) {

  }

  ngOnInit() {
    if(intervalCheckHandle) {

    }
    if(this.viewerConfigService.isMobile && this.redirectToMobile) {
      this.router.navigate(['mobile'], { queryParamsHandling: 'merge' });
      return;
    }
    const params = this.route.snapshot.queryParams;

    console.log(params);
    if(params.startDate) {
      this.startDate = moment(params.startDate);
      this.endDate = moment(params.endDate);
    } else {
      this.startDate = params.date? this.dateService.getWeekStart(moment(params.date)) : this.dateService.getWeekStart(this.currentDay);
      this.endDate = moment(this.startDate).add(7, 'days');
    }
    if(params.date) {
      this.currentDay = moment(params.date);
    } else if(this.endDate.isAfter(moment())) {
      this.currentDay = moment();
    } else {
      this.currentDay = this.endDate.clone().add(-1, 'days');
    }

    if(params.dailyTab) {
      this.dailyChartType = params.dailyTab;
    }

    this.userService.user.subscribe(x => {
      this.user = x;
      if(!x) {
        this.student = null;
        return;
      }
      if(x && !x.terms) {
        this.router.navigate(['setup'], { queryParamsHandling: 'merge' });
      }
      this.load();
    });
  }

  async load() {
    
    this.user.selectedStudent.subscribe(s => {
      if (s) {
        this.selectStudent(s);
      } else {
        if(this.initInterval) {
          clearInterval(this.initInterval);
        }
        this.initInterval = setInterval(() => {
          if(this.user && !this.selectedStudent) {
            this.setLoading(false);
            clearInterval(this.initInterval);
          }
        }, 200);
      }
    });
  }

  refreshData() {
    this.student.reports.clearReportCache();
    this.selectStudent(this.selectedStudent);
  }

  beforeDraw(chart: any) {
    const x = chart;
  }

  async createMetric(behavior: StudentBehavior, type: MetricType, duration: number, display: boolean, prefix: string = ''): Promise<ReportDefinitionMetric[]> {
    if (!display) {
      return [];
    }
    let devices: IoTDeviceCollection;
    let team = [];
    if(this.settings.devices?.find(x => x.calculation == BehaviorCalculation.Independent)) {
      devices = await this.student.getDevices();
      team = await this.student.team.getTeam();
    }
    const deviceGroups = [{ name: prefix + ' ' + behavior.name, deviceIds: [].concat([undefined], 
      devices? devices.map(x => x.dsn) : [], team.map(x => x.userId))}];

    if(devices) {
      this.settings.devices?.forEach(x => {
        if(x.calculation === BehaviorCalculation.Pooled) {
          deviceGroups[0].deviceIds.push(x.id);
        } else if(x.calculation === BehaviorCalculation.Independent) {
          const device = devices.find(y => y.dsn === x.id);
          if(device) {
            const mainIndex = deviceGroups[0].deviceIds.findIndex(d => d == device.dsn);
            if(mainIndex >= 0) {
              deviceGroups[0].deviceIds.splice(mainIndex, 1);
            }
            if(device && device.events.find(y => y.eventId === behavior.id)) {
              deviceGroups.push({
                name: behavior.name + ' ' + x.name,
                deviceIds: [x.id]
              });
            }
          }
        }
      });
    }

    let unit = 'Days';
    let calculationType = CalculationType.sum;
    if(duration > 150) {
      unit = this.settings.summary.after150;
      calculationType = this.settings.summary.calculationType;
    } else if(duration > 45) {
      unit = this.settings.summary.after45;
      calculationType = this.settings.summary.calculationType;
    }

    return deviceGroups.map(x => ({
      id: behavior.id,
      name: x.name,
      deviceIds: x.deviceIds,
      metricType: type,
      timeline: {
        startDate: this.startDate.toString(),
        duration,
        calculationType,
        scope: unit
      }
    } as ReportDefinitionMetric));
  }

  toggleSource() {
    this.showDataSource = !this.showDataSource;
    this.student.getDevices().then(() => {
      this.cd.detectChanges();
    });
    this.cd.detectChanges();
  }
  currentSettings() {
    if(!this.student.dashboard) {
      return {};
    }
    return this.student.dashboard;
  }

  async createMetrics(behavior: StudentBehavior, duration: number, prefix: string = ''): Promise<ReportDefinitionMetric[]> {
    // if (behavior.isArchived && !this.includeArchive) {
    //   return [];
    // }
    let setting = this.settings.behaviors?.find(b => b.id === behavior.id);
    if(!setting) {
      setting = {
        frequency: true,
        duration: behavior.isDuration? {
          avg: true
        } : undefined
      } as any;
    }
    return await Promise.all([].concat(
      this.createMetric(behavior, MetricType.occurence, duration, setting?.frequency? true : false, prefix),
      this.createMetric(behavior, MetricType.sum, duration, (behavior.isDuration && setting?.duration && setting.duration.sum)? true : false, prefix),
      this.createMetric(behavior, MetricType.avg, duration, (behavior.isDuration && setting?.duration && setting.duration.avg)? true : false, prefix),
      this.createMetric(behavior, MetricType.min, duration, (behavior.isDuration && setting?.duration && setting.duration.min)? true : false, prefix),
      this.createMetric(behavior, MetricType.max, duration, (behavior.isDuration && setting?.duration && setting.duration.max)? true : false, prefix)
    ));
  }

  getNotificationText(notification: StudentNotification) {
    if (!notification || !this.student) {
      return '';
    }

    const typed = notification as StudentNotification;
    const behavior = this.student.trackables.behaviors.find(x => x.id === typed.details.behaviorId);
    if(behavior) {
      return ` An event (${behavior.name}) occurred at ${notification.dateString} `;
    }

    const response = this.student.trackables.responses?.find(x => x.id === typed.details.behaviorId);
    return ` A response (${response ? response.name : typed.details.behaviorId}) occurred at ${notification.dateString} `;
  }

  async dismissNotification(notification: StudentNotification) {
    try {
      this.alertsActionInProgress = true;
      await notification.ignore();
    } catch (err) {
      alert(err.message? err.message : err);
    } finally {
      this.alertsActionInProgress = false;
    }
  }

  async clearAllNotifications() {
    try {
      this.alertsActionInProgress = true;
      await this.student.dismissNotifications();
      this.studentNotifications = await this.student.getNotifications();
    } catch (err) {
      alert(err.message? err.message : err);
    } finally {
      this.alertsActionInProgress = false;
    }
  }

  async clearAllPending() {
    try {
      this.alertsActionInProgress = true;
      await this.student.dismissPending();
      this.studentNotifications = await this.student.getNotifications();
    } catch (err) {
      alert(err.message? err.message : err);
    } finally {
      this.alertsActionInProgress = false;
    }
  }

  async selectStudent(val: StudentClass = null) {
    this.setLoading(true);
    if (val) {
      this.selectedStudent = val;
    }
    this.frequencyChart = null;
    this.abcStats = null;
    this.durationChart = null;

    if (!this.startDate) {
      this.startDate = this.dateService.getWeekStart(this.currentDay);
    }
    if (!this.endDate) {
      this.endDate = moment(this.startDate).add(7, 'days');
    }

    const reportDataPromises: Promise<ReportDetails>[] = [];

    this.student = await this.user.loadStudent(val.studentId);
    this.settings = this.student.reports.dashboardSettings;
    if(!this.settings) {
      return;
    }
    reportDataPromises.push(this.student.reports.getReport(this.startDate, this.endDate));
    this.schedules = this.student.schedules;
    this.restrictions = this.student.restrictions;
    this.scheduleAdmin = this.restrictions.schedules === AccessLevel.admin;
    this.dataAdmin = this.restrictions.data === AccessLevel.admin;
    this.commentsAdmin = this.restrictions.comments === AccessLevel.admin;
    this.commentsRead = this.commentsAdmin || this.restrictions.comments === AccessLevel.read;
    this.awaitingResponse = this.selectedStudent.awaitingResponse;
    if(this.student && this.student.licenseDetails && this.student.licenseDetails.features) {
      this.features = this.student.licenseDetails.features;
    } else {
      this.features = {} as any;
    }

    this.studentNotifications = await this.student.getNotifications() || [];
    
    this.behaviorsAndResponses = [].concat(this.student.trackables.behaviors, this.student.trackables.responses);

    let reportDataArray = await Promise.all(reportDataPromises);
    this.settings = await this.student.reports.dashboardSettings;

    let first = reportDataArray[0];
    reportDataArray.forEach((r, i) => {
      if (i === 0 || !r) {
        return;
      }
      r.data.forEach(data => {
        if(!first.data.find(x => x.behavior == data.behavior && x.dateEpoc == data.dateEpoc)) {
          first.data.push(data);
        } else {
          console.warn('Duplicate data being added');
        }
      });
      r.excludeDays.forEach(ed => {
        if(!first.excludeDays.find(d => d == ed)) {
          first.excludeDays.push(ed);
        }
      });
      r.includeDays.forEach(ed => {
        if(!first.includeDays.find(d => d == ed)) {
          first.includeDays.push(ed);
        }
      });
      if (!first.schedules) {
        first.schedules = r.schedules;
      } else {
        Object.assign(first.schedules, r.schedules || {});
      }
    });

    this.reportData = first;

    if (this.student.milestones) {
      const milestones = this.student.milestones.filter(x => {
        const date = moment(x.date);
        return date.isSameOrAfter(this.startDate) && date.isBefore(this.endDate);
      }).map((x, index) => {
        const copy = x.milestone as DisplayMilestones
        copy.color = colors_light[index % colors_light.length];
        copy.date = x.dateString;
        return copy;
      });
      this.milestones = milestones;
    }
    this.scheduledExcludes = [];
    this.excludeDates = this.reportData.excludeDays;
    this.includeDates = this.reportData.includeDays;
    let currentDate = moment(this.startDate);
    if(this.settings && !this.settings.autoExcludeDays) {
      this.settings.autoExcludeDays = [];
    }
    while(currentDate.isSameOrBefore(moment(this.endDate))) {
      if(this.settings?.autoExcludeDays.findIndex(x => x == currentDate.get('weekday')) >= 0) {
        this.scheduledExcludes.push(currentDate.toString());
      }
      currentDate = currentDate.add(1, 'day');
    }
    const duration = (this.endDate.diff(this.startDate, 'days'));
    const behaviorMetricPromises = await Promise.all(this.student.trackables.behaviors
      .filter(b => {
        const result: boolean = !b.isArchived || (this.reportData.data.find(x => x.behavior == b.id)? true : false);
        return result;
      })
      .map(b => {
        const mapped = this.createMetrics(b, duration);
        return mapped;
      }));
    const responseMetricPromises = await Promise.all(this.student.trackables.responses
      .filter(r => !r.isArchived || this.reportData.data.find(x => x.behavior == r.id))
      .map(b => {
        return this.createMetrics(b, duration, 'Response:');
      }));
    this.metrics = [].concat(...[].concat(...behaviorMetricPromises),
      ...[].concat(...responseMetricPromises));

    if(!this.settings.antecedents) {
      this.settings.antecedents = [];
    }
    this.reportData.data.forEach(d => {
      if(!d.abc?.a) {
        return;
      }
      let setting = this.settings.antecedents.find(x => x.name == d.abc.a);
      if(!setting) {
        setting = {name: d.abc.a, display: true };
        this.settings.antecedents.push(setting);
      }
    });

    this.chartCount = 0;

    const durationMetrics = this.metrics.filter(x => {
      return x.metricType === MetricType.avg ||
        x.metricType === MetricType.max ||
        x.metricType === MetricType.min ||
        x.metricType === MetricType.sum;
    });
    this.durationChart = null;
    this.dataErrors = [];
    this.metrics.forEach(x => {
      if (x.timeline.scope == 'Auto') {
        const diff = this.endDate.diff(this.startDate, 'days');
        const after45 = this.settings.summary.after45;
        const after150 = this.settings.summary.after150;
        if (diff > 45) {
          x.timeline.scope = after45 == 'Auto'? 'Week' : after45;
        } else if (diff > 150) {
          x.timeline.scope = after150 == 'Auto'? 'Month' : after45;
        }
      }
    });
    const showTargets = !this.metrics.find(x => x.timeline.scope != 'Days') || this.settings.summary.showTargets;
    if (durationMetrics.length > 0) {
      this.chartCount++;
      this.durationChart = this.chartService.createChartData(
        {
          studentId: val.studentId,
          style: {
            type: 'line',
            width: 100,
            fill: true,
            colors: []
          },
          metrics: durationMetrics,
          excludeDates: this.excludeDates,
          includeDates: this.includeDates,
          scheduledExcludes: this.scheduledExcludes
        }, first,
        this.behaviorsAndResponses, duration, showTargets, this.settings.summary?.averageDays ?? 5, this.startDate, this.dataErrors);
        this.durationChart.options.onClick = (event, active) => { this.goToReportDetailsFromLine({ event, active }, true); };
    }

    const frequencyMetrics = this.metrics.filter(x => x.metricType === MetricType.occurence);
    this.frequencyChart = null;
    if (frequencyMetrics.length > 0 || durationMetrics.length == 0) {
      this.chartCount++;
      this.frequencyChart = this.chartService.createChartData(
        {
          studentId: val.studentId,
          style: {
            type: 'line',
            width: 100,
            fill: true,
            colors: []
          },
          metrics: frequencyMetrics,
          excludeDates: this.excludeDates,
          includeDates: this.includeDates,
          scheduledExcludes: this.scheduledExcludes
        }, first,
        this.behaviorsAndResponses, duration, showTargets, this.settings.summary.averageDays, this.startDate);
        this.frequencyChart.options.onClick = (event, active) => { this.goToReportDetailsFromLine({ event, active }, true); };
    }

    const dotMetrics = this.metrics.filter(m => m.metricType === MetricType.occurence);
    if (dotMetrics.length === 0) {
      this.dotChart = null;
    } else {
      this.chartCount++;
      this.dotChart = this.chartService.createChartData(
        {
          studentId: val.studentId,
          style: {
            type: 'cluster',
            width: 1,
            fill: false,
            colors: []
          },
          metrics: dotMetrics,
          excludeDates: this.excludeDates,
          includeDates: this.includeDates,
          scheduledExcludes: this.scheduledExcludes
        }, first,
        this.behaviorsAndResponses, duration, showTargets, this.settings.summary.averageDays, this.startDate);
        this.dotChart.options.onClick = (event, active) => { this.goToReportDetailsFromDot({ event, active }); };
    }

    this.displayBehaviors = [];
    this.displayTargets = [];
    this.colorMap = {};
    this.metrics.forEach(x => {
      let displayBehavior: DisplayBehavior = this.displayBehaviors.find(y => y.id === x.id && y.name === x.name && y.metricType === x.metricType);
      if (!displayBehavior) {
        const behavior = this.behaviorsAndResponses.find(y => y.id === x.id);
        if (!behavior) {
          return;
        }

        displayBehavior = {
          ...behavior
        } as any;
        displayBehavior.name = x.name;
        if(!this.colorMap[displayBehavior.id]) {
          this.colorMap[displayBehavior.id] = {
            colors: colors[Object.keys(this.colorMap).length % colors.length],
            onIndex: 0
          };
        }
        const color = this.colorMap[displayBehavior.id];
        displayBehavior.color = color.colors[color.onIndex++];
        displayBehavior.metricType = x.metricType;
        displayBehavior.id = x.id;
        this.displayBehaviors.push(displayBehavior);
      }

      x.color = displayBehavior.color;
    });
    this.behaviorsAndResponses.forEach(x => {
      if(x.targets) {
        
        const behavior = this.displayBehaviors.find(y => y.id == x.id);
        if(behavior) {
          this.displayTargets.push({
            name: x.name + ' target',
            color: behavior.color,
            metricType: 'target',
            tags: []
          });
        }
      }
    });
    this.displayBehaviors.sort((a, b) => a.name.localeCompare(b.name));

    if(this.dotChart) {
      this.dotChart?.data?.datasets?.forEach(x => {
        const display = this.displayBehaviors.find(y => y.name === x.label);
        delete x['metric'];
        if(display) {
          x.backgroundColor = display?.color;
          x.borderColor = display?.color;
        }
      });
    }
    if(this.frequencyChart) {
      this.frequencyChart?.data?.datasets?.forEach(x => {
        const display = this.displayBehaviors.find(y => y.name === x.label || y.name + ' target' === x.label);
        delete x['metric'];
        if(display) {
          x.backgroundColor = display?.color;
          x.borderColor = display?.color;
          x['pointBackgroundColor'] = display?.color;
        }
      });
    }
    if(this.durationChart) {
      this.durationChart?.data?.datasets?.forEach(x => {
        const chartMetric = (x as any).metric;
        const display = durationMetrics.find(y => {
          if(y.id !== chartMetric.id || y.metricType !== chartMetric.metricType || y.deviceIds.length !== chartMetric.deviceIds.length) {
            return false;
          }
          return chartMetric.deviceIds.filter(cmd => {
            const retval = y.deviceIds.filter(dm => (!dm && !cmd) || (dm === cmd));
            return retval.length == 0;
          }).length == 0;
        });
        if(display) {
          x.backgroundColor = x.borderColor = display?.color;
          x.borderColor = display?.color;
          x['pointBackgroundColor'] = display?.color;
        }
        delete x['metric'];
      });
    }

    this.abcStats = [];
    const bStats: { behaviorName: string, stats: { a: string, count: number }[]}[] = [];
    const antecedents: { name: string, color: string}[] = [];
    if(this.reportData.data.find(x => x.abc?.a)) {
      let totalCount = 0;
      this.reportData.data.forEach(x => {
        if(!x.abc?.a) {
          return;
        }
        if(this.isDateExcluded(x.dateEpoc)) {
            return;
        }
        if(!this.settings.antecedents.find(a => a.name == x.abc.a).display) {
          return;
        }
        const behaviorName = this.getBehaviorName(x.behavior);
        
        let bStat = bStats.find(y => y.behaviorName == behaviorName);
        if(!bStat) {
          bStat = { behaviorName, stats: []};
          bStats.push(bStat);
        }
        let bStatA = bStat.stats.find(y => y.a == x.abc.a);
        if(!bStatA) {
          bStatA = {
            a: x.abc.a,
            count: 0
          };
          bStat.stats.push(bStatA);
          if(!antecedents.find(a => a.name == x.abc.a)) {
            antecedents.push({
              name: x.abc.a,
              color: colors[antecedents.length % colors.length][0]
            });
          }
        }
        bStatA.count++;

        const stat = this.abcStats.find(y => y.b == behaviorName && y.a == x.abc.a && y.c == x.abc.c);
        if(!stat) {
          this.abcStats.push({
            a: x.abc.a,
            b: behaviorName,
            c: x.abc.c,
            events: 1,
            percent: 0
          });
        } else {
          stat.events++;
        }
        totalCount++;
      });
      this.abcStats.forEach(y => {
        y.percent = Math.floor(y.events / totalCount * 1000) / 10;
      });
      this.abcStats.sort((a, b) => b.events - a.events);
    }
    const behaviors = bStats.map(stat => stat.behaviorName);

    this.abcBStats = bStats.map(stat => ({
      type: 'doughnut',
      data: {
        labels: stat.stats.map(x => x.a),
        datasets: [{
          data: stat.stats.map(x => x.count),
          backgroundColor: stat.stats.map(x => {
            const a = antecedents.find(y => y.name == x.a);
            if(a) {
              return a.color;
            }
            return;
          }),
          hoverBackgroundColor: stat.stats.map(x => {
            const a = antecedents.find(y => y.name == x.a);
            if(a) {
              return a.color;
            }
            return;
          })
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false,
            text: stat.behaviorName,
            font: {
              size: 24
            }
          }
        }
      }
    }));
    this.abcAChart = {
      type: 'bar',
      data: {
        labels: antecedents.map(a => a.name),
        datasets: behaviors.map(b => {
          const data = antecedents.map(a => {
            const result = bStats.find(x => x.behaviorName == b)?.stats?.find(x => x.a == a.name)?.count;
            if(result) {
              return result;
            }
            return 0;
          });
          const behavior = this.student.trackables.behaviors.find(x => x.name == b);
          const db = this.displayBehaviors.find(db => db.id == behavior?.id);
          return {
            label: b,
            backgroundColor: db?.color,
            hoverBackgroundColor: db?.color,
            data: data
          };
        })
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Antecedent --> Behavior',
            font: {
              size: 24
            }
          }
        },
        scales: {
          xAxis: {
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };
    this.abcAvailable = this.abcStats.length > 0;

    console.log(JSON.stringify(this.durationChart));
    this.finalizeOverviewChart();
    await this.loadDay();

    if(this.student.trackables.activeBehaviors.length > 0 && this.displayBehaviors.length == 0) {
      this.warning = "All behaviors are currently hidden. To show hidden behaviors go to Dashboard Settings";
    } else {
      this.warning = "";
    }

    this.setLoading(false);
  }

  finalizeOverviewChart() {

  }

  generateEventLines(canvasElementId: string, svgElementId: string, chart: Chart) {
    const svg = window.document.getElementById(svgElementId);
    if(!svg) {
      return;
    }

    const yAxis = chart.scales.yAxis;
    const xAxis = chart.scales.x;
    if(!yAxis || !xAxis) {
      return;
    }
    const canvas: any = window.document.getElementById(canvasElementId);
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const chartBounds = chart.chartArea;
    const boundary = {
      top: yAxis.paddingTop,
      bottom: canvas.clientHeight - yAxis.paddingBottom,
      left: chartBounds.left,
      right: chartBounds.right,
      width: chartBounds.right - chartBounds.left,
      height: canvas.clientHeight - xAxis.height
    };
    boundary.width = boundary.right - boundary.left;
    const parent = canvas.parentElement;
    const svgRect = svg.getBoundingClientRect();
    if(rect.width != svgRect.width || rect.height != svgRect.height) {
      svg.style.width = rect.width + 'px';
      svg.style.height = rect.height + 'px';
    }
    if(boundary.width > rect.width || (boundary.width < 100 && rect.width > 200)) {
      return;
    }
    if(boundary.left + boundary.width < rect.width) {
      boundary.width = rect.width - boundary.left - (boundary.width - (boundary.right - boundary.left));
    }
    // if(boundary.top + boundary.height < rect.height) {
    //   boundary.height = rect.height - boundary.top;
    // }

    svg.innerHTML = '';

    if (!this.milestones || this.milestones.length === 0) {
      return;
    }

    this.milestones.map(x => {
      const xa = xAxis;
      const ya = yAxis;
      const date = moment(x.date);
      let onDate = moment(this.startDate);
      let endDate = moment(this.endDate);
      const isDotChart = canvasElementId == 'dotChart' || canvasElementId == 'largeDotChart';
      let offset = -1;
      let total = -1;
      while(onDate.isBefore(endDate, 'day')) {
        if(!isDotChart) {
          const dateFormat = onDate.format('MM/DD/yyyy');
          if(this.reportData.includeDays.find(inDate => dateFormat == inDate)) {
            if(onDate.isSameOrBefore(date, 'day')) {
              offset++;
            }
            total++;
          } else if(this.settings.autoExcludeDays.findIndex(z => z == onDate.weekday()) < 0) {
            if(onDate.isSameOrBefore(date, 'day')) {
              offset++;
            }
            total++;
          }  
        } else {
          if(onDate.isSameOrBefore(date, 'day')) {
            offset++;
          }
          total++;
        }
        onDate.add(1, 'day');
      }

      // total += 1;
      const left = boundary.left;
      const height = boundary.height;
      const width = boundary.right - boundary.left;
      const top = boundary.top;
      const bottom = boundary.bottom;
      const xValue = boundary.left + ((width / total) * offset);
      const areaHeight = bottom - top;
      svg.innerHTML += `<line x1="${xValue}px" y1="${top}px" x2="${xValue}px" y2="${height}px" style="stroke:${x.color};stroke-width:20;" />`;
    });
  }

  async setLoading(val: boolean) {
    this.loading = val;
    this.cd.markForCheck();
  }

  setDailyChart(val: string) {
    this.dailyChartType = val as DailyTabs;
    this.loadDay();
  }

  isDailyChartActive(expected: string) {
    return this.dailyChartType === expected;
  }

  async setLoadingDay(val: boolean) {
    this.loadingDay = val;
    setTimeout(() => {
      this.cd.detectChanges();
    }, 100);
  }
  async loadDay() {
    if (!this.student) {
      return;
    }
    console.log('loadDay 1', new Date().getTime());
    this.setLoadingDay(true);
    const occuranceMetrics = this.metrics
      .filter((m, i) => {
        return m.metricType === MetricType.occurence ||
          i === this.metrics.findIndex(x => x.id === m.id)
      })
      .map(m => {
        const retval = {
          ...m
        };
        retval.metricType = MetricType.occurence;
        return retval;
      });

    console.log('loadDay 2', new Date().getTime());
    if (this.dailyChartType === DailyTabs.interval) {
      const model = this.chartService.getIntervalModel(this.reportData, this.currentDay, this.intervalMinutes, this.intervalType, this.student.trackables.behaviors.filter(b => occuranceMetrics.find(m => m.id === b.id)));
      Object.assign(this.intervalData, model);
      this.hoursCache = null;
    } else {
      this.dayChart = this.chartService.createChartData(
        {
          studentId: this.student.studentId,
          style: {
            type: this.dailyChartType === DailyTabs.frequency ? 'barchart' : 'duration',
            width: 600,
            fill: true,
            colors: []
          },
          metrics: occuranceMetrics,
          excludeDates: this.excludeDates,
          includeDates: this.includeDates,
          scheduledExcludes: this.scheduledExcludes
        }, this.reportData,
        this.behaviorsAndResponses.filter(b => occuranceMetrics.find(m => m.id === b.id)), 1, true, 5, this.currentDay);

      console.log('loadDay 3', new Date().getTime());
      const scheduleResults = await this.student.schedules.getScheduleAndItems(this.reportData, this.currentDay, this);
      console.log('loadDay 4', new Date().getTime());
      const scheduleItems = scheduleResults.activities;
      this.scheduleName = scheduleResults.name;
      this.dayDetails = [].concat(...(scheduleItems
        .map(d => {
          if (d.data.length === 0) {
            return {
              activity: d.title,
              activityStart: this.dateService.getReadableTime(d.startTime.toString(), true),
              activityEnd: this.dateService.getReadableTime(d.endTime.toString(), true),
              name: '',
              time: '',
            } as TableData;
          }
          const filteredData = d.data
            .filter(item => {
              if (!occuranceMetrics.find(m => m.id === item.behavior)) {
                return false;
              }
              if (this.dailyChartType === DailyTabs.frequency) {
                return !item.isDuration || item.isStart;
              } else {
                return item.isDuration;
              }
            });
          return filteredData
            .map((item, index) => {
              return {
                color: this.colorMap[item.behavior]?.colors[0],
                activity: (index === 0) ? d.title : undefined,
                activityStart: this.dateService.getReadableTime(d.startTime.toString(), true),
                activityEnd: this.dateService.getReadableTime(d.endTime.toString(), true),
                rowSpan: (index === 0) ? filteredData.length : undefined,
                name: this.getBehaviorName(item.behavior),
                time: this.dateService.getReadableTime(item.dateEpoc, false),
                ...item,
                raw: item,
                canDelete: (this.dailyChartType == DailyTabs.frequency && !item.isDuration) ||
                (this.dailyChartType == DailyTabs.duration)
              } as TableData
            });
        })));
      console.log('loadDay 5', new Date().getTime());
      this.dayDetails.forEach(x => {
        if(!x.abc) {
          x.abc = {
            a: '',
            c: ''
          };
        }
      });
      console.log('loadDay 6', new Date().getTime());
      this.cd.detectChanges();
    }
    this.setLoadingDay(false);
  }

  async setSchedule(val: ScheduleCategoryClass) {
    try {
      let schedule = val.getSchedule(moment(this.currentDay));
      await this.student.reports.setScheduleOverwrite(schedule, moment(this.currentDay));
      this.reportData = await this.student.reports.getReport(this.startDate, this.endDate);
      await this.loadDay();
    } catch (err) {
      alert(err.message);
    }
  }

  addEventClicked() {
    this.showAddEvent = true;
    this.addEventBehavior = this.student.trackables.activeBehaviors[0]?.id;
    this.addEventTime = '';
    this.addEventStopTime = '';
    this.addEventDurationType = 'new';
  }

  async setSavingEvent(val: boolean) {
    this.savingEvent = val;
  }

  async addEvent() {
    if (!this.addEventBehavior || !this.addEventTime) {
      alert('Required information is missing');
      return;
    }

    this.setSavingEvent(true);
    try {
      const behavior = this.student.trackables.behaviors.find(x => x.id == this.addEventBehavior) ?? 
                      this.student.trackables.responses.find(x => x.id == this.addEventBehavior);
      const startTime = this.dateService.parseHoursMinutes(this.addEventTime, undefined, this.currentDay);
      let stopTime: moment.Moment;
      if (behavior.isDuration && this.addEventDurationType == 'new') {
        if(!this.addEventStopTime) {
          alert('Required information is missing');
          return;  
        }
        stopTime = this.dateService.parseHoursMinutes(this.addEventStopTime, undefined, this.currentDay);

        if(stopTime.isBefore(startTime)) {
          alert('The duration stop happens before the duration start');
          return;
        }
      }

      let existing = this.reportData.data.find(x => x.dateEpoc == startTime.valueOf() && x.behavior == behavior.id);
      if(existing) {
        if(confirm('An event already exists at this time.  Do you want to add another?')) {
          while(existing) {
            startTime.add(1, 'millisecond');
            existing = this.reportData.data.find(x => x.dateEpoc == startTime.valueOf() && x.behavior == behavior.id);
          }
        }
      }

      await behavior.trackEvent(startTime);

      if(behavior.isDuration && this.addEventDurationType == 'new') {
        await new Promise<void>((resolve, reject) => { setTimeout(() => { resolve(); }, 2000); });
        await behavior.trackEvent(stopTime);
      }

      await new Promise<void>((resolve, reject) => { setTimeout(() => { resolve(); }, 2000); });
      this.student.reports.clearReportCache();
      await this.selectStudent(this.student);
      this.showAddEvent = false;
    } finally {
      this.setSavingEvent(false);
    }
  }

  async deleteData(item: TableData) {
    if(!item.canDelete) {
      alert('To delete a duration measurement, switch to the Duration tab');
      return;
    }
    let data = this.reportData.data.find(x => x.dateEpoc === item.dateEpoc && x.behavior === item.behavior);

    if (data) {
      try {
        this.student.reports.removeData(data, this.reportData);
        const index = this.dayDetails.findIndex(x => x === item);
        if (index >= 0) {
          if(this.dayDetails[index + 1] && !this.dayDetails[index + 1].activity) {
            this.dayDetails[index + 1].activity = this.dayDetails[index].activity;
            this.dayDetails[index + 1].activityStart = this.dayDetails[index].activityStart;
            this.dayDetails[index + 1].activityEnd = this.dayDetails[index].activityEnd;
          }
          if(!this.dayDetails[index].rowSpan) {
            for(let i = index - 1; i >= 0; i--) {
              if(this.dayDetails[i].rowSpan) {
                this.dayDetails[i].rowSpan--;
                break;
              }
            }
          }
          this.dayDetails.splice(index, 1);
        }
      } catch (err) {
        alert(err.message);
      }
    }
  }

  goToReportDetailsFromDot(event: any) {
    const data = this.dotChart.data.datasets[event.active[0].datasetIndex]?.data[event.active[0].index] as any;
    let x = Math.floor(data.x as number);
    let scope = 'days';
    this.currentDay = moment(this.startDate).add(x, scope as any);
    this.loadDay();

    const container = document.getElementById('route-container');
    if (this.details) {
      container.scrollTop = this.details.nativeElement.offsetTop;
    } else {
      const doc = document.getElementById('details');
      if (doc) {
        container.scrollTop = doc.offsetTop;
      }
    }
  }

  goToReportDetailsFromLine(event: { event?: ChartEvent, active?: ActiveElement[]}, adjustOffset: boolean) {
    if(!event || !event.active[0]) {
      return;
    }
    let x = event.active[0].index;
    let scope = 'days';
    if(this.metrics && this.metrics[0]) {
      scope = this.metrics[0].timeline.scope;
    }
    let dateOffset = 0;
    if(scope == 'Days' || scope == 'days') {
      if(adjustOffset) {
        let onDate = moment(this.startDate);
        for(var i = 0; i <= x; i++) {
          const dateFormat = onDate.format('MM/DD/yyyy');
          if(this.reportData.includeDays.find(inDate => dateFormat == inDate)) {
            // Do nothing
          } else if(this.settings.autoExcludeDays.findIndex(z => z == i) >= 0) {
            dateOffset++;
          }

          onDate = onDate.add(1, 'days');
        }
      }
    }
    this.currentDay = moment(this.startDate).add(dateOffset + x, scope as any);
    this.loadDay();

    const container = document.getElementById('route-container');
    if (this.details) {
      container.scrollTop = this.details.nativeElement.offsetTop;
    } else {
      const doc = document.getElementById('details');
      if (doc) {
        container.scrollTop = doc.offsetTop;
      }
    }
  }

  scrollToTop() {
    if (!this.dashboardBody) {
      const doc = document.getElementById('route-container');
      if (!doc) {
        window.scrollTo({ top: 0 });
      } else {
        doc.scrollTop = 0;
      }
      return;
    }
    this.dashboardBody.nativeElement.scrollTop = 0;
  }

  getActiveBehaviors() {
    return [].concat(this.student.trackables.activeBehaviors,
      this.student.trackables.activeResponses);
  }
  getBehaviorName(behavior: string): string {
    return this.student.trackables.getBehaviorName(behavior);
  }

  setWeekStart(val: { start: moment.Moment, end: moment.Moment, type: ReportDuration }) {
    this.router.navigate([], {
      queryParams: {
        startDate: val.start.format('yyyy-MM-DD'),
        endDate: val.end.format('yyyy-MM-DD')
      },
      queryParamsHandling: 'merge'
    });
    this.currentDay = val.start;
    this.startDate = val.start;
    this.endDate = val.end;
    this.selectStudent(this.selectedStudent);
  }

  getDateRange(): string {
    if (!this.reportData || !this.student) {
      return '';
    }

    if (!this.startDate) {
      this.startDate = moment(this.reportData.startMillis);
    }
    if (!this.endDate) {
      this.endDate = this.startDate.clone().add(7, 'days').startOf('day');
    }

    const drawEndDate = this.endDate.clone().add(-1, 'day');

    return `${this.dateService.getReadableDate(this.startDate)} - ${this.dateService.getReadableDate(drawEndDate)}`;
  }

  getDay(date: moment.Moment): string {
    if (!date) {
      return '';
    }
    return this.dateService.getReadableDate(date);
  }

  async previousWeek() {
    const start = moment(this.startDate);
    const end = moment(this.endDate);
    const dayDiff = start.diff(end, 'days');

    this.setWeekStart({
      end: this.startDate.clone(), 
      start: start.clone().add(dayDiff, 'days'),
      type: ReportDuration.week
    });
  }
  async nextWeek() {
    const start = moment(this.startDate);
    const end = moment(this.endDate);
    const dayDiff = end.diff(start, 'days');

    this.setWeekStart({
      start: this.endDate.clone(), 
      end: end.clone().add(dayDiff, 'days'),
      type: ReportDuration.week
    });
  }

  async addDays(val: number) {
    if (!this.currentDay) {
      return;
    }
    const day = moment(this.currentDay).add(val, 'days');
    if (day.isBefore(moment(this.startDate))) {
      await this.previousWeek();
    } else if (day.isSameOrAfter(moment(this.endDate))) {
      await this.nextWeek();
    }
    this.currentDay = day;
    this.loadDay();
  }

  getScheduleDisplayName() {
    if (!this.scheduleName) {
      return 'Select Schedule';
    }
    return this.scheduleName;
  }

  getHourString(hour: number) {
    const adjustedHour = (hour > 12) ? hour - 12 : hour;
    let amPm = (hour > 11 && hour < 24) ? 'pm' : 'am';
    return `${adjustedHour} ${amPm}`;
  }

  getHours() {
    if (this.hoursCache) {
      return this.hoursCache;
    }
    this.hoursCache = [];
    for (let i = this.intervalData.startHour; i <= this.intervalData.endHour; i++) {
      this.hoursCache.push(this.getHourString(i));
    }
    return this.hoursCache;
  }

  setFrequency(val: number) {
    if(val === undefined) {
      this.showCustomInterval = true;
      return;
    }

    this.showCustomInterval = false;
    this.intervalMinutes = val;
    this.intervalType = 'minutes';
    this.loadDay();
  }

  print() {
    window.print();
  }

  getTopNotifications() {
    if (!this.studentNotifications) {
      return [];
    }
    if (this.studentNotifications.length <= 5) {
      return this.studentNotifications;
    }

    return this.studentNotifications.slice(this.studentNotifications.length - 5);
  }

  showDropdownClicked() {
    if (!this.showSettingsDropdown) {
      this.showSettingsDropdown = true;
    } else {
      this.showSettingsDropdown = false;
    }
  }

  isDateExcluded(input?: string | number): boolean {
    const dateToCheck = input? moment(input) : this.currentDay;
    const formattedDate = (input? moment(input) : moment(this.currentDay)).format('MM/DD/yyyy');
    if(!this.reportData) {
      return false;
    }
    if(this.reportData.includeDays.find(x => x === formattedDate)) {
      return false;
    }
    if(this.settings.autoExcludeDays && this.settings.autoExcludeDays.findIndex(x => x == dateToCheck.weekday()) >= 0) {
      return true;
    }

    return this.reportData.excludeDays.find(x => x === formattedDate)? true : false;
  }

  async excludeDate() {
    if(this.settings.autoExcludeDays.findIndex(x => x == this.currentDay.weekday()) >= 0) {
      await this.student.reports.setDateTrackingStatus(this.currentDay, 'undo');
    } else {
      await this.student.reports.setDateTrackingStatus(this.currentDay, 'exclude');
    }
    this.refreshData();
  }

  async includeDate() {
    if(this.settings.autoExcludeDays.findIndex(x => x == this.currentDay.weekday()) >= 0) {
      await this.student.reports.setDateTrackingStatus(this.currentDay, 'include');
    } else {
      await this.student.reports.setDateTrackingStatus(this.currentDay, 'undo');
    }
    this.refreshData();
  }

  async undoDate() {
    await this.student.reports.setDateTrackingStatus(this.currentDay, 'include');
    this.refreshData();
  }

  async setLargeChart(val: string) {
    this.showLarge = val;
    setTimeout(() => {
      const element = document.getElementById('largeChartArea');
      element.scrollIntoView({ block: 'start' });
    }, 10)
  }
  async flickerLargeGraph() {
    const original = this.showLarge;
    this.showLarge = null;
    setTimeout(() => {
      this.showLarge = original;
      this.cd.detectChanges();
    }, 10);
  }

  async zoomIn() {
    this.largeChartSize += 25;
    this.flickerLargeGraph();
  }
  async zoomOut() {
    
    if(this.largeChartSize > 30) {
      this.largeChartSize -= 25;
    }
    this.flickerLargeGraph();
  }
  formatDuration(duration) {
    const seconds = Math.floor(duration / 1000) % 60;
    const minutes = Math.floor(duration / 1000 / 60) % 60;
    const hours = Math.floor(duration / 1000 / 60 / 60);
    if(Number.isNaN(seconds)) {
      return '';
    }
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getRaterName(data: TableData) {
    if(!data || !data.raw || !data.raw.source) {
      return ''
    }

    console.log(data.raw.source);
    const devices = this.devices;
    if(!devices) {
      return 'Loading...';
    }
    const source = devices.find(x => x.dsn == data.raw.source.rater);
    if(source) {
      if(source.isApp) {
        return `App: ${source.deviceName}`;
      } else {
        return `Track 2.0: ${source.deviceName}`;
      }
    }

    const team = this.team;
    if(!team) {
      return 'Loading...';
    }
    const person = team.find(x => x.userId == data.raw.source.rater);
    if(person) {
      return `${person.details.name}`;
    }

    return '';
  }

  async setSaving(data: TableData, val: boolean) {
    data.saving = val;
  }
  async saveData(data: TableData) {
    this.setSaving(data, true);
    try {
      const behavior = this.student.trackables.behaviors.find(x => x.id == data.behavior);
      await behavior.trackEvent(moment(data.dateEpoc), data.abc);
    } catch (err) {
      alert(err.message);
    }
    this.setSaving(data, false);
  }

  private getExcelSegments(input) {
    const columnEnd = input.match(/\d/).index;
    const cols = [];
    for(let i = 0; i < 26; i++) {
      cols[String.fromCharCode('A'.charCodeAt(0) + i)] = i;
    }
    return {
      col: cols[input.slice(0, columnEnd)],
      row: Number.parseInt(input.slice(columnEnd))
    };
  }
  private getExcelCellCode(column: number, row: number) {
    return String.fromCharCode('A'.charCodeAt(0) + column) + row;
  }

  async loadImportFile() {
    const importContant = this.importFileElement.nativeElement.files[0];
    const filename: string = this.importFileElement.nativeElement.value.toLowerCase();

    let content;
    if(filename.endsWith('.xlsx')) {
      try {
        const buffer = new Buffer(await importContant.arrayBuffer()).toString('base64');
        const data = readXlsx(buffer);
        const sheet = data.Sheets[data.SheetNames[0]];
        const rangeString = sheet['!ref'];
        const [start, end] = rangeString.split(':').map(x => this.getExcelSegments(x));
        const headers: string[] = [];
        for(let i = start.col; i <= end.col; i++) {
          if(sheet[this.getExcelCellCode(i, start.row)]) {
            headers[i] = sheet[this.getExcelCellCode(i, start.row)].w.toLowerCase();
          }
        }
        if(headers[0].toLowerCase() != 'behavior' || headers[1].toLowerCase() != 'date' || headers[2].toLowerCase() != 'time') {
          alert('The excel file must have the headers "behavior" and "time" in the first two cells');
        }
        const rows: string[][] = [];
        for(let i = start.row + 1; i <= end.row; i++) {
          rows[i - 2] = [];
          const row = rows[i - 2];
          for(let ii = start.col; ii <= end.col; ii++) {
            if(sheet[this.getExcelCellCode(ii, i)]) {
              row[ii] = sheet[this.getExcelCellCode(ii, i)].w;
            }
          }
        }
        const eventParams: StudentDataPut[] = [];
        this.setLoading(true);
        const notesCache: {[key: string]: { notes: string, date: moment.Moment, lastUpdated: moment.Moment } } = {};
        for(let row of rows) {
          const behaviorName = !row[0]? '' : row[0].trim();
          const notes = !row[3]? '' : row[3].trim();
          if(!behaviorName && !notes) {
            continue;
          }

          const behavior = behaviorName? this.student.trackables.behaviors.find(x => x.name.toLowerCase() == behaviorName.toLowerCase()) : undefined;
          if(!behavior && behaviorName) {
            alert(`Could not find behavior "${behaviorName}" on student's list of behaviors. Behaviors must be spelled exactly the way they are on the student`);
            return;
          }
          const date = row[1].trim()? moment(row[1].trim()) : undefined;
          const time = row[2].trim();
          if(!date || !time) {
            alert(`Date "${date}" or time "${time}" is invalid`);
          }
          
          if(behavior) {
            const request: StudentDataPut = {
              studentId: this.student.studentId,
              behaviorId: behavior.id,
              eventDate: this.dateService.parseHoursMinutes(time, undefined, date).toISOString()
            }
            await behavior.trackEvent(this.dateService.parseHoursMinutes(time, undefined, moment(date)));

            eventParams.push(request);
          }
//           if(notes) {
//             const dateString = date.format('yyyy-MM-DD');
//             if(notesCache[dateString] == undefined) {
//               const result = await this.student.reports.getNotes(date);
//               notesCache[dateString] = { 
//                 notes: result?.notes ?? '', 
//                 date: date,
//                 lastUpdated: result.date? moment(result.lastUpdate) : moment(0)
//               };
//             }
//             let existingNotes = notesCache[dateString];
//             existingNotes.notes += `
// [${date.format('MM/DD/yyyy')} ${time}]
// ${notes}`;
//           }
        }
        // for(let key of Object.keys(notesCache)) {
        //   const item = notesCache[key];
        //   await this.student.reports.saveNotes({
        //     studentId: this.student.studentId,
        //     note: item.notes, 
        //     date: moment(item.date).startOf('day').format('yyyy-MM-DD'),
        //     noteDate: moment(item.date).startOf('day').toDate().getTime(),
        //     dateEpoc: moment(item.lastUpdated).toDate().getTime(),
        //     product: 'behavior'
        //   });
        // }
        this.refreshData();
      } catch (err) {
        console.error(err);
      } finally {
        this.setLoading(false);
      }
    } else {
      alert(`File type invalid ${filename}`)
    }
  }

  isDuration(behaviorId: string) {
    let behavior: { isDuration } = this.student.trackables.behaviors.find(x => x.id == behaviorId) as any;
    if(!behavior) {
      behavior = this.student.trackables.responses.find(x => x.id == behaviorId) as any;
    }
    if(!behavior) {
      return false;
    }
    return behavior.isDuration;
  }

  setNotesUnsaved(val: boolean) {
    this.notesUnsaved = val;
  }
}
