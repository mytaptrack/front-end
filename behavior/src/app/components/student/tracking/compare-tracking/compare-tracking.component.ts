import { Component, OnInit } from '@angular/core';
import { 
  ReportData, StudentBehaviorClass, StudentClass, UserClass,
  UserService, moment
} from '../../../..';

class BehaviorItem {
  public get tracked() { return this.data? true : false; }
  public set tracked(val: boolean) {
    if(val) {
      this.trackEvent();
    } else {
      this.untrackEvent();
    }
  }
  public get saving() { return this.behavior.saving; }

  constructor(public behavior: StudentBehaviorClass, 
              private startTime: moment.Moment, 
              private data: ReportData) {
  }

  private async trackEvent() {
    const data = {
      behavior: this.behavior.id,
      dateEpoc: this.startTime.toDate().getTime(),
      isManual: false,
    };
    await this.behavior.trackEvent(this.startTime);
    this.data = data;
  }
  private async untrackEvent() {
    await this.behavior.untrackEvent(this.data);
    this.data = null;
  }
}
class TrackingLine {
  public displayTime: string;
  public behaviors: BehaviorItem[];
  public baselines: BehaviorItem[];
  public onTheHour: boolean = false;
  private _exclude: boolean = false;
  public get exclude() { return this._exclude; }
  public set exclude(val: boolean) {
    this.student.reports.intervalInclude(this.time, !val)
    .catch(err => {
      console.error(err);
      alert(err.message);
    });
    this._exclude = val;
  }


  constructor(private student: StudentClass, originalBehaviors: StudentBehaviorClass[], private time: moment.Moment, data: ReportData[], secondFormat: boolean, includeLine: boolean) {
    if(secondFormat) {
      this.displayTime = time.format('h:mm:ss a');
    } else {
      this.displayTime = time.format('h:mm a');
    }
    if(!secondFormat && this.displayTime.indexOf(':00') != -1) {
      this.onTheHour = true;
    } else if(secondFormat && this.displayTime.indexOf(':00:00') != -1) {
      this.onTheHour = true;
    }
    const behaviors = originalBehaviors.map(behavior => {
      const behaviorData = data.find(data => data.behavior == behavior.id);
      return new BehaviorItem(behavior, time, behaviorData);
    });

    this.behaviors = behaviors.filter(x => !x.behavior.baseline);
    this.baselines = behaviors.filter(x => x.behavior.baseline);
    this._exclude = !includeLine;
  }
}

@Component({
  selector: 'app-compare-tracking',
  templateUrl: './compare-tracking.component.html',
  styleUrls: ['./compare-tracking.component.scss'],
  standalone: false
})
export class CompareTrackingComponent implements OnInit {
  public user: UserClass;
  public student: StudentClass;
  public behaviors: StudentBehaviorClass[];
  public lines: TrackingLine[];
  public date: moment.Moment;
  public startTime: string;
  public endTime: string;
  public intervalType: 'minutes' | 'seconds' = 'minutes';
  public interval: number = 5;
  public tempDate: string;
  public tempStartTime: string;
  public tempEndTime: string;
  public tempIntervalType: 'minutes' | 'seconds' = 'minutes';
  public tempInterval: number = 5;
  public editTimeRange: boolean = false;

  public get statistics(): {name: string, value: number, percent: number, baseline: boolean}[] {
    const statistics = [];
    let total = 0;
    let totalBaseline = 0;
    if(!this.behaviors) {
      return statistics;
    }

    let excludeCount = 0;
    this.behaviors.forEach(behavior => {
      const tracked = this.lines.filter(line => !line.exclude && line.behaviors.find(b => b.behavior == behavior && b.tracked)).length +
        this.lines.filter(line => line.baselines.find(b => b.behavior == behavior && b.tracked)).length;
      statistics.push({ name: behavior.name, value: tracked, baseline: behavior.baseline });
      if(!behavior.baseline) {
        total += tracked;
      } else {
        totalBaseline += tracked;
      }
    });
    const lineCount = this.lines.filter(line => !line.exclude).length;
    statistics.forEach(stat => stat.percent = Math.round(stat.value / lineCount * 100));
    return statistics;
  }

  constructor(private userService: UserService) { }

  ngOnInit() {
    const now = moment();
    this.startTime = '08:00';
    this.endTime = '16:00';
    this.date = moment().startOf('day');

    this.userService.user.subscribe(user => {
      if (user) {
        console.log('New user event');
        this.user = user;

        this.student = user.selectedStudent.value;
        user.selectedStudent.subscribe(student => {
          if (student) {
            console.log('New student event');
            this.student = student;
            this.behaviors = this.student.trackables.behaviors;
            student.trackables.behaviors.forEach(behavior => {
              if(!behavior.abbreviation) {
                for(let i = 1; i < behavior.name.length; i++) {
                  const abbr = behavior.name.slice(0, i);
                  if(!student.trackables.behaviors.find(b => b.abbreviation == abbr)) {
                    behavior.abbreviation = abbr;
                    break;
                  }
                }
                if(!behavior.abbreviation) {
                  behavior.abbreviation = behavior.name;
                }
              }
            });
            this.loadTimeRange();
          } else {
            this.student = null;
            this.behaviors = [];
            this.lines = [];
          }
        });
      }
    });
  }

  async loadTimeRange() {
    this.date = this.tempDate? moment(this.tempDate) : this.date;
    this.interval = this.tempInterval ?? this.interval;
    this.intervalType = this.tempIntervalType ?? this.intervalType;
    this.startTime = this.tempStartTime ?? this.startTime;
    this.endTime = this.tempEndTime ?? this.endTime;
    this.editTimeRange = false;

    const start = moment(this.date.format(`yyy-MM-DD ${this.startTime}`));
    const end = moment(this.date.format(`yyy-MM-DD ${this.endTime}`));;
    let now = start.clone();
    this.lines = [];
    const reportResponse = await this.student.reports.getReport(start.clone(), start.clone().add(1, 'day'));
    while(now.isBefore(end)) {
      const lineEnd = now.clone().add(this.interval, this.intervalType).toDate().getTime();
      const lineStart = now.toDate().getTime();
      const lineData = reportResponse.data.filter(data => lineStart <= data.dateEpoc && data.dateEpoc < lineEnd);
      const lineStartIso = moment(lineStart).toISOString();
      const includeLine = !reportResponse.excludedIntervals.find(item => item == lineStartIso);
      const line = new TrackingLine(this.student, this.student.trackables.behaviors, now.clone(), lineData, this.intervalType == 'seconds', includeLine);
      this.lines.push(line);

      now.add(this.interval, this.intervalType);
    }
  }

  beginEditTimeRange() {
    this.tempDate = this.date.format('yyyy-MM-DD');
    this.tempEndTime = this.endTime;
    this.tempStartTime = this.startTime;
    this.tempInterval = this.interval;
    this.tempIntervalType = this.intervalType;
    this.editTimeRange = true;
  }

  print() {
    window.print();
  }
}
