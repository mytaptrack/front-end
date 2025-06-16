import { Injectable } from '@angular/core';
import { 
  ReportDefinition, StudentBehavior, MetricType, ReportDefinitionMetric, ReportData, 
  CalculationType, moment, } from '../types';
import * as typesV2 from '../types';
import { ChartDataset, ChartData, ChartConfiguration, Chart, TooltipModel, BubbleDataPoint } from 'chart.js';
import { DateTimeService } from './date-time.service';

const defaultShapes = [
  { shape: 'circle', radius: 5}, 
  { shape: 'rect', radius: 8}, 
  { shape: 'rectRot', radius: 8},
  { shape: 'triangle', radius: 10}
];

export interface IntervalModel {
  dayStart: moment.Moment;
  dayEnd: moment.Moment;
  startHour: number;
  endHour: number;
  data: string[][];
}

interface ProcessingReportData {
  behavior: StudentBehavior;
  source: {
    device: string;
    rater?: string;
  };
  date: moment.Moment;
  duration?: number;
  start?: boolean;
}

interface tooltipParams {
  body: {
    lines: string[];
  }[];
  dataPoints: {
    datasetIndex: number;
    index: number;
    label: string;
    value: string;
    x: number;
    xLabel: string;
    y: number;
    yLabel: number;
  }[];
  width: number;
}

interface ReportDetails {
  datasets: ChartDataset[];
  labels: string[];
  maxValue: number;
  minValue: number;
  chartType: string;
  beginAt0: boolean;
  xAxisMax: number;
  minStep?: number;
  customTips?: (tooltipItem: any, data: ChartData) => void;
  yTickCallback?: (val: number) => string;
}

interface DurationChartData {
  minutes: number; 
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChartUtilsService {
  public static readonly weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  constructor(private dateService: DateTimeService) { }

  createChartData(report: ReportDefinition, reportData: typesV2.ReportDetails, behaviors: StudentBehavior[], maxDays: number = 7, showTargets: boolean = true, trackedDaysPerWeek: number = 5, startDate: moment.Moment = null, errors: string[] = []): ChartConfiguration {
    let reportDetails: ReportDetails;
    let yTickCallback = function (value) {
      return value;
    };

    if(!startDate) {
      startDate = moment(reportData.startMillis);
    }

    let customTips: (tooltipItem: any, data: ChartData) => string = () => { 
      return '';
    };
    let showTips = false;
    if (report.style.type === 'line') {
      reportDetails = this.getLineChartData(report, reportData, behaviors, startDate, maxDays, showTargets, trackedDaysPerWeek, errors);
      yTickCallback = ChartUtilsService.lineChartYTick;
      customTips = ChartUtilsService.durationChartYTick;
      showTips = true;
    } else if (report.style.type === 'bubble') {
      reportDetails = this.getBubbleChartData(report, reportData, behaviors, startDate, maxDays);
      yTickCallback = ChartUtilsService.bubbleChartYTick;
      // customTips = ChartUtilsService.bubbleChartTips;
    } else if (report.style.type === 'cluster') {
      reportDetails = this.getClusterChartData(report, reportData, behaviors, startDate, maxDays, 60*60);
      yTickCallback = ChartUtilsService.bubbleChartYTick;
      customTips = ChartUtilsService.bubbleChartTips;
      showTips = true;
    } else if (report.style.type === 'duration') {
      reportDetails = this.getDurationChart(report, reportData, behaviors, startDate, maxDays, errors);
      yTickCallback = reportDetails.yTickCallback;
      customTips = ChartUtilsService.durationChartYTick;
    } else if (report.style.type === 'barchart') {
      reportDetails = this.getBarChartData(report, reportData, behaviors, maxDays, startDate);
      yTickCallback = this.barChartTickCallback;
    }

    const plugins = [
      {
        id: 'datalabels',
        formatter: function (value, context) {
          return '';
        },
        afterLayout: (chart) => {
          const x = chart;
        }
      }
    ];


    const retval = {
      type: reportDetails.chartType as any,
      data: {
        labels: reportDetails.labels,
        datasets: reportDetails.datasets,
      },
      options: {
        tooltips: {
          enabled: showTips,
          callbacks: {
            label: (d, t) => {
              return customTips(d, t);
            }
          }
        },
//        plugins,
        scales: {
          yAxis: {
            type: 'linear',
            min: reportDetails.minValue,
            max: reportDetails.maxValue,
            ticks: {
              stepSize: reportDetails.minStep !== undefined? reportDetails.minStep : (reportDetails.maxValue - reportDetails.minValue) / 5,
              callback: yTickCallback
            }
          }
        },
        layout: {
          padding: {
            left: 5,
            right: 0,
            top: 0,
            bottom: 0
          }
        }
      }
    } as ChartConfiguration;

    if(reportDetails.labels.length == 0) {
      retval.options.scales.xAxis = reportDetails.labels.length > 0? undefined : {
        type: 'linear',
        position: 'bottom',
        min: 0,
        max: reportDetails.xAxisMax,
        ticks: {
          stepSize: 1,
          autoSkip: false,
          // Include a dollar sign in the ticks
          callback: function (value, index, values) {
            if (typeof value === 'number') {
              if(maxDays <= 7) {
                return ChartUtilsService.weekday[value % 7];
              } else {
                if(value === Math.floor(value)) {
                  if(maxDays > 13 && value % (Math.floor(maxDays / 7)) != 0) {
                    return '';
                  }
                  const date = moment(startDate).add(value, 'days');
                  return date.format('MM/DD/yyyy');
                }
                return '';
              }
            }
            return value;
          }
        }
      };
    }
    return retval;
  }

  private getBubbleChartData(report: ReportDefinition, reportData: typesV2.ReportDetails, behaviors: StudentBehavior[], startDate: moment.Moment, maxDays: number): ReportDetails {
    return this.getClusterChartData(report, reportData, behaviors, startDate, maxDays, 10);
  }
  
  private getClusterChartData(report: ReportDefinition, reportData: typesV2.ReportDetails, behaviors: StudentBehavior[], startDate: moment.Moment, maxDays: number, pointsPerHour: number = 120): ReportDetails {
    let datasets: ChartDataset[] = [];
    let minValue = 6;
    let maxValue = 18;
    let maxSizeValue = 1;

    for (let i = 0; i < report.metrics.length; i++) {
      let item = report.metrics[i];
      item.name = this.getMetricName(item, behaviors);

      const data = reportData.data.filter(dataItem => {
        if(dataItem.behavior !== item.id) {
          return false;
        }
        const deviceIdFound = dataItem.source? item.deviceIds.indexOf(dataItem.source?.rater) >= 0 : false;
        if((item.deviceIds.length === 0 || !item.deviceIds[0]) || (dataItem.source && deviceIdFound)) {
          return true;
        }
        if(!dataItem.source) {
          return false;
        }
        return false;
      });
      data.sort((a, b) => { return a.dateEpoc - b.dateEpoc; });

      let graphdata = [];
      let datamap = [];
      let startTime: moment.Moment = null;
      const offset = i / report.metrics.length / 2;
      for (let ii = 0; ii < data.length; ii++) {
        let date = moment(data[ii].dateEpoc);
        if (date.isBefore(startDate)) {
          continue;
        }
        let diffDays = date.diff(startDate, 'days') + offset;
        if (diffDays >= maxDays) {
          continue;
        }

        if(item.metricType && item.metricType.toString() !== 'occurance' && item.metricType !== MetricType.occurence && !startTime) {
          startTime = date;
          continue;
        }
        const duration = (startTime)? (date.diff(startTime, 'milliseconds')) / (60 * 1000) : 0;
        startTime = null;

        let timePosition = 0;
        if(pointsPerHour < 60) {
          timePosition = date.hours() + (Math.ceil(date.minutes() / (60 / pointsPerHour)) * (60 / pointsPerHour) / 60);
        } else {
          timePosition = date.hours() + (Math.ceil((date.minutes() * 60 + date.seconds()) / ((60 * 60) / pointsPerHour)) * ((60 * 60) / pointsPerHour) / (60 * 60));
        }
        if (datamap[diffDays] == undefined) {
          datamap[diffDays] = [];
        }

        if (datamap[diffDays][timePosition] == undefined) {
          let datapoint = {
            x: diffDays,
            y: timePosition,
            r: 1,
            title: moment(date).format('hh:mm:ss A')
          };

          switch(item.metricType) {
            case MetricType.max:
            case MetricType.min:
            case MetricType.sum:
              datapoint.r = duration;
              break;
            case MetricType.avg:
              datapoint.r = duration;
              datapoint['c'] = 1;
              break;
            case MetricType.occurence:
            default:
              datapoint.r = 1;
              break;
          }

          if (datapoint.y > maxValue) maxValue = datapoint.y;
          if (datapoint.y < minValue) minValue = datapoint.y;
          graphdata.push(datapoint);
          datamap[diffDays][timePosition] = datapoint;
        } else {
          switch(item.metricType) {
            case MetricType.max:
              if(datamap[diffDays][timePosition].r < duration) {
                datamap[diffDays][timePosition].r = duration;
              }
              break;
            case MetricType.min:
              if(datamap[diffDays][timePosition].r > duration) {
                datamap[diffDays][timePosition].r = duration;
              }
              break;
            case MetricType.avg:
              datamap[diffDays][timePosition].r = (datamap[diffDays][timePosition].r * datamap[diffDays][timePosition].c) + duration;
              datamap[diffDays][timePosition].c += 1;
              datamap[diffDays][timePosition].r = datamap[diffDays][timePosition].r / datamap[diffDays][timePosition].c;
              break;
            case MetricType.sum:
              datamap[diffDays][timePosition].r += duration;
              break;
            case MetricType.occurence:
            default:
              datamap[diffDays][timePosition].r += 1;
              break;
          }
        }

        if (maxSizeValue < datamap[diffDays][timePosition].r) {
          maxSizeValue = datamap[diffDays][timePosition].r;
        }
      }

      const shape = defaultShapes[datasets.length % defaultShapes.length];
      datasets.push({
        label: item.name,
        data: graphdata,
        backgroundColor: report.style.colors[i]? report.style.colors[i] : undefined,
        borderColor: report.style.colors[i]? report.style.colors[i] : undefined,
        pointStyle: shape.shape as any,
        borderWidth: 1,
        xAxisID: 'xAxis',
        yAxisID: 'yAxis'
      });
    }

    let multiplier = (pointsPerHour < 120)? 9.0 / maxSizeValue : 3;
    datasets.forEach(set => {
      set.data.forEach((item: BubbleDataPoint) => {
        if(pointsPerHour >= 120) {
          item.r = 3;
        } else {
          item.r *= multiplier;
        }
      });
    });

    return {
      datasets,
      labels: [],
      maxValue,
      minValue,
      minStep: 1,
      chartType: 'bubble',
      beginAt0: true,
      xAxisMax: maxDays - 1
    };
  }

  public getDurationData(data: ReportData[], startDate: moment.Moment, maxDays: number): {minutes: number, duration: number}[] {
    if(data.length == 0) {
      return [];
    }
    const startDateM = moment(startDate).local();
    let startTime: moment.Moment;

    const chartData: {minutes: number, duration: number}[] = [];
    for (let ii = 0; ii < data.length; ii++) {
      let date = moment(data[ii].dateEpoc).local();
      
      if(!startTime) {
        startTime = date;
        continue;
      }

      const duration = date.diff(startTime, 'seconds') / 60;
      const minutes = startTime.diff(startDateM, 'minutes');
      startTime = null;

      if (date.diff(startDateM, 'days') < 0) {
        continue;
      }
      let diffDays = startDateM.diff(date, 'days');
      if (diffDays >= maxDays) {
        continue;
      }

      const durationData = {
        minutes,
        duration
      } as DurationChartData;
      chartData.push(durationData);
    }
    return chartData;
  }

  private getDurationChart(report: ReportDefinition, reportData: typesV2.ReportDetails, behaviors: StudentBehavior[], startDate: moment.Moment, maxDays: number, errors: string[]): ReportDetails {
    let labels: string[] = [];
    for(let i = 0; i < 24 * 60; i++) {
      if(i % 60 === 0) {
        let hours = Math.floor(i / 60);
        let postfix = 'am';
        if(hours > 11) {
          postfix = 'pm';
        }
        if(hours > 12) {
          hours -= 12;
        }
        labels.push(`${hours}:00 ${postfix}`);
      } else {
        labels.push('');
      }
    }
    const datasets: ChartDataset[] = [];
    const selectedBehaviors = behaviors.filter(x => x.isDuration);
    let maxValue: number = selectedBehaviors.length + 1;
    let minValue: number = 0;
    let minMinutes = labels.length;
    let maxMinutes = 0;

    const startDateM = moment(startDate).local();
    let behaviorNumber = 0;
    let mappedDurations: {[key: string]: DurationChartData[]} = {};
    for (let i = 0; i < report.metrics.length; i++) {
      let item = report.metrics[i];
      const behavior = behaviors.find(x => x.id === item.id);
      if(!behavior || !behavior.isDuration) {
        continue
      }

      behaviorNumber++;
      item.name = this.getMetricName(item, behaviors);

      let data = reportData.data.filter(dataItem => {
        if(dataItem.behavior !== item.id) {
          return false;
        }
        const deviceIdFound = item.deviceIds.indexOf(dataItem.source?.rater) >= 0;
        if((item.deviceIds.length === 0 || !item.deviceIds[0]) || (dataItem.source && deviceIdFound)) {
          return true;
        }
        if(!dataItem.source) {
          return false;
        }
        return false;
      });
      if(behavior.daytime) {
        data = data.filter(x => startDateM.isSame(moment(x.dateEpoc).local(), 'day'));
      }
      data.sort((a, b) => { return a.dateEpoc - b.dateEpoc; });

      const metricData: ChartDataset = {
        label: item.name,
        backgroundColor: item.color? item.color : undefined,
        borderColor: item.color? item.color : undefined,
        pointBorderColor: item.color? item.color : undefined,
        hoverBackgroundColor: item.color? item.color : undefined,
        hoverBorderColor: item.color? item.color : undefined,
        pointBackgroundColor: item.color? item.color : undefined,
        pointHoverBackgroundColor: item.color? item.color : undefined,
        pointHoverBorderColor: item.color? item.color : undefined,
        pointStyle: 'rect',
        fill: false,
        // hideInLegendAndTooltip: true,
        borderWidth : 2,
        pointRadius: 2,
        pointHoverRadius: 0,
        showLine: true, // no line shown
        data: []
      };
      const chartData: {minutes: number, duration: number}[] = this.getDurationData(data, startDate, maxDays);

      if(!mappedDurations[behaviorNumber]) {
        mappedDurations[behaviorNumber] = [];
      }
      mappedDurations[behaviorNumber].push(...chartData)

      metricData.data = [];
      for(let ii = 0; ii < labels.length; ii++) {
        const inSeries = chartData.findIndex(x => x.minutes <= ii && ii <= x.minutes + x.duration);
        if(inSeries >= 0) {
          if(ii < minMinutes) {
            minMinutes = ii;
          }
          if(ii > maxMinutes) {
            maxMinutes = ii;
          }
          metricData.data.push(behaviorNumber + (inSeries % 2 * 0.5) - 0.25);
        } else {
          metricData.data.push(null);
        }
      }

      if(behavior.targets) {
        const target = behavior.targets?.find(x => x.targetType == 'duration');
        if(target) {
          const targetData: number[] = [];
          metricData.data.forEach((x, i) => {
            targetData[i] = target.target;
          });
          const dataset: ChartDataset = {
            label: `${item.name} target`,
            backgroundColor: item.color? item.color : undefined,
            borderColor: item.color? item.color : undefined,
            pointBorderColor: item.color? item.color : undefined,
            hoverBackgroundColor: item.color? item.color : undefined,
            hoverBorderColor: item.color? item.color : undefined,
            pointBackgroundColor: item.color? item.color : undefined,
            pointHoverBackgroundColor: item.color? item.color : undefined,
            pointHoverBorderColor: item.color? item.color : undefined,
            pointStyle: 'rect',
            fill: false,
            // hideInLegendAndTooltip: true,
            pointRadius: 2,
            pointHoverRadius: 0,
            // showLine: true, // no line shown
            data: targetData,
            borderDash: [10, 5],
            borderWidth : 2,
            // yAxisID: 'yAxis'
          };
          dataset['targetDataset'] = true;
          datasets.push(dataset);
        }
      }

      datasets.push(metricData);
    }

    if(minMinutes + 60 > maxMinutes) {
      maxMinutes = minMinutes + 60;
    }

    datasets.forEach(set => {
      set.data = (set.data as number[]).filter((item: number, index: number) => { return minMinutes <= index && index <= maxMinutes; });
    });
    labels = labels.filter((l, index) => { return minMinutes <= index && index <= maxMinutes; });

    return {
      labels,
      datasets,
      maxValue,
      minValue,
      xAxisMax: 24,
      minStep: 1,
      beginAt0: false,
      chartType: 'line',
      yTickCallback: (val) => {
        if(val % 1 !== 0) {
          return '';
        }
        if(val < 1 || val > selectedBehaviors.length) {
          return '';
        }

        return selectedBehaviors[val - 1].name;
      }
    };
  }

  private barChartTickCallback(value) {
    if (value % 1 === 0) {
      return value;
    }
    return '';
  }
  private getBarChartData(report: ReportDefinition, reportData: typesV2.ReportDetails, behaviors: StudentBehavior[], maxDays: number, startDate: moment.Moment): ReportDetails {
    let data: ReportData[] = reportData.data
      .filter(x => report.metrics.find(m => m.id === x.behavior));
    let datasets: ChartDataset[] = [];
    let labels = [];
    let datasetCategoryCache: { [key: string]: ChartDataset } = {};

    let earliest = 24;
    let latest = 0;
    let maxValue = 5;
    const startDateM = moment(startDate);
    const endDateM = moment(startDate).add(maxDays, 'days');

    data.forEach(item => {
        let itemDate = moment(item.dateEpoc);
        if (itemDate.isSameOrAfter(startDateM, 'days') && itemDate.isSameOrBefore(endDateM, 'days')) {
            if (itemDate.hour() < earliest) {
                earliest = itemDate.hour();
            }
            if (itemDate.hour() > latest) {
                latest = itemDate.hour() + 1;
            }
        }
    });

    if(earliest >= latest) {
        earliest = 6;
        latest = 18;
    } else {
        earliest = (earliest === 0)? 0 : earliest - 1;
        latest = (latest === 24)? 24 : latest + 1;
    }

    for (let i = earliest; i <= latest; i++) {
        let hour = i;
        let postfix = (hour < 12 || hour == 24)? 'am' : 'pm';
        if (hour <= 12) {
            if (hour == 0) {
                hour = 12;
            }
            labels.push(hour + ' ' + postfix);
        } else {
            labels.push((hour - 12) + ' ' + postfix);
        }
    }

    const behaviorMap: {[key: string]: StudentBehavior } = {}
    behaviors.forEach(behavior => {
        const metric = report.metrics.find(x => x.id === behavior.id);
        let category = {
            label: behavior.name,
            fill: true,
            backgroundColor: metric? metric.color : undefined,
            borderColor: metric? metric.color : undefined,
            borderWidth: 1,
            data: [],
        } as ChartDataset;
        for (let ii = 0; ii <= latest - earliest; ii++) {
            category.data[ii] = 0;
        }
        datasetCategoryCache[behavior.id] = category;
        behaviorMap[behavior.id] = behavior;
    });

    const todaysDate = startDate;
    let durationStart = null;
    data.sort((a, b) => a.dateEpoc - b.dateEpoc);
    data.forEach(item => {
      let itemDate = moment(item.dateEpoc);
      if (!itemDate.isSame(todaysDate, 'day')) {
        return;
      }
      let category = datasetCategoryCache[item.behavior];
      const behavior = behaviorMap[item.behavior];
      if (!category || !behavior || !item || (behavior.isDuration && durationStart)) {
        durationStart = null;
        return;
      }

      if(behavior.isDuration) {
        durationStart = itemDate;
      }

      let hourOfDay = itemDate.hour();
      hourOfDay -= earliest;

      category.data[hourOfDay] = (category.data[hourOfDay] as number) + 1;

      if((category.data[hourOfDay] as number) > maxValue) {
        maxValue = category.data[hourOfDay] as number;
      }
      (category as any).hasData = true;
    });

    for (let i in datasetCategoryCache) {
      if ((datasetCategoryCache[i] as any).hasData || true) {
        datasets.push(datasetCategoryCache[i]);
      }
    }

    return {
      labels,
      datasets,
      maxValue,
      minValue: 0,
      xAxisMax: 24,
      beginAt0: false,
      chartType: 'bar'
    };
  }

  private constructReportData(reportData: typesV2.ReportDetails, behaviors: StudentBehavior[], errors: string[]): ProcessingReportData[] {
    return [].concat(...behaviors.map(behavior => {
      const items = reportData.data
        .filter(x => !x.deleted && x.behavior == behavior.id)
        .map((x, i) => ({
            behavior,
            date: moment(x.dateEpoc),
            source: x.source
          } as ProcessingReportData));
      if(!behavior.isDuration) {
        return items;
      }

      let started = false;
      items.forEach((x, i) => {
        const previous = i > 0? items[i - 1] : undefined;
        if(started && previous && !x.date.isSame(previous.date, 'day') && behavior.daytime) {
          if(!previous.date.isSame(moment().local(), 'day')) {
            errors.push(`Duration start is not stopped in the same day ${previous.date.format('MM/DD/yyyy hh:mm:ss')}`);
            started = false;
          }
        }
        if(started) {
          previous.duration = x.date.diff(previous.date, 'seconds');
          x.start = false;
          started = false;
        } else {
          started = true;
          x.start = true;
          x.duration = 0;
        }
      });

      const result = items.filter(x => x.start);
      if(items.length > 0 && items[items.length - 1].start) {
        const lastItem = items[result.length - 1];
        if(moment().isSame(lastItem.date, 'day')) {
          lastItem.duration = moment().diff(lastItem.date, 'seconds');
        }
      }
      return result;
    }));
  }

  private getLineChartData(report: ReportDefinition, reportResponse: typesV2.ReportDetails, behaviors: StudentBehavior[], startDate: moment.Moment, maxDays: number, showTargets: boolean, trackedDaysPerWeek: number, errors: string[]): ReportDetails {
    const labels: string[] = [];
    const datasets: ChartDataset[] = [];
    let minValue = 0;
    let maxValue = 3;
    let maxUnits = 0;
    const dayOffsets: moment.Moment[] = [];
    const dayCounts: number[] = [];
    const reportData = this.constructReportData(reportResponse, behaviors, errors);
    const scheduledExcludes = report.scheduledExcludes.map(x => moment(x).format('MM/DD/yyyy'));

    const excludeMoments = report.excludeDates.filter(x => !report.includeDates.find(y => y == x)).map(x => moment(x).format('MM/DD/yyyy'));

    try {
      for (let i = 0; i < report.metrics.length; i++) {
        let item: ReportDefinitionMetric = JSON.parse(JSON.stringify(report.metrics[i]));
        item.name = this.getMetricName(item, behaviors);

        if(item.timeline.scope == 'Auto') {
          item.timeline.scope = 'Day';
        }

        const behavior = behaviors.find(b => b.id === item.id);
        const unitLength = moment(startDate).add(1, item.timeline.scope as any).diff(moment(startDate), 'days');

        const data = reportData.filter(dataItem => {
          if(dataItem.behavior.id !== item.id) {
            return false;
          }
          const deviceIdFound = item.deviceIds.indexOf(dataItem.source?.rater) >= 0;
          if((item.deviceIds.length === 0 || !item.deviceIds[0]) || (dataItem.source && deviceIdFound)) {
            return true;
          }
          if(!dataItem.source) {
            return false;
          }
          return false;
        });

        data.sort((a, b) => { return a.date.diff(b.date, 'second'); });
        
        if (i == 0) {
          const starting = moment(startDate);
          let current = starting.clone();
          while(current.diff(starting, 'days') < maxDays) {
            const currentFormat = current.format('MM/DD/yyyy');
            if(item.timeline.scope != 'Days' || !scheduledExcludes.find(x => x == currentFormat)) {
              if (maxDays == 7) {
                labels.push(current.format('dddd'));
              } else if(item.timeline.scope != 'Months') {
                labels.push(current.format('MM/DD/yyyy'));
              } else {
                labels.push(current.format('MM/yyyy'));
              }
              maxUnits++;
              dayOffsets.push(moment(current));
              let startDay = moment(current);
              let daysInPeriod = 0;
              current = current.add(1, item.timeline.scope as any);
              if(item.timeline.scope != 'Days') {
                if(current && startDay.isBefore(current)) {
                  while(current && startDay.isBefore(current)) {
                    const currentFormat = startDay.format('MM/DD/yyyy');
                    const autoExclude = scheduledExcludes.find(x => x == currentFormat);
                    const exclude = excludeMoments.find(x => x == currentFormat);
                    if(!autoExclude && !exclude) {
                      daysInPeriod++;
                    }
                    startDay = startDay.add(1, 'day');
                  }
                }
                if(daysInPeriod === 0) {
                  daysInPeriod = 1;
                }
              } else {
                daysInPeriod = 1;
              }
              dayCounts.push(daysInPeriod);
            } else {
              current = current.add(1, item.timeline.scope as any);
            }
          }
        }

        let graphdata = [];
        const avgCount = [];
        for (let ii = 0; ii < data.length; ii++) {
          const reportData = data[ii];
          if (reportData.date.diff(startDate, 'seconds') < 0) {
            continue;
          }
          const formattedDate = reportData.date.format('MM/DD/yyyy');
          const excludeItem = scheduledExcludes.find(x => x == formattedDate);
          if(excludeItem) {
            continue;
          }

          let diffDays = dayOffsets.findIndex(x => {
            return x.isSame(reportData.date, item.timeline.scope as any);
          });
          if (diffDays >= maxUnits) {
            continue;
          }

          const duration = item.metricType != MetricType.occurence? (reportData.duration / 60) : 0;
          
          if (graphdata[diffDays] == undefined) {
            switch(item.metricType) {
              case MetricType.occurence:
                  graphdata[diffDays] = 1;
                  avgCount[diffDays] = 1;
                break;
              case MetricType.max:
              case MetricType.min:
              case MetricType.sum:
                graphdata[diffDays] = duration;
                break;
              case MetricType.avg:
                avgCount[diffDays] = 1;
                graphdata[diffDays] = duration;
                break;
              default:
                graphdata[diffDays] = 1;
                break;
            }
          } else {
            switch(item.metricType) {
              case MetricType.occurence:
                graphdata[diffDays] += 1; 
                break;
              case MetricType.max:
                if(graphdata[diffDays] < duration) {
                  graphdata[diffDays] = duration;
                }
                break;
              case MetricType.min:
                if(graphdata[diffDays] > duration) {
                  graphdata[diffDays] = duration;
                }
                break;
              case MetricType.sum:
                graphdata[diffDays] += duration;
                break;
              case MetricType.avg:
                graphdata[diffDays] += (graphdata[diffDays] * avgCount[diffDays]) + duration;
                avgCount[diffDays] += 1;
                graphdata[diffDays] = graphdata[diffDays] / avgCount[diffDays];
                break;
              default:
                graphdata[diffDays] += 1;
                break;
            }
          }
        }

        for (let ii = 0; ii < item.timeline.duration; ii++) {
          if (graphdata[ii] == undefined) {
            graphdata[ii] = 0;
          }
        }

        if(item.timeline.calculationType == CalculationType.avg) {
          graphdata.forEach((v, iii) => {
            const daysInPeriod = dayCounts[iii];
            graphdata[iii] = v / daysInPeriod;
          });
        }
        graphdata.forEach(val => {
          if (val > maxValue) {
            maxValue = val;
          }
        });

        let current = moment(startDate);
        const endMoment = moment(startDate).add(maxDays, 'days');
        for(let ii = 0; current.isSameOrBefore(endMoment, 'days'); ii++) {
          const currentDay = current.format('MM/DD/yyyy');
          if(excludeMoments.find(x => x == currentDay)) {
            const offset = dayOffsets.findIndex(x => x.isSame(current, 'day'));
            if(offset >= 0) {
              graphdata[offset] = undefined;
            }
          }
          current = current.add(1, 'day');
        }
        const shape = defaultShapes[i % defaultShapes.length];
        const dataset: ChartDataset = {
          label: item.name,
          fill: false,
          tension: 0,
          data: graphdata,
          backgroundColor: report.style.colors[i]? report.style.colors[i] : undefined,
          borderColor: report.style.colors[i]? report.style.colors[i] : undefined,
          pointBackgroundColor: report.style.colors[i]? report.style.colors[i] : undefined,
          pointStyle: shape.shape,
          radius: shape.radius,
          borderWidth: 3,
          yAxisID: 'yAxis'
        };
        dataset['metric'] = item;
        datasets.push(dataset);

        if(behavior.targets && showTargets) {
          const target = behavior.targets.find(x => 
            (x.targetType == 'frequency' && item.metricType == 'occurence') ||
            (x.targetType != 'frequency' && item.metricType != 'occurence'));
          let processTarget = true;
          if(!target) {
            processTarget = false;
          }
          else if(item.metricType != MetricType.occurence) {
            processTarget = item.metricType === target.measurement.toString().toLowerCase();
          }
          
          if(target && processTarget) {
            console.log('Target', item.name, item.metricType, target.target);
            const dataTarget = item.metricType === MetricType.occurence? target.target : target.target / 60;
            if(dataTarget > maxValue) {
              maxValue = dataTarget;
            }
            const targetData = graphdata.map((x, i) => dataTarget);
            const dataset: ChartDataset = {
              label: `${item.name} target`,
              fill: false,
              tension: 0,
              data: targetData,
              backgroundColor: item.color,
              borderColor: item.color,
              pointBackgroundColor: item.color,
              pointStyle: shape.shape,
              borderDash: [10, 5],
              radius: shape.radius,

              borderWidth: 3,
            };
            dataset['metric'] = item;
            dataset['targetDataset'] = true;
            datasets.push(dataset);
          } else {
            console.log('Skipping target', item.name, item.metricType);
          }
        }
      }
    } catch(err) {
      console.error(err);
    }
    return {
      datasets,
      labels,
      maxValue: maxValue < 5? 5 : maxValue + (maxValue % 2),
      minValue,
      minStep: maxValue < 9? 1 : (maxValue + 5 - (maxValue % 5)) / 5,
      chartType: 'line',
      beginAt0: true,
      xAxisMax: maxDays
    };
  }

  public getIntervalModel(report: typesV2.ReportDetails, dayStart: moment.Moment, minutesPerRange: number, intervalType: 'minutes' | 'seconds', studentBehaviors: StudentBehavior[]): IntervalModel {

    let lookup: {
      /* Date */
      [key: string] : {
        /* Hour */
        [key: string]: {
          /* Minute Range */
          [key: string]: string[] | {
            [key: string]: string[]
          }
        }
      }
    } = {};

    const dayEnd = moment(dayStart).add(1, 'day');
    let startHour = 24;
    let endHour = 0;
    const behaviorTotals: {[key: string]: number } = {};
    const behaviorBreakdown: {[key: number]: { [key: string]: number } } = {};
    for(let i = startHour; i <= endHour; i++) {
      behaviorBreakdown[i] = {};
    }
    report.data.forEach(item => {
      const eventDate = moment(item.dateEpoc);
      if(eventDate.isBefore(dayStart, 'day')) {
        return;
      }
      if(eventDate.isAfter(dayEnd, 'day')) {
        return;
      }
      if(eventDate.hours() < startHour) {
        startHour = eventDate.hours();
      }
      if(eventDate.hours() > endHour) {
        endHour = eventDate.hours();
      }
      const dateString = eventDate.format('MM/DD/yyyy');
      if(!lookup[dateString]) {
        lookup[dateString] = {};
      }
      if(!lookup[dateString][eventDate.hours()]) {
        lookup[dateString][eventDate.hours()] = {};
      }
      let behaviors;
      if(intervalType == 'minutes') {
        const minuteStart = eventDate.minutes() - (eventDate.minutes() % minutesPerRange);
        if(!lookup[dateString][eventDate.hours()][minuteStart]) {
          lookup[dateString][eventDate.hours()][minuteStart] = [];
        }
        behaviors = lookup[dateString][eventDate.hours()][minuteStart];
      } else {
        const minuteStart = eventDate.minutes();
        const secondStart = eventDate.seconds() - (eventDate.seconds() % minutesPerRange);
        if(!lookup[dateString][eventDate.hours()][minuteStart]) {
          lookup[dateString][eventDate.hours()][minuteStart] = [];
        }
        if(!lookup[dateString][eventDate.hours()][minuteStart][secondStart]) {
          lookup[dateString][eventDate.hours()][minuteStart][secondStart] = [];
        }
        behaviors = lookup[dateString][eventDate.hours()][minuteStart][secondStart];
      }
      const behavior = studentBehaviors.find(behavior => {
        return behavior.id === item.behavior;
      });
      if(!behavior) {
        return;
      }
      behaviorTotals[behavior.name] = (behaviorTotals[behavior.name])? behaviorTotals[behavior.name] + 1 : 1;
      if(!behaviorBreakdown[eventDate.hours()]) {
        behaviorBreakdown[eventDate.hours()] = {};
      }
      behaviorBreakdown[eventDate.hours()][behavior.name] = (behaviorBreakdown[eventDate.hours()][behavior.name])? 
                    behaviorBreakdown[eventDate.hours()][behavior.name] + 1 : 1;

      if(!behaviors.find(item => item === behavior.name)) {
        behaviors.push(behavior.name);
        behaviors.sort();
      }
    });

    const key = dayStart.format('MM/DD/yyyy');
    const reference = lookup[key];
    const data: string[][] = [];

    let behaviorsAdded = false;
    if(intervalType == 'minutes') {
      for(let i = 0; i < 60; i += minutesPerRange) {
        let row = [`${i.toString().padStart(2, '0')}:00 - ${(i + minutesPerRange - 1).toString().padStart(2, '0')}:59`]
        for(let ii = startHour; ii <= endHour; ii++) {
          if(reference && reference[ii] && reference[ii][i]) {
            const intervalBehaviors = reference[ii][i];
            const behaviorText = (intervalBehaviors as string[]).join(',');
            row.push(behaviorText);
            behaviorsAdded = true;
          } else {
            row.push('');
          }
        }
        data.push(row);
      }
    } else {
      for(let i = 0; i < 60 * 60; i += minutesPerRange) {
        const seconds = i % 60;
        const minutes = Math.floor(i / 60);

        const toSeconds = (i + minutesPerRange - 1) % 60;
        const toMinutes = Math.floor((i + minutesPerRange - 1) / 60);

        let row = [`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - ${toMinutes.toString().padStart(2, '0')}:${toSeconds.toString().padStart(2, '0')}`]
        for(let ii = startHour; ii <= endHour; ii++) {
          if(reference && reference[ii] && reference[ii][minutes] && reference[ii][minutes][seconds]) {
            const intervalBehaviors = reference[ii][minutes][seconds];
            const behaviorText = intervalBehaviors.join(',');
            row.push(behaviorText);
            behaviorsAdded = true;
          } else {
            row.push('');
          }
        }
        data.push(row);
      }
    }

    if(!behaviorsAdded) {
      startHour = 8;
      endHour = 16;
    } else {
      const row = ['% of Total'];
      for(let i = startHour; i <= endHour; i++) {
        row.push(Object.keys(behaviorTotals).map(behavior => {
          let percent = 0;
          if(behaviorBreakdown[i] && behaviorBreakdown[i][behavior]) {
            const hourBehavior = behaviorBreakdown[i][behavior];
            const totalBehavior = behaviorTotals[behavior];
            percent = (hourBehavior)? Math.floor(hourBehavior / totalBehavior * 100) : 0;
          }
          return `${behavior}: ${percent}%`;
        }).join('\n'));
      }
      data.push(row);
    }

    return {
      dayStart,
      dayEnd,
      startHour,
      endHour,
      data
    } as IntervalModel;
  }
  static durationChartYTick(tooltipItem: TooltipModel<any>, data: ChartData) {
    var label = data.datasets[tooltipItem.dataPoints[0].datasetIndex].label || '';

    const index = Math.round(Number.parseFloat(tooltipItem.dataPoints[0].formattedValue) * 100) / 100;
    if(index < 1) {
      return label;
    }
    return `${label} - ${index}`;
  }
  static lineChartYTick(value: number): string | number {
    if(value > 50) {
      return Math.round(value);
    }
    if (value % 1 === 0) {
      return value;
    }
    return '';
  }

  static bubbleChartYTick(value: number): string {
    let hours = value;
    let minutes = Math.ceil(value % 1 * 60).toString();
    if (hours == 24) {
      minutes = '00';
    }
    minutes = minutes.padStart(2, '0');

    if (hours < 12 || hours == 24) {
      if (hours == 0 || hours == 24) {
        hours = 12;
      }
      return Math.ceil(value) + ":" + minutes + " AM";
    }

    hours -= 12;
    if(hours === 0) {
      hours = 12;
    }
    return Math.ceil(hours) + ":" + minutes + " PM";
  }

  static clusterChartYTick(value: number): string {
    let hours = value;
    let minutes = Math.ceil(value % 1 * 60 / 60).toString();
    if (hours == 24) {
      minutes = '00';
    }
    minutes = minutes.padStart(2, '0');

    if (hours < 12 || hours == 24) {
      if (hours == 0 || hours == 24) {
        hours = 12;
      }
      return Math.ceil(value) + ":" + minutes + " AM";
    }

    hours -= 12;
    if(hours === 0) {
      hours = 12;
    }
    return Math.ceil(hours) + ":" + minutes + " PM";
  }

  static bubbleChartTips(tooltipModel, chartData) : string {
    if (!tooltipModel || !chartData.datasets[tooltipModel.datasetIndex]) {
      return '';
    }
    const dataset = chartData.datasets[tooltipModel.datasetIndex];
    const data = dataset.data[tooltipModel.index];
    if(!data) {
      return '';
    }
    return dataset.label + ' - ' + data.title;
  }

  public getMetricName(metric: ReportDefinitionMetric, behaviors: StudentBehavior[]) {
    const behavior = behaviors.find(x => x.id === metric.id);
    if(!behavior) {
      return metric.id;
    }

    let modifier = '';
    switch(metric.metricType) {
      case MetricType.max:
        modifier = ' - Highest (minutes)';
        break;
      case MetricType.min:
        modifier = ' - Lowest (minutes)';
        break;
      case MetricType.sum:
        modifier = ' - Sum (minutes)';
        break;
      case MetricType.avg:
        modifier = ' - Avg (minutes)';
        break;
    }

    const retval: any = metric.name + modifier;

    return retval;
  }
}
