import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Editor, toHTML } from 'ngx-editor';
import jsPDF from 'jspdf';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import htmlToPdfmake from 'html-to-pdfmake';
import { ActivatedRoute, Router, Routes } from '@angular/router';
import { 
  UserClass, UserService, StudentClass, AccessLevel, MeasurementType, UserSummaryRestrictions, 
  StudentSummaryReportBehavior, StudentSummaryReport, StudentSummaryReportLegend, 
  ReportData, StudentBehavior, SnapshotConfig, ReportDetails, StudentBehaviorTargetMax, 
  StudentBehaviorTargetMin, moment
} from '../../..';
import { QLStudentNote, StudentSummaryReportBehaviorTarget } from '@mytaptrack/types';

const colors = [
  '#73fc03',
  '#c6fc03',
  '#ebfc03',
  '#fce303',
  '#fc9d03',
  '#fc6f03',
  '#fc6f03'
]

@Component({
  selector: 'mtt-snapshot',
  templateUrl: './snapshot.component.html',
  styleUrls: ['./snapshot.component.scss'],
  standalone: false
})
export class SnapshotComponent implements OnInit {
  public student: StudentClass;
  public behaviors: StudentSummaryReportBehavior[] = [];
  public current: ReportDetails;
  public last: ReportDetails;
  public notes: QLStudentNote[];
  public editor: Editor;
  public message: Record<string, any>;
  public preview: boolean = false;
  public restrictions: UserSummaryRestrictions;
  public showStats: boolean;
  public loading = true;
  private _saving = false;
  private _weekStart: moment.Moment;
  private _currentDay: moment.Moment;
  private _currentDayString;
  private originalFaces: StudentSummaryReportBehavior[] = [];
  private userId: string;
  private user: UserClass;
  public snapshotConfig: SnapshotConfig;
  private _showLegend: boolean = true;
  private _legend: StudentSummaryReportLegend[];
  private cacheReports: {
    weekStart: moment.Moment;
    current: Promise<ReportDetails>;
    last: Promise<ReportDetails>;
    report: Promise<StudentSummaryReport>;
  }  = {
    weekStart: null,
    current: null,
    report: null,
    last: null,
  };
  public weekdayOffset: number;
  public reportList: string[];
  public daysOfWeek: { text: string, show: boolean, offset: number, date: string, dataSaved: string }[];
  @ViewChild('preview') pdfTable: ElementRef;
  private _displayedColumns: string[] = ['show', 'displayName', 'summary'];
  get displayColumns() {
    const retval = [...this._displayedColumns];
    if (this.showStats) {
      retval.push('dayStats', 'weekStats');
    }
    return retval;
  }

  public get showLegend() {
    return this._showLegend;
  }
  public set showLegend(val: boolean) {
    if(val == this._showLegend) {
      return;
    }
    this._showLegend = val;
    this.reloadLegend();
  }
  public get displayDays() { 
    if(!this.daysOfWeek) {
      return [];
    }
    return this.daysOfWeek.filter(y => y.show);
  }

  public get saving() {
    return this._saving;
  }
  public set saving(value) {
    new Promise<void>((resolve) => {
      this._saving = value;
      resolve();
    })
  }

  public get displayDay() {
    if(!this._currentDay) {
      return '';
    }
    return this._currentDay.format('MM/DD/yyyy');
  }

  public get currentDay() {
    return this._currentDayString;
  }
  public set currentDay(val: string) {
    if(!val) {
      return;
    }
    if(!this._currentDay || !this._currentDay.isSame(moment(val), 'days')) {
      const day = moment(val);

      this._currentDay = moment(day);
      this.weekdayOffset = day.weekday();
      this._weekStart = day.add(day.weekday() * -1, 'days');
      this._currentDayString = this._currentDay.format('yyyy-MM-DD');
      this.router.navigate([], {
        queryParams: { date: this._currentDay.format('MM-DD-yyyy')},
        queryParamsHandling: 'merge'
      });
      if(this.behaviors) {
        this.behaviors.forEach(x => {
          delete x.stats;
          x.faces = [];
        });
      }
      this.loadReport();
    }
  }
  public get showAll() {
    return this.behaviors.findIndex(x => !x.show) < 0;
  }
  public set showAll(val: boolean) {
    this.behaviors.forEach(x => { x.show = val; });
  }

  constructor(private userService: UserService,
              private router: Router,
              private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.editor = new Editor();

    if(this.route.snapshot.queryParams.date) {
      this.currentDay = this.route.snapshot.queryParams.date;
    }
    if(!this._currentDay) {
      this.currentDay = moment().format('MM-DD-yyyy');
      this.router.navigate([], {
        queryParams: { date: this._currentDay.format('MM-DD-yyyy')},
        queryParamsHandling: 'merge'
      });
    }
    this.userService.user.subscribe(user => {
      if(!user) {
        this.userId = '';
        this.user = null;
        this.student = null;
      } else {
        this.userId = user.userId;
        this.user = user;
        this.user.selectedStudent.subscribe(async (student) => {
          if(!student || this.student && student.studentId === this.student.studentId) {
            return;
          }
          try {
            this.setLoading(true);
            this.student = student;
            if(!student || !student.licenseDetails || !student.licenseDetails.features || !student.licenseDetails.features.snapshotConfig) {
              this.snapshotConfig = {
                low: undefined,
                medium: undefined,
                high: undefined,
                measurements: [{name: '@smile', order: 0},{name: '@meh', order: 1},{ name: '@frown', order: 2}],
              };
            } else {
              this.snapshotConfig = student.licenseDetails.features.snapshotConfig;
            }
            this.cacheReports = { weekStart: null, current: null, last: null, report: null };
            
            this.setupRestrictions();
    
            await this.loadReportList();
    
            this.behaviors = await this.createDefaultBehaviorList();
    
            await this.loadReport();
            this.setLoading(false);
          } catch(err) {
            alert('A problem occurred while loading, please refresh your page');
            console.error(err);
          }
        })
      }
      this.setupRestrictions();
    });
  }

  async createDefaultBehaviorList() {
    const behaviorNameLookup = {};
    let latestReport: StudentSummaryReport;
    while(!latestReport && this.reportList && this.reportList.length > 0) {
      latestReport = await this.student.reports.getSnapshot(moment(this.reportList[0]));
      if(!latestReport) {
        this.reportList.splice(0, 1);
      }
    }
    
    if(this.reportList && this.reportList.length) {
      if(latestReport.behaviors) {
        latestReport.behaviors.forEach(x => {
          if(!x) {
            return;
          }
          if(x.targets && (x.targets.avg || x.targets.sum || x.targets.min || x.targets.max)) {
            behaviorNameLookup[x.behaviorId + 'd'] = x.displayText;
          } else {
            behaviorNameLookup[x.behaviorId] = x.displayText;
          }
        });

        // Force legend creation or removal
        this._showLegend = latestReport.legend && latestReport.legend.length > 0? true : false;
        this.reloadLegend();
      }
    }
    const retval = [].concat(
      ...(this.student.trackables.activeBehaviors
        .filter(x => x.targetGoals.frequency)
        .map(x => {
          let displayText = behaviorNameLookup[x.id];
          if(!displayText) {
            displayText = x.name;
            displayText += ' frequency';
          }
          return {
            behaviorId: x.id,
            displayText,
            faces: [],
            show: true,
            isDuration: false,
            targets: { 
              frequency: x.targetGoals.frequency
            }
          } as StudentSummaryReportBehavior;
        })),
      ...(this.student.trackables.activeBehaviors
        .filter(x => x.targetGoals.duration))
        .map(x => {
          let displayText = behaviorNameLookup[x.id + 'd'];
          if(!displayText) {
            displayText = x.name;
            displayText += ' duration';
          }
          return {
            behaviorId: x.id,
            displayText,
            faces: [],
            show: true,
            isDuration: true,
            targets: { duration: x.targetGoals.duration }
          } as StudentSummaryReportBehavior;
        }),
        ...(this.student.trackables.activeBehaviors
          .filter(x => !x.targetGoals.duration && !x.targetGoals.frequency))
          .map(x => {
            let displayText = behaviorNameLookup[x.id + 'd'];
            if(!displayText) {
              displayText = x.name;
            }
            return {
              behaviorId: x.id,
              displayText,
              faces: [],
              show: true,
              isDuration: x.isDuration
            } as StudentSummaryReportBehavior;
          })
    );
    retval.sort((a, b) => a.displayText.localeCompare(b.displayText));
    return retval;
  }

  async setLoading(val: boolean) {
    this.loading = val;
  }

  getNoAccessRestrictions() {
    return {
      data: AccessLevel.none,
      reports: AccessLevel.none,
      comments: AccessLevel.none
    } as UserSummaryRestrictions;
  }
  setupRestrictions() {
    if(!this.student) {
      this.restrictions = this.getNoAccessRestrictions();
    } else {
      this.restrictions = this.student.restrictions;
    }

    this.showStats = this.restrictions.data !== AccessLevel.none;
    this.preview = this.restrictions.reports === AccessLevel.read;
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }

  print() {
    const lastValue = this.preview;
    this.preview = true;
    window.print();
    this.preview = lastValue;
  }

  async loadReportList() {
    this.reportList = await this.student.reports.listSavedSnapshots();
  }

  async loadNotes(currentWeek: moment.Moment) {
    if(this.restrictions.comments !== AccessLevel.none) {
      this.notes = await this.student.reports.getNotes(currentWeek, currentWeek.clone().add(7, 'days'))
    } else {
      this.notes = [];
    }
  }

  calculateDay(behavior: StudentSummaryReportBehavior, reportData: ReportData[]) {
    let retval = 0;
    if(!behavior.isDuration) {
      retval = reportData.length;
    } else {
      const durations: number[] = [];
      let startDate: moment.Moment;
      let total = 0;
      for(let data of reportData.filter(y => y.behavior == behavior.behaviorId)) {
        if(!startDate) {
          startDate = moment(data.dateEpoc);
          continue;
        }

        const duration = moment(data.dateEpoc).diff(startDate, 'seconds')
        durations.push(duration);
        total += duration;
        startDate = undefined;
      }
      durations.sort((a, b) => a - b);
      if(durations.length > 0) {
        if(behavior.targets?.avg) {
          retval = total / durations.length;
        } else if (behavior.targets?.max) {
          retval = durations[durations.length - 1];
        } else if (behavior.targets?.min) {
          retval = durations[0];
        } else if (behavior.targets?.sum) {
          retval = total;
        }
      }
    }
    return retval;
  }

  async calculateStats() {
    const report = await this.cacheReports.report;
    this.last = await this.cacheReports.last;

    if(this.current) {
      const includeDays = this.current.includeDays?.map(y => moment(y)) ?? [];
      const excludeDays = this.current.excludeDays?.map(y => moment(y)) ?? [];
      this.daysOfWeek.forEach((val, index) => {
        const onDay = moment(this._weekStart).add(index, 'days');
        // val.dataSaved = !report.behaviors? false : report.behaviors.find(x => x.faces[index] != undefined)? true : false;
        val.show = true;
        const today = moment();
        if(onDay.isAfter(today)) {
          console.log('Removing date', onDay.format('MM-DD-yyyy'));
          val.show = false;
        } else if(includeDays.find(y => y.isSame(onDay, 'day'))) {
          val.show = true;
        } else if(excludeDays.find(y => y.isSame(onDay, 'day'))) {
          val.show = false;
        } else if(this.student.dashboard &&
          this.student.dashboard.autoExcludeDays &&
          this.student.dashboard.autoExcludeDays.findIndex(y => y === index) >= 0) {
          const studentDashboard = this.student.dashboard;
          val.show = studentDashboard.autoExcludeDays.findIndex(y => y === index) < 0;
        } else {
          val.show = index != 0 && index != 6;
        }
      });
    }

    if(!this.snapshotConfig.measurements) {
      
      this.snapshotConfig.measurements = [
        { name: this.snapshotConfig.high ?? '@smile', order: 0 },
        { name: this.snapshotConfig.medium ?? '@meh', order: 1 },
        { name: this.snapshotConfig.low ?? '@frown', order: 2 }
      ];
    }
    const defaultFace = this.snapshotConfig.measurements[0].name;
    this.behaviors.forEach(behavior => {
      if(this.showStats && this.current && this.current) {
        const day = this._currentDay.weekday();
        const currentWeekCount = this.calculateDay(behavior, this.current.data.filter(y => y.behavior == behavior.behaviorId && moment(y.dateEpoc).weekday() <= day));
        const lastWeekCount = this.calculateDay(behavior, this.last.data.filter(y => y.behavior == behavior.behaviorId && moment(y.dateEpoc).weekday() <= day));
        const dayStats: { count: number, delta: number, modifier: string }[] = []

        this.daysOfWeek.forEach(weekday => {
          const currentDayCount = this.calculateDay(behavior, this.current.data.filter(y => y.behavior == behavior.behaviorId && moment(y.dateEpoc).weekday() == weekday.offset));
          const lastDayCount = this.calculateDay(behavior, this.current.data.filter(y => y.behavior == behavior.behaviorId && moment(y.dateEpoc).weekday() == weekday.offset - 1));

          const dataOffset = weekday.offset;
          if(!behavior.faces[dataOffset]) {
            behavior.faces[dataOffset] = { face: '' };
          }

          const item = behavior.faces[dataOffset];
          
          if(!item.overwrite) { 
            let indicator = 'smile';
            if(behavior.targets) {
              let evaluation: StudentSummaryReportBehaviorTarget = behavior.targets.frequency || behavior.targets['duration'];
              let legendItem = this._legend.find(y => y.behavior == behavior.behaviorId && y.measurement == evaluation.measurement);
              const legendKeys = legendItem? [...legendItem.measurements] : [];

              if(evaluation && legendKeys.length > 0) {
                if(evaluation.target < evaluation.progress) {
                  indicator = legendKeys[legendKeys.length - 1].name;
                  for(let i = 0; i < legendKeys.length; i++) {
                    const key = legendKeys[i];
                    if(key.value >= currentDayCount) {
                      indicator = key.name;
                      break;
                    }
                  }
                } else {
                  indicator = legendKeys[0].name;
                  for(let i = 0; i < legendKeys.length; i++) {
                    const key = legendKeys[i];
                    if(key.value <= currentDayCount) {
                      indicator = key.name;
                      break;
                    }
                  }
                }
              }
              item.face = indicator;
            } else if(!item.face) {
              item.face = defaultFace;
            }
          }

          dayStats[dataOffset] = {
            count: currentDayCount,
            delta: currentDayCount - lastDayCount,
            modifier: currentDayCount - lastDayCount > 0? '+' : ''
          };
          if(!behavior.faces[dataOffset] || !behavior.faces[dataOffset].face) {
            behavior.faces[dataOffset] = { face: defaultFace, overwrite: true };
          }
        });

        behavior.stats = {
          week: {
            count: currentWeekCount,
            delta: currentWeekCount - lastWeekCount,
            modifier: currentWeekCount - lastWeekCount > 0? '+' : ''
          },
          day: dayStats[day]
        };
      }
    });
  }

  async loadReport() {
    if(!this.student || !this.userId) {
      return;
    }
    this.setLoading(true);
    const currentWeek = moment(this._currentDay).add(this._currentDay.get('weekday') * -1, 'days');
    this.daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((y, index) => ({ 
      text: y, 
      show: true, 
      offset: index, 
      date: moment(currentWeek).add(index, 'days').format('MM/DD/yyyy'),
      dataSaved: ''
    }));
    const lastWeek = moment(currentWeek).add(-7, 'days');
    let current: Promise<ReportDetails>;
    let last: Promise<ReportDetails>;
    let reportPromise: Promise<StudentSummaryReport>;
    if(currentWeek.isSame(this.cacheReports.weekStart)) {
      current = this.cacheReports.current;
      last = this.cacheReports.last;
      reportPromise = this.cacheReports.report;
    } else {
      current = this.showStats? this.student.reports.getReport(currentWeek, currentWeek.clone().add(1, 'week')) : {} as any;
      last = this.showStats? this.student.reports.getReport(lastWeek, currentWeek) : {} as any;  
      reportPromise = this.student.reports.getSnapshot(this._currentDay);
  
      this.cacheReports.current = current;
      this.cacheReports.last = last;
      this.cacheReports.report = reportPromise;
      this.cacheReports.weekStart = currentWeek;

      const originReport = await reportPromise;
      this.originalFaces = originReport.behaviors? originReport.behaviors : this.student.trackables.behaviors.map(x => ({ faces: []} as StudentSummaryReportBehavior));
    }
    
    this.loadNotes(currentWeek);

    this.current = await current;
    const report = await reportPromise;
    if(!report.behaviors) {
      report.behaviors = await this.createDefaultBehaviorList()
    }
    if(!report.legend) {
      report.legend = [];

    }
    this._legend = report.legend;
    this._showLegend = report.legend.length > 0? true : false;
    this.message = report.message;
    if(report.message && Object.keys(report.message).length == 0) {
      this.message = undefined;
    }
    this.reloadLegend();

    if(this.current) {
      const includeDays = this.current.includeDays?.map(y => moment(y)) ?? [];
      const excludeDays = this.current.excludeDays?.map(y => moment(y)) ?? [];
      this.daysOfWeek.forEach((val, index) => {
        const onDay = moment(this._weekStart).add(index, 'days');
        val.show = true;
        const today = moment();
        if(onDay.isAfter(today)) {
          console.log('Removing date', onDay.format('MM-DD-yyyy'));
          val.show = false;
        } else if(includeDays.find(y => y.isSame(onDay, 'day'))) {
          val.show = true;
        } else if(excludeDays.find(y => y.isSame(onDay, 'day'))) {
          val.show = false;
        } else if(this.student.dashboard &&
          this.student.dashboard.autoExcludeDays &&
          this.student.dashboard.autoExcludeDays.findIndex(y => y === index) >= 0) {
          const studentDashboard = this.student.dashboard;
          val.show = studentDashboard.autoExcludeDays.findIndex(y => y === index) < 0;
        } else {
          val.show = index != 0 && index != 6;
        }
      });
    } else {
      this.daysOfWeek.forEach((val, index) => {
        val.show = !report.behaviors? false : report.behaviors.find(x => x.faces[index] != undefined)? true : false;
      });
    }

    this.behaviors.forEach(behavior => {
      delete behavior.faces;

      if(report.behaviors) {
        const existingBehavior = report.behaviors.find(y => y.behaviorId === behavior.behaviorId && y.isDuration == behavior.isDuration);
        if(existingBehavior) {
          behavior.stats = existingBehavior.stats ?? behavior.stats;
          behavior.faces = existingBehavior.faces ?? behavior.faces;
          behavior.displayText = existingBehavior.displayText ?? behavior.displayText;
          behavior.show = existingBehavior.show == undefined? existingBehavior.show : behavior.show;
          behavior.targets = Object.keys(existingBehavior.targets ?? {}).filter(key => existingBehavior.targets[key]).length == 0? behavior.targets : existingBehavior.targets;
        }
      }
      if(!behavior.faces) {
        behavior.faces = [];
      }
    });
    await this.calculateStats();

    this.daysOfWeek.forEach((onDay, index) => {
      if(!onDay.show) {
        return;
      }
      let matchSaved = 'saved';
      const defaultSaved = moment(onDay.date).isSame(this._currentDay, 'day')? 'modified' : '';
      this.originalFaces.forEach((ofb, ofbi) => {
        try {
          const reportBehavior = report.behaviors.find(y => y.behaviorId == ofb.behaviorId);
          if(!reportBehavior) {
            matchSaved = 'modified';
          } else if(!reportBehavior.faces ||
            !reportBehavior.faces[index] ||
            !ofb.faces[index] ||
            reportBehavior.faces[index].face !== ofb.faces[index].face && matchSaved) {
            matchSaved = defaultSaved;
          }
        }catch (err) {
          console.error(err);
          throw err;
        }
      });
      if(!matchSaved && !defaultSaved) {
         matchSaved = report.behaviors.find(x => x && x.faces && x.faces[index] != undefined)? 'modified' : defaultSaved;
      }
      onDay.dataSaved = matchSaved;
    });
    this.setLoading(false);
  }

  getShownBehaviors() {
    if(!this.behaviors) {
      return;
    }
    return this.behaviors.filter(x => x.show);
  }
  reloadLegend() {
    if(!this._legend) {
      return;
    }
    this._legend.splice(0);
    for(let b of this.student.trackables.behaviors) {
      b.targetGoals.setTargets();
      for(let i in b.targetGoals.dataModel) {
        const k = b.targetGoals.dataModel[i];
        const value = {
          behavior: b.id,
          measurement: k.measurement,
          target: k.target,
          progress: k.progress,
          measurements: k.measurements?.length > 0? k.measurements.map((m, i) => ({
            name: m.name,
            value: m.value,
            color: colors[Math.floor(i / k.measurements.length * colors.length)],
            order: this.snapshotConfig.measurements.findIndex(x => x.name == m.name)
          })) : [
            { name: this.snapshotConfig?.low ?? '@frown', value: k.progress < k.target? StudentBehaviorTargetMin : StudentBehaviorTargetMax, color: colors[6], order: 1},
            { name: this.snapshotConfig?.medium ??'@meh', value: k.progress, color: colors[3], order: 2 },
            { name: this.snapshotConfig?.high ?? '@smile', value: k.target, color: colors[0], order: 3 }
          ]
        } as StudentSummaryReportLegend;
        value.measurements.sort((a, b) => a.order - b.order);
        this._legend.push(value);
      }
    }
  }

  getBehaviorLegend(behavior: StudentSummaryReportBehavior) {
    if(!this._legend) {
      return {};
    }
    const retval = this._legend.find(x => x.behavior == behavior.behaviorId) ?? {};
    return retval;
  }
  getLegend() {
    if(!this.behaviors || !this._legend) {
      return;
    }
    return this._legend.filter(x => this.behaviors.find(y => y.behaviorId == x.behavior && y.show))
  }

  getLegendSupplement(legend: StudentSummaryReportLegend, item: { name: string, value: number }, index: number, type: 'goals' | 'remainder') {
    if(legend.target == undefined || legend.progress == undefined) {
      return;
    }
    
    const value = this.getDisplayValue(item.value, legend.measurement == MeasurementType.event);
    if(type == 'goals') {
      if(legend.target < legend.progress) {
        if(item.value == 0) {
          return value;
        }
        if(item.value == StudentBehaviorTargetMax) {
          return 'more than ' + this.getDisplayValue(legend.measurements[index - 1].value, legend.measurement == MeasurementType.event)
        }
        return value + ' or less';
      } else {
        if(item.value == StudentBehaviorTargetMin) {
          return 'less than ' + this.getDisplayValue(legend.measurements[index - 1].value, legend.measurement == MeasurementType.event)
        }
        return value + ' or more';
      }
    } else {
      if(legend.target < legend.progress) {
        return 'more than';
      } else {
        return 'less than';
      }
    }
  }
  getDisplayName(legend: StudentSummaryReportLegend) {
    if(!this.behaviors) {
      return;
    }
    const behavior = this.behaviors.find(x => x.behaviorId == legend.behavior && x.isDuration == !(legend.measurement == MeasurementType.event));
    if(!behavior) {
      return '';
    }
    return behavior.displayText;
  }

  getMessage() {
    if(!this.message || Object.keys(this.message).length == 0) {
      return '';
    }
    const retval = toHTML(this.message);
    return retval;
  }

  getName(behaviorId: string) {
    return this.student.trackables.getBehaviorName(behaviorId);
  }

  setReportStatus(face: string, behavior: StudentSummaryReportBehavior) {
    behavior.faces[this.weekdayOffset].face = face;
    behavior.faces[this.weekdayOffset].overwrite = true;
  }

  public downloadAsPDF() {
    const doc = new jsPDF();
    
    const pdfTable = this.pdfTable.nativeElement;
    
    var html = htmlToPdfmake(pdfTable.innerHTML);
      
    const documentDefinition = { content: html };
    pdfMake.createPdf(documentDefinition).open(); 
      
  }

  async setSaving(val: boolean) {
    this.saving = val;
  }

  async save() {
    this.setSaving(true);

    try {
      this._legend = this._legend.filter(x => x.progress? true : false);

      const snapshot: StudentSummaryReport = {
        studentId: this.student.studentId,
        date: this._currentDay.format('yyyy-MM-DD'),
        message: this.message,
        behaviors: JSON.parse(JSON.stringify(this.behaviors)) as any,
        legend: this._legend,
        lastModified: { userId: '', date: '' },
        type: 'Weekly',
        version: 1
      }

      snapshot.legend = snapshot.legend?.filter(x => x.measurements.find(y => y.value == undefined) != undefined);

      await this.student.reports.saveSnapshot(snapshot)
      this.cacheReports = { weekStart: null, current: null, last: null, report: null };;

      if(this.daysOfWeek && this.daysOfWeek[this.weekdayOffset]) {
        this.daysOfWeek.forEach(x => {
          if(x.dataSaved) {
            x.dataSaved = 'saved';
          }
        });
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      this.setSaving(false);
    }
  }

  getStatusColor(text: string) {
    const item = this.snapshotConfig.measurements.find(x => x.name == text);

    if(!item) {
      return '';
    }
    return colors[Math.floor(item.order / this.snapshotConfig.measurements.length * colors.length)];
  }
  getFaceColor(behavior: StudentSummaryReportBehavior, index) {
    if(!behavior || !behavior.faces || !behavior.faces[index]) {
      return '';
    }
    return this.getStatusColor(behavior.faces[index].face);
  }
  getStatusName(behavior: StudentSummaryReportBehavior, index) {
    if(!behavior || !behavior.faces || !behavior.faces[index]) {
      return '';
    }
    return behavior.faces[index].face;
  }
  isFace(behavior: StudentSummaryReportBehavior, index) {
    if(!behavior || !behavior.faces || !behavior.faces[index]) {
      return '';
    }

    return behavior.faces[index].face.startsWith('@');
  }
  getFace(behavior: StudentSummaryReportBehavior, index) {
    if(!behavior || !behavior.faces || !behavior.faces[index]) {
      return '';
    }

    return `fa-${behavior.faces[index].face}-o`;
  }
  setFace(behavior: StudentSummaryReportBehavior, index: number, value: string) {
    if(!behavior || !behavior.faces) {
      return '';
    }
    if(!behavior.faces[index]) {
      behavior.faces[index] = { face: '' };
    }
    behavior.faces[index].face = value;
  }

  hasTargetEval(behavior: StudentSummaryReportBehavior) {
    if(!behavior) {
      return false;
    }
    return behavior.targets && 
      Object.values(behavior.targets)
      .filter(x => {
        return x && x.target !== undefined && x.progress !== undefined
      }).length > 0 &&
      !this.restrictions.reportsOverride;
  }

  getTimeLegend(legend: StudentSummaryReportLegend) {
    if(legend.measurement != MeasurementType.event) {
      return '[hh:]mm:ss';
    }
  }

  getDuration(stat: number) {
    if(stat == undefined || Number.isNaN(stat)) { 
      return '';
    }
    const absState = Math.abs(stat);
    const seconds = Math.floor(absState % 60);
    const minutes = Math.floor(absState/60) % 60;
    const hour = Math.floor(absState / 3600);

    if(hour == 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${hour}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getDisplayValue(count: number, isEvent: boolean) {
    if(isEvent) {
      return `${count}`;
    }
    return this.getDuration(count);
  }
  getStatDisplayValue(behavior: StudentBehavior, count: number) {
    const retval = this.getDisplayValue(count, behavior.isDuration != true || (behavior['measurement'] && behavior['measurement'] != MeasurementType.event));
    const decimalIndex = retval.indexOf('.');
    if(decimalIndex > -1) {
      return retval.substring(0, decimalIndex + 2);
    }
    return retval;
  }

  isMaxMin(val: number) {
    return val == StudentBehaviorTargetMax || val == StudentBehaviorTargetMin;
  }
}
