import { ApiClientService } from '../../../services';
import { 
  ActivityGroupDetails, ScheduleClass, Activity, StudentSchedulesClass, moment
} from '../..';

export class ScheduleCategoryClass implements ActivityGroupDetails {
  history: ScheduleClass[] = [];
  get activeHistory() { return this.history.filter(x => x.startDate); }

  get length() { return this.history.length; }
  get activities(): Activity[] {
    if (this.length == 0) {
      return [];
    }
    return this.history[this.length - 1].activities;
  }
  get applyDays(): number[] {
    if (this.length == 0) {
      return [];
    }
    return this.history[this.length - 1].applyDays;
  }
  get startDate(): string {
    if (this.length == 0) {
      return '';
    }
    return this.history[0].startDate;
  }
  deleted: boolean;
  get name() {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
    this.history.forEach(x => {
      x.name = value;
    });
  }

  constructor(private _name: string, data: ScheduleClass[], private studentId: string, private schedules: StudentSchedulesClass, private api: ApiClientService, private isNew: boolean = false) {
    data.forEach(x => this.addNewElement(x));
    this.sortByDate();
  }

  newSchedule() {
    const retval = new ScheduleClass({
      name: '',
      activities: [],
      applyDays: [1, 2, 3, 4, 5]
    }, this.studentId, this.api, true);
    this.addNewElement(retval);
    return retval;
  }

  private handleScheduleRemoval(val: ScheduleClass) {
    const scheduleIndex = this.history.findIndex(x => x.startDate === val.startDate);
    if (scheduleIndex >= 0) {
      this.history.splice(scheduleIndex, 1);
    }
    if (this.length == 0) {
      this.schedules.remove(this);
    }
  }

  private addNewElement(schedule: ScheduleClass, sort?: boolean) {
    schedule.addCallback = (val) => {
      if(!this.history.find(x => x == schedule)) {
        this.history.push(val);
      }
      this.sortByDate();
      this.isNew = false;
    }
    schedule.removeCallback = (val) => {
      this.handleScheduleRemoval(val);
    }
    this.history.push(schedule);
    if (sort) {
      this.sortByDate();
    }
  }

  async delete() {
    await Promise.all(this.history.map(x => x.delete()));
    this.deleted = true;
  }

  getScheduleEndDate(startDate: moment.Moment): moment.Moment {
    let endDate = null;
    this.history.forEach(x => {
      const start = x.start || moment('1970/01/01');
      if (x.start && x.start.isAfter(startDate)) {
        endDate = x.start;
      }
    });
    return endDate;
  }

  updateSchedulesFor(startDate: moment.Moment, endDate: moment.Moment, applyDays: number[]) {
    if (applyDays.length === 0) {
      return;
    }
    for (let item of this.history) {
      let date = item.start;
      if (endDate && date.isSameOrBefore(endDate, 'day')) {
        continue;
      }

      let modifyItem = item;
      if (date && date.isBefore(startDate, 'day')) {
        modifyItem = new ScheduleClass(item.toDetails(), this.studentId, this.api, true);
        modifyItem.startDate = startDate.format('yyyy-MM-DD');
        date = startDate;
      }

      if (modifyItem.applyDays && modifyItem.applyDays.length > 0) {
        applyDays.forEach(d => {
          const index = modifyItem.applyDays.indexOf(d);
          if (index < 0) {
            return;
          }
          modifyItem.applyDays.splice(index, 1);
        });
      }
      if (modifyItem !== item) {
        this.history.push(modifyItem);
        this.history.sort();
      }
      if (date && date.isSameOrAfter(startDate)) {
        return;
      }
    }
  }

  getSchedule(date: moment.Moment) {
    let retval = this.history.find(x => x.start && x.start.isSameOrBefore(date, 'day'));
    if(!retval) {
      retval = this.history.find(x => !x.start);
    }
    return retval;
  }

  sortByDate() {
    this.history.sort((a, b) => {
      return b.start.toDate().getTime() - a.start.toDate().getTime();
    });

    if(this.history.length == 1) {
      return;
    }
    for (let i = this.history.length - 1; i > 0; i--) {
      const current = this.history[i].toDetails();
      const next = this.history[i - 1].toDetails();
      delete current.startDate;
      delete next.startDate;
      if (JSON.stringify(current) === JSON.stringify(next)) {
        this.history[i - 1].delete();
      }
    }
  }
}
