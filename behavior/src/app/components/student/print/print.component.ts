import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ViewerConfigService, UserService, DateTimeService, ChartUtilsService,
  ApiClientService, MetricType, ReportData, ReportDefinitionMetric, moment,
  StudentClass
} from '../../..';
import { colors, Dashboard2Component, TableData } from '../dashboard2/dashboard2.component';
import { ChartConfiguration, ScriptableContext } from 'chart.js';
import { StudentDashboardSettings } from '@mytaptrack/types';
import { filter } from 'rxjs';

interface Day {
  frequency: DayPart;
  duration: DayPart;
  notes: string;
  date: moment.Moment;
  scheduleName: string;
};

interface DayPart {
  scheduleName: string;
  chart: ChartConfiguration;
  dayDetails: any[]
  hasData: boolean;
};

interface StatDetails {
  behaviorName: string;
  color: string;
  count: number;
  average?: number;
  dayAverage?: number;
  percent?: number;
  days?: { [key: string]: { count: number; sum?: number, avg?: number }}
}

@Component({
  selector: 'app-print',
  templateUrl: './print.component.html',
  styleUrls: ['./print.component.scss'],
  standalone: false
})
export class PrintComponent extends Dashboard2Component implements OnInit {
  public days: Day[] = [];
  public frequencyStats: ChartConfiguration;
  public durationStats: ChartConfiguration;
  public abcStatsChart: ChartConfiguration;
  public frequencyStatDetails: StatDetails[] = [];
  public durationStatDetails: StatDetails[] = [];
  public durationMeasurement: string;
  public percentLoaded: number;
  public showDayDetails = true;
  public showNotes = true;
  private _hideExcluded = false;
  get hideExcluded() { return this._hideExcluded; }
  set hideExcluded(val: boolean) {
    this._hideExcluded = val;
    this.load();
  }

  public get loadPercent() {
    return Math.round(this.percentLoaded * 100);
  }

  constructor(userService: UserService,
    chartService: ChartUtilsService,
    dateService: DateTimeService,
    viewerConfigService: ViewerConfigService,
    router: Router,
    route: ActivatedRoute,
    cd: ChangeDetectorRef,
    private apiClient: ApiClientService) {
    super(userService, chartService, dateService, viewerConfigService, router, route, cd);
  }

  public ngOnInit(): void {
    this.percentLoaded = 0;
    super.ngOnInit();
  }

  public async loadDay() {
    this.showAbc = this.features.abc;

    if (!this.student) {
      return;
    }

    //
    // Generate frequency data
    //
    const dates: moment.Moment[] = [];
    const currentDay = moment(this.startDate);
    do {
      dates.push(currentDay.clone());
      currentDay.add(1, 'day');
    } while (currentDay.isBefore(this.endDate));
    const loadStep = 1 / (dates.length + 2);

    this.percentLoaded = loadStep;

    const reportConfig = await this.student.reports.getDashboardSettings();

    this.frequencyStatDetails = [];
    const durationStarted: { [key: string]: boolean } = {};
    const student = this.student;
    // this.reportData.data.forEach(x => {
    //   this.loadFrequencyStats(x, student, durationStarted, reportConfig);
    // });

    this.frequencyStatDetails = this.student.trackables.behaviors.filter(x => !x.isArchived).map(behavior => {
      let onDate = this.startDate.clone();
      const days: {[key: string]: { count: number }} = {};
      while(onDate.isBefore(this.endDate)) {
        const dateString = onDate.format('MM/DD/yyyy');
        if(!this.reportData.includeDays.find(d => d == dateString) && (
          this.reportData.excludeDays.find(d => d == dateString) || (reportConfig && reportConfig.autoExcludeDays && reportConfig.autoExcludeDays.find(d => d == onDate.weekday())))) {
          onDate = onDate.add(1, 'day');
          continue;
        }
  
        const dayEvents = this.reportData.data.filter(d => d.behavior == behavior.id && (!behavior.isDuration || d.duration != undefined) && moment(d.dateEpoc).isSame(onDate, 'day'));
        days[dateString] = {
          count: dayEvents.length
        }
        onDate.add(1, 'day');
      }

      let color = this.metrics.find(y => y.id == behavior.id);
      if (!color) {
        color = {
          id: behavior.id,
          name: behavior.name,
          color: colors[this.metrics.length % colors.length][1],
          deviceIds: [],
          timeline: undefined
        };
        this.metrics.push(color);
      }

      const dayCounts = Object.values(days);
      
      const retval = {
        behaviorName: behavior.name,
        count: dayCounts.length > 0? dayCounts.map(d => d.count).reduce((a, b) => a + b) : 0,
        color: color.color,
        days
      };
      return retval;
    }).filter(x => x? true : false);

    let maxEvents = this.frequencyStatDetails.length > 0 ? this.frequencyStatDetails.map(x => x.count).reduce((p, c) => p + c) : 0;
    if (Number.isNaN(maxEvents) || maxEvents == 0) {
      maxEvents = 1;
    }
    this.frequencyStatDetails.forEach(x => {
      const percent = x.count / maxEvents * 1000;
      x.percent = Math.round(percent) / 10;
    });

    const reportData = this.reportData;
    this.durationMeasurement = 'sec';
    this.durationStatDetails = this.student.trackables.activeBehaviors.filter(x => x.isDuration)
      .map(x => {
        const maxDays = moment(this.endDate).diff(this.startDate, 'days');
        const filteredData = reportData.data.filter(y => {
          if(y.behavior != x.id) {
            return;
          }
          const date = moment(y.dateEpoc).startOf('day');
          const dateString = date.format('yyyy-MM-DD');
          if(!reportData.includeDays.find(d => d == dateString) && (
            reportData.excludeDays.find(d => d == dateString) || (reportConfig && reportConfig.autoExcludeDays && reportConfig.autoExcludeDays.find(d => d == date.weekday())))) {
            return;
          }
          return true;
        });
        const durationData = this.chartService.getDurationData(filteredData, this.startDate, maxDays);
        const metric = this.metrics.find(y => y.id == x.id);
        const retval: StatDetails = {
          behaviorName: x.name,
          color: metric ? metric.color : undefined,
          count: durationData.length == 0 ? 0 : Math.round(10 * (durationData.length > 0 ? durationData.map(y => y.duration).reduce((p: number, c: number) => {
            return p + c;
          }) : 0)) / 10
        };
        retval.average = Math.round(10 * retval.count / durationData.length) / 10;
        if (Number.isNaN(retval.average)) {
          retval.average = 0;
        }
        if (retval.count > 60 * 5) {
          this.durationMeasurement = 'min';
        }
        const days: { [key: string]: { count: number; sum: number, avg: number } } = {};
        let onDate = this.startDate.clone();
        while(onDate.isBefore(this.endDate)) {
          const dateString = onDate.format('MM/DD/yyyy');
          if(!reportData.includeDays.find(d => d == dateString) && (
            reportData.excludeDays.find(d => d == dateString) || (reportConfig && reportConfig.autoExcludeDays && reportConfig.autoExcludeDays.find(d => d == onDate.weekday())))) {
            onDate = onDate.add(1, 'day');
            continue;
          }
          const daysData = filteredData.filter(d => moment(d.dateEpoc).isSame(onDate, 'day') && d.duration);
          const duration = daysData.length > 0 ? daysData.map(d => d.duration).reduce((a, b) => a + b) : 0;
          days[dateString] = {
            count: daysData.length,
            sum: Math.round((duration / 1000) * 10) / 10,
            avg: daysData.length > 0? Math.round((duration / 1000) / daysData.length * 10) / 10 : 0
          };
          onDate = onDate.add(1, 'day');
        }
        retval.days = days;
        retval.dayAverage = Math.round(retval.count / Object.keys(days).length * 10) / 10;
        console.info('Behavior Stat', x.name, retval);
        return retval;
      });

    this.durationStatDetails.forEach(ds => {
      if(this.durationMeasurement != 'min') {
        return;
      }
      ds.average = Math.round(ds.average / 60 * 10) / 10;
      ds.count = Math.round(ds.count / 60 * 10) / 10;
      ds.dayAverage = Math.round(ds.dayAverage / 60 * 10) / 10;

      if(ds.days) {
        Object.values(ds.days).forEach(e => {
          e.sum = Math.round(e.sum / 60 * 10) / 10;
          e.avg = Math.round(e.avg / 60 * 10) / 10;
        });
      }
    })
    let maxDuration = this.durationStatDetails.length == 0 ? 0 : this.durationStatDetails.map(y => y.count).reduce((p, c) => p + c);
    if (Number.isNaN(maxDuration) || maxDuration == 0) {
      maxDuration = 1;
    }
    this.durationStatDetails.forEach(x => {
      x.percent = Math.round(1000 * x.count / maxDuration) / 10;
    });

    this.frequencyStats = {
      type: 'polarArea',
      data: {
        labels: this.frequencyStatDetails.map(x => x.behaviorName),
        datasets: [{
          data: this.frequencyStatDetails.map(x => x.count),
          backgroundColor: (y: ScriptableContext<"bar">, options) => {
            const data = this.frequencyStatDetails[y.dataIndex];
            if (data?.color?.length == 4) {
              return data?.color + '8';
            }
            return data?.color + '88';
          },
          borderColor: (y: ScriptableContext<"bar">, options) => {
            const data = this.frequencyStatDetails[y.dataIndex];
            return data?.color;
          }
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Frequency',
            font: {
              size: 24
            }
          }
        }
      }
    };
    this.durationStats = null;
    if (this.durationStatDetails && this.durationStatDetails.length > 0) {
      this.durationStats = {
        type: 'polarArea',
        data: {
          labels: this.durationStatDetails.map(x => x.behaviorName),
          datasets: [{
            data: this.durationStatDetails.map(x => this.durationMeasurement == 'min' ? x.count / 60 : x.count),
            backgroundColor: (y: ScriptableContext<"bar">, options) => {
              const data = this.durationStatDetails[y.dataIndex];
              if (data?.color.length == 4) {
                return data?.color + '8';
              }
              return data?.color + '88';
            },
            borderColor: (y: ScriptableContext<"bar">, options) => {
              const data = this.durationStatDetails[y.dataIndex];
              return data?.color;
            },
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: `Accumulated Duration (${this.durationMeasurement})`,
              font: {
                size: 24
              }
            }
          }
        }
      };
    }

    if (this.abcStats && this.abcStats.length > 0) {
      this.abcStatsChart = {
        type: 'doughnut',
        data: {
          labels: this.abcStats.map(x => `${x.a},${x.b},${x.c} - ${x.percent}%`),
          datasets: [{
            data: this.abcStats.map(x => x.percent),
            backgroundColor: (y: ScriptableContext<"bar">, options) => {
              const data = this.frequencyStatDetails[y.dataIndex];
              if (data?.color.length == 4) {
                return data?.color + '8';
              }
              return data?.color + '88';
            },
            borderColor: (y: ScriptableContext<"bar">, options) => {
              const data = this.frequencyStatDetails[y.dataIndex];
              return data?.color;
            }
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            title: {
              display: true,
              text: 'ABC',
              font: {
                size: 24
              }
            }
          }
        }
      };
    } else {
      this.abcStatsChart = null;
    }

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


    this.percentLoaded += loadStep;

    this.days = [];
    for (let x of dates) {
      const schedule = await this.student.schedules.getSchedule(x);
      const [frequency, duration] = await Promise.all([
        this.getChartAndData(occuranceMetrics, 'barchart', x),
        this.getChartAndData(occuranceMetrics, 'duration', x)
      ]);
      let notes;

      try {
        notes = await this.apiClient.getNotes(this.student.studentId, moment(x).toDate().toString());
      } catch (err) {
        console.error(err);
      }

      this.percentLoaded += loadStep;

      this.days.push({
        frequency,
        duration,
        notes: notes?.notes ?? '',
        date: x,
        scheduleName: schedule?.name
      } as Day);
    }
    this.days = this.days.filter(x => x.duration.hasData || x.frequency.hasData || (x.notes && x.notes.length > 0));
  }

  finalizeOverviewChart() {
    if(this.hideExcluded) {
      for(let ind = this.frequencyChart.data.labels.length - 1; ind >= 0; ind--) {
        const hasUndefined = this.frequencyChart.data.datasets.findIndex(ds => ds.data[ind] == undefined);
        if(hasUndefined >= 0) {
          this.frequencyChart.data.labels.splice(ind, 1);
          this.frequencyChart.data.datasets.forEach(ds => {
            ds.data.splice(ind, 1);
          });
        }
      }

      for(let ind = this.durationChart.data.labels.length - 1; ind >= 0; ind--) {
        const hasUndefined = this.durationChart.data.datasets.findIndex(ds => ds.data[ind] == undefined);
        if(hasUndefined >= 0) {
          this.durationChart.data.labels.splice(ind, 1);
          this.durationChart.data.datasets.forEach(ds => {
            ds.data.splice(ind, 1);
          });
        }
      }
    }
  }

  private async getChartAndData(occuranceMetrics: ReportDefinitionMetric[], chartType: 'barchart' | 'duration', currentDay: moment.Moment): Promise<DayPart> {
    const chartModel = this.chartService.createChartData(
      {
        studentId: this.student.studentId,
        style: {
          type: chartType,
          width: 600,
          fill: true,
          colors: []
        },
        metrics: occuranceMetrics,
        excludeDates: this.excludeDates,
        includeDates: this.includeDates,
        scheduledExcludes: this.scheduledExcludes
      }, this.reportData,
      this.behaviorsAndResponses.filter(b => occuranceMetrics.find(m => m.id === b.id)), 1, true, 5, currentDay);

    const scheduleResults = await this.student.schedules.getScheduleAndItems(this.reportData, currentDay, this);
    const scheduleItems = scheduleResults.activities;
    scheduleResults.name;
    const dayDetails = [].concat(...(scheduleItems
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
            if (!item.behavior) {
              return false;
            }
            if (!occuranceMetrics.find(m => m.id === item.behavior)) {
              return false;
            }
            if (chartType === 'barchart') {
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
              canDelete: false
            } as TableData
          });
      })));
    return {
      scheduleName: scheduleResults.name,
      chart: chartModel,
      dayDetails,
      hasData: dayDetails.find(x => x.raw) ? true : false
    };
  }
  getAntecedent(data: ReportData) {
    if (!data || !data.abc) {
      return '';
    }
    return data.abc.a;
  }
  getConsequence(data: ReportData) {
    if (!data || !data.abc) {
      return '';
    }
    return data.abc.c;
  }
  getDayCount(stat: StatDetails, date: string) {
    if(!stat?.days) {
      console.info('Could not get stat days', stat);
      return 0;
    }
    if(!stat.days[date]) {
      console.info('Could not get day stats', stat);
      return 0;
    }
    return stat.days[date].count;
  }

  goToReportDetails(event: any) {
    // Handle chart click event - placeholder implementation
    console.log('Chart clicked:', event);
  }
}
