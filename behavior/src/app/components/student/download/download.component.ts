import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { utils, WorkSheet, write } from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  StudentClass, ReportDuration, ChartUtilsService, UserService,
  Activity, moment, Moment, DateSelection, ReportType, DurationUnits, DurationStatus
} from '../../..';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss'],
  standalone: false
})
export class DownloadComponent implements OnInit {
  public months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  public years = [];
  public showDownloadDropdown: boolean = false;
  public downloadDate: moment.Moment = null;
  public onlyDurationStart: boolean = true;
  public downloadEndDate: moment.Moment = null;
  public disabled: Observable<boolean> = new Observable();
  public selection: DateSelection = DateSelection.week;
  public completePercent: number = -1;
  public reportType: 'Data' | 'Frequency' = ReportType.Data;
  public minutesPerRange: number = 1;
  public intervalType: 'minutes' | 'seconds' = 'minutes';
  public customRange: boolean = false;
  public startHour: number = 7;
  public endHour: number = 16;
  public durationUnits: DurationUnits = DurationUnits.minutes;
  public student: StudentClass;
  public get studentId(): string { return this.student?.studentId; }
  public get user() { return this.userService.user.value; }
  
  constructor(private userService: UserService,
              private chartService: ChartUtilsService) {
    this.userService.user.subscribe(user => {
      if(!user) {
        this.student = null;
        return;
      }
      user.selectedStudent.subscribe(s => {
        this.student = s;
      });
    });

    const now = moment();
    for(let i = now.year() - 5; i <= now.year(); i++) {
      this.years.push(i);
    }
   }

  ngOnInit() {
    const now = moment();
    this.downloadDate = now.clone().add((now.weekday() * -1) - 1, 'day');
  }

  isWeek(val: DateSelection) {
    return val === DateSelection.week;
  }

  isMonth(val: DateSelection) {
    return val === DateSelection.month;
  }

  isYear(val: DateSelection) {
    return val === DateSelection.year;
  }
  
  dateSelected(event: {start: moment.Moment, end: moment.Moment, type: ReportDuration}) {
    this.downloadDate = event.start;
    this.downloadEndDate = event.end;
  }

  async downloadReport() {
    if(!this.studentId) {
      return;
    }
    this.completePercent = 1;
    const student = await this.user.loadStudent(this.studentId);
    if(!student) {
      alert('Could not retrieve the student specified');
      return;
    }

    this.completePercent = 5;

    const weeks: moment.Moment[] = [];
    
    let date = this.downloadDate;
    const endDate = this.downloadEndDate;
    do {
      weeks.push(date.clone());
      date = date.clone().add(1, 'days');
    } while (date < endDate);
    this.completePercent = 10;

    if(this.reportType === ReportType.Data) {
      const reportData = weeks.map(weekDate => {
        this.completePercent += 20 / weeks.length;
        return this.getReportCsvData(student, weekDate);
      });

      this.completePercent = 15;
      let fileData = [['Activity', 'Date', 'Activity Begins', 'Activity Ends', 'Behavior', 'Antecedent', 'Consequence', 'Timestamp', 'Start/Stop', `Duration (${this.durationUnits})`]];

      for(const i in reportData) {
        fileData.push(...await reportData[i]);
        this.completePercent += 55 / weeks.length;
      }
      const sheet = utils.aoa_to_sheet(fileData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, sheet, 'Data');

      let data = write(wb, {
        bookType: 'xlsx',
        bookSST: false,
        type: 'array'
      });
      saveAs(new Blob([data], {type:"application/octet-stream"}),`${student.details.firstName}-${student.details.lastName}-${this.downloadDate.format('yyyy-MM-DD')}.xlsx`);
    } else {
      if(this.startHour as any instanceof String) {
        this.startHour = parseInt(this.startHour as any);
      }
      if(this.endHour as any instanceof String) {
        this.endHour = parseInt(this.endHour as any);
      }
      const reportData = weeks.map(async date => {
        const retval = await this.getWorksheets(student, date);
        this.completePercent += 20 / weeks.length;
        return retval;
      });

      this.completePercent = 15;
      const sheets = [];
      for(const i in reportData) {
        const result = await reportData[i];
        sheets.push(...result);
        this.completePercent += 55 / weeks.length;
      }
      sheets.sort((a, b) => { return a.sort - b.sort; } );
      const wb = utils.book_new();
      try {
        sheets.forEach(sheet => { utils.book_append_sheet(wb, sheet.sheet, sheet.name); });
        let data = write(wb, {
          bookType: 'xlsx',
          bookSST: false,
          type: 'array'
        });
        saveAs(new Blob([data], {type:"application/octet-stream"}),`${student.details.firstName}-${student.details.lastName}-${this.downloadDate.format('yyyy-MM-DD')}.xlsx`);
      } catch (err) {
        alert(err.message);
      }      
    }
    this.completePercent = 100;
    setTimeout(() => {
      this.completePercent = -1;
    }, 1000);
  }

  async getReportData(student: StudentClass, date: moment.Moment, callback: (behavior: string, activity: Activity, durationStatus: DurationStatus, duration: number, eventDate: moment.Moment, abc: { a: string, c: string }) => void): Promise<string> {
    const data = await student.reports.getReport(date, date.clone().add(1, 'week'));

    // construct schedule
    const scheduleResults = await student.schedules.getScheduleAndItems(data, date); 
    const scheduledItems = scheduleResults.activities;
    
    let fileData = "";
    const behaviorMap = {};
    student.trackables.behaviors.forEach(x => {
      behaviorMap[x.id] = x.name;
    });
    student.trackables.responses.forEach(x => {
      behaviorMap[x.id] = x.name;
    });
    const downloadDate = moment(this.downloadDate);
    const downloadEndDate = moment(this.downloadEndDate);
    for(let activity of scheduledItems) {
      const items = activity.data.filter(x => {
        const date = moment(x.dateEpoc);
        if(date.isBefore(downloadDate) || date.isAfter(this.downloadEndDate)) {
          return false;
        }
        return true;
      });

      for(let item of items) {
        let durationStatus: DurationStatus = item.isDuration? item.isStart? DurationStatus.Start : DurationStatus.Stop : DurationStatus.None;
        callback(behaviorMap[item.behavior] || item.behavior, activity, durationStatus, item.duration, moment(item.dateEpoc), item.abc);
      }
    }

    return fileData;
  }

  getDurationAdjusted(duration?: number) {
    if(duration == undefined) {
      return;
    }
    let retval = duration;
    switch(this.durationUnits) {
      case DurationUnits.hours:
        retval /= 60;
      case DurationUnits.minutes:
        retval /= 60;
      case DurationUnits.seconds:
        retval /= 1000;
        break;
    }
    return retval;
  }

  async getReportCsvData(student: StudentClass, date: moment.Moment): Promise<[][]> {
    let fileData = [];
    await this.getReportData(student, date, (behavior, activity, durationStatus, duration, eventDate, abc) => {
      let row = [];
      if(activity) {
        row = [
          activity.title,
          eventDate.format('MM/DD/yyyy'),
          moment.isMoment(activity.startTime)? (activity.startTime as Moment).format("hh:mm a") : activity.startTime,
          moment.isMoment(activity.endTime)? (activity.endTime as Moment).format("hh:mm a") : activity.endTime];
      } else {
        row = ['', '', '', ''];
      }

      let durationNameEnding = '';
      switch(durationStatus) {
        case DurationStatus.Start:
            durationNameEnding = 'Starting';
          break;
        case DurationStatus.Stop:
            durationNameEnding = 'Ending';
          break;
      }

      row.push(
        behavior.replace(/\"/g, "\\\""),
        abc? abc.a : '',
        abc? abc.c : '',
        eventDate.format('MM/DD/yyyy hh:mm:ss a'),
        durationNameEnding,
        this.getDurationAdjusted(duration));

      if(!this.onlyDurationStart || durationNameEnding != 'Ending') {
        fileData.push(row);
      }
    });
    
    return fileData;
  }

  formatTime(date: moment.Moment): string {
      return date.format('yyyy-MM-DD');
  }

  async getWorksheets(student: StudentClass, date: moment.Moment): Promise<{ sheet: WorkSheet, name: string, sort: number }[]> {
    const report = await student.reports.getReport(date, date.clone().add(1, 'week'));
    const retval: {sheet: WorkSheet; name: string; sort: number; }[] = [];
    const startDate = moment(date);
    for(let i = 0; i < 7; i++) {
      const processDate = startDate.add(i, 'day');
      const model = this.chartService.getIntervalModel(report, processDate, this.minutesPerRange, this.intervalType, student.trackables.behaviors);
      model.data.splice(0, 0, ['Minutes:Seconds', 'Hours']);
      model.data.splice(1, 0, ['Start - Stop']);
      for(let i = this.startHour; i <= this.endHour; i++) {
        let hour = (i > 12)? i - 12 : i;
        let amPm = (i > 11 && i < 24)? 'pm' : 'am';
        model.data[1].push(`${hour} ${amPm}`);
      }

      if(model.startHour < this.startHour) {
        for(let row of model.data) {
          row.splice(1, this.startHour - model.startHour);
        }
      }
      for(let ii = this.startHour; ii < model.startHour; ii++) {
        for(let iii = 2; iii < model.data.length; iii++) {
          model.data[iii].splice(ii, 0, '');
        }
      }
      for(let ii = model.endHour; ii < this.endHour; ii++) {
        for(let iii = 2; iii < model.data.length; iii++) {
          model.data[iii].push('');
        }
      }
      if(model.endHour > this.endHour) {
        const fullLength = this.endHour - this.startHour + 2;
        for(let row of model.data) {
          if(row.length > fullLength) {
            row.splice(fullLength, row.length - fullLength);
          }
        }
      }
      
      const maxWidth: number[] = [];
      model.data.forEach(row => {
        row.forEach((val, index) => {
          if(!maxWidth[index] || maxWidth[index] < val.length) {
            maxWidth[index] = val.length;
          }
        });
      });
      
      const colProps = [{wch: 15}];
      for(let ii = 1; ii < this.endHour - this.startHour; ii++) {
        colProps.push({wch: maxWidth[ii]});
      }

      const sheet = utils.aoa_to_sheet(model.data);
      sheet["!cols"] = colProps;
      retval.push({
        sheet,
        name: processDate.format('MM-DD-yyyy'),
        sort: processDate.toDate().getTime()
      });
    }

    return retval;
  }

  rangeSelected(val: number) {
    this.minutesPerRange = val;
  }
}
