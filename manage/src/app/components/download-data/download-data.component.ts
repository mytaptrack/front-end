import { Component, OnInit } from '@angular/core';
import { utils, write } from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  UserClass, StudentClass, moment, Moment,
  DurationUnits, ReportType
} from '../../lib';
import { UserService } from '../../services';

@Component({
  selector: 'app-manage-download-data',
  templateUrl: './download-data.component.html',
  styleUrls: ['./download-data.component.scss'],
  standalone: false
})
export class ManageDownloadDataComponent implements OnInit {
  public _tags: string[] = [];
  public startDate: string;
  public endDate: string;
  public completePercent: number;
  get completePercentDisplay() {
    return Math.floor(this.completePercent);
  }
  public reportType: ReportType;
  public startHour: number;
  public endHour: number;
  public durationUnits: DurationUnits = DurationUnits.minutes;
  public onlyDurationStart: boolean = true;
  public minutesPerRange: number = 1;
  public intervalType: 'minutes' | 'seconds' = 'minutes';
  private _students: StudentClass[];
  private _filtered: StudentClass[] = [];
  private user: UserClass;

  public get students() {
    return this._students;
  }

  public get tags() {
    return this._tags;
  }
  public set tags(val: string[]) {
    if (!val || val.length == 0) {
      this._filtered = this._students;
      this._tags = val;
    } else {
      this._tags = val;
      console.log(this._filtered.length);
    }
  }

  constructor(
    private userService: UserService) {
    this.userService.user.subscribe(user => {
      this.user = user;
      if(!user) {
        return;
      }
      this.load();
    });
  }

  ngOnInit(): void {
  }

  async load() {
    const management = this.user.management;
    this._students = (await management.getStudents()).students;
  }

  async downloadReport() {
    this.completePercent = 5;
    const weeks: moment.Moment[] = [];

    let date = moment(this.startDate);
    const endDate = moment(this.endDate);
    
    this.completePercent = 15;
    let fileData = [['Student', 'Activity', 'Date', 'Activity Begins', 'Activity Ends', 'Behavior', 'Timestamp', 'Start/Stop', `Duration (${this.durationUnits})`]];

    for(let student of this.students) {
      await student.ensureFullStudent()
      const report = await student.reports.getReport(date, endDate);
  
      if(report.data.length > 0) {
        let now = date.clone();
        while(now.isSameOrBefore(endDate)) {
          const results = await student.schedules.getScheduleAndItems(report, now);
          results.activities.forEach(act => {
            let startTime = act.startTime as string;
            if(moment.isMoment(act.startTime)) {
              startTime = (act.startTime as Moment).format('h:mm:ss a');
            }
            act.data.forEach(item => {
              fileData.push([
                student.details.firstName + ' ' + student.details.lastName,
                act.title,
                this.formatTime(moment(item.dateEpoc)),
                startTime,
                act.endTime as string,
                student.trackables.getBehaviorName(item.behavior),
                moment(item.dateEpoc).format('yyyy-MM-DD hh:mm:ss a'),
                item.isDuration? (item.isStart? 'Starting' : 'Ending') : '',
                item.duration? this.getDurationAdjusted(item.duration).toString() : ''
              ]);
            })
          });
          now.add(1, 'days');
        }
      }
      this.completePercent += 75 / this.students.length;
    }

    const sheet = utils.aoa_to_sheet(fileData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, sheet, 'Data');

    let data = write(wb, {
      bookType: 'xlsx',
      bookSST: false,
      type: 'array'
    });
    saveAs(new Blob([data], { type: "application/octet-stream" }), `mytaptrack-data-${date.format('yyyy-MM-DD')}.xlsx`);

    this.completePercent = 100;
    setTimeout(() => {
      this.completePercent = -1;
    }, 1000);
  }

  getDurationAdjusted(duration?: number) {
    if (duration == undefined) {
      return;
    }
    let retval = duration;
    switch (this.durationUnits) {
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

  formatTime(date: moment.Moment): string {
    return date.format('yyyy-MM-DD');
  }
}
