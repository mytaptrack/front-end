import { Component, OnInit, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { utils, WorkSheet, write } from 'xlsx';
import { saveAs } from 'file-saver';
import {
  ChartUtilsService, UserService,
  UserClass, Activity, StudentClass, moment, DateSelection, ReportType, DurationStatus,
  Moment
} from '../../..';

@Component({
  selector: 'app-download-data',
  templateUrl: './download-data.component.html',
  styleUrls: ['./download-data.component.scss'],
  standalone: false
})
export class DownloadDataComponent implements OnInit {
  public showDownloadDropdown: boolean = false;
  public downloadDate: moment.Moment = null;
  private downloadEndDate: moment.Moment = null;
  public disabled: Observable<boolean> = new Observable();
  public student: StudentClass;
  @Input() studentId: string = '';
  private user: UserClass = null;
  public selection: DateSelection = DateSelection.week;
  public completePercent: number = -1;
  public reportType: 'Data' | 'Frequency' = ReportType.Data;
  public minutesPerRange: number = 1;
  public startHour: number = 7;
  public endHour: number = 16;
  
  public fromDate: Moment;
  public toDate: Moment;

  constructor(private userService: UserService,
              private chartService: ChartUtilsService) {
    this.userService.user.subscribe(user => {
      this.user = user;
      this.user.selectedStudent.subscribe(s => {
        this.studentId = s.studentId;
        this.student = s;
      })
    });
   }

  ngOnInit() {
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
    if(this.selection === DateSelection.week) {
      weeks.push(this.downloadDate)
    } else if(this.selection === DateSelection.month) {
      let date = this.downloadDate;
      do {
        weeks.push(date);
        date = date.clone().add(1, 'week');
      } while (date < this.downloadEndDate);
    } else {
      let date = this.downloadDate;
      const endDate = this.downloadDate.clone().add(-1, 'day');
      this.downloadEndDate = endDate;
      do {
        weeks.push(date);
        date = date.clone().add(1, 'week');
      } while (date < endDate);
    }
    this.completePercent = 10;

    if(this.reportType === ReportType.Data) {
      const reportData = weeks.map(date => {
        this.completePercent += 20 / weeks.length;
        return this.getReportCsvData(student, date);
      });

      this.completePercent = 15;
      let fileData = [['Activity', 'Date', 'Activity Begins', 'Activity Ends', 'Behavior', 'Timestamp', 'Duration (Seconds)', 'Start/Stop']];

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
      const downloadDate = moment(this.downloadDate);
      saveAs(new Blob([data], {type:"application/octet-stream"}),`${student.details.firstName}-${student.details.lastName}-${downloadDate.format('yyyy-MM-DD')}}.xlsx`);
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
        const downloadDate = moment(this.downloadDate);
        saveAs(new Blob([data], {type:"application/octet-stream"}),`${student.details.firstName}-${student.details.lastName}-${downloadDate.format('yyyy-MM-DD')}.xlsx`);
      } catch (err) {
        alert(err.message);
      }      
    }
    this.completePercent = 100;
    setTimeout(() => {
      this.completePercent = -1;
    }, 1000);
  }

  async getReportData(student: StudentClass, date: moment.Moment, callback: (behavior: string, activity: Activity, durationStatus: DurationStatus, duration: number, eventDate: Date) => void): Promise<string> {
    const data = await student.reports.getReport(date, date.clone().add(1, 'week'));

    // construct schedule
    const scheduleResults = await student.schedules.getScheduleAndItems(data); 
    const scheduledItems = scheduleResults.activities;
    
    let fileData = "";
    const behaviorMap = {};
    student.trackables.behaviors.forEach(x => {
      behaviorMap[x.id] = x.name;
    });
    
    student.trackables.responses.forEach(x => {
      behaviorMap[x.id] = x.name;
    });
    
    for(let activity of scheduledItems) {
      const items = activity.data.filter(x => {
        const date = moment(x.dateEpoc);
        if(date.isBefore(this.downloadDate, 'day') || date.isSameOrAfter(this.downloadEndDate, 'day')) {
          return false;
        }
        return true;
      });

      for(let item of items) {
        let durationStatus: DurationStatus = item.isDuration? item.isStart? DurationStatus.Start : DurationStatus.Stop : DurationStatus.None;
        callback(behaviorMap[item.behavior] || item.behavior, activity, durationStatus, item.duration, new Date(item.dateEpoc));
      }
    }

    return fileData;
  }

  async getReportCsvData(student: StudentClass, date: moment.Moment): Promise<[][]> {
    let fileData = [];
    await this.getReportData(student, date, (behavior, activity, durationStatus, duration, eventDate) => {
      let row = [];
      if(activity) {
        row = [
          activity.title,
          `${eventDate.getMonth() + 1}/${eventDate.getDate()}/${eventDate.getFullYear()}`,
          activity.startTime,
          activity.endTime];
      } else {
        row = ['', '', '', ''];
      }

      let durationNameEnding = '';
      switch(durationStatus) {
        case DurationStatus.Start:
            durationNameEnding = ' (Starting)';
          break;
        case DurationStatus.Stop:
            durationNameEnding = ' (Ending)';
          break;
      }

      row.push(
        behavior.replace(/\"/g, "\\\"") + durationNameEnding,
        this.formatTime(eventDate),
        duration / 1000);
      fileData.push(row);
    });
    
    return fileData;
  }

  formatTime(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.toLocaleTimeString()}`;
  }

  async getWorksheets(student: StudentClass, date: moment.Moment): Promise<{ sheet: WorkSheet, name: string, sort: number }[]> {
    const report = await student.reports.getReport(date, date.clone().add(1, 'week'));
    const retval: {sheet: WorkSheet; name: string; sort: number; }[] = [];
    const startDate = moment(date);
    for(let i = 0; i < 7; i++) {
      const processDate = startDate.add(i, 'day');
      const model = this.chartService.getIntervalModel(
        report, processDate, 
        this.minutesPerRange, 'minutes', student.trackables.behaviors);
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
}
