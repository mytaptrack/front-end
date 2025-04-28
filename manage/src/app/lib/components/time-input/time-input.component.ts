import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DateTimeService } from '../../../services';

@Component({
    selector: 'app-time-input',
    templateUrl: './time-input.component.html',
    styleUrls: ['./time-input.component.css'],
    standalone: false
})
export class TimeInputComponent implements OnInit {
  public timeValue: string = '';
  public timeError: string = '';
  @Input('lastTime')
  public lastTime: string = '';

  @Input('readonly')
  public readonly: boolean = false;

  @Output()
  private timeChange: EventEmitter<string> = new EventEmitter(false);
  @Output()
  private errorChange: EventEmitter<string> = new EventEmitter(false);

  @Input()
  set error(val: string) {
    this.timeError = val;
  }

  get time() {
    return this.timeValue
  }
  @Input()
  set time(val: string) {
    this.timeValue = val;
  }

  constructor(private dateTimeService: DateTimeService) { }

  ngOnInit() {
  }

  getTime(time): string {
    if(!time) {
      return '';
    }
      const parsedTime = this.dateTimeService.evaluateUserTime(time, this.lastTime);
      if(parsedTime === null) {
          return '';
      }
      const retval = this.dateTimeService.getReadableTime(parsedTime.toString(), false);
      if(retval === this.timeValue) {
        return '';
      }

      return retval;
  }

  cleanDate() {
    this.timeError = '';
    this.timeValue = this.dateTimeService.evaluateUserTime(this.timeValue, this.lastTime);
    if(this.timeValue) {
      this.timeChange.next(this.timeValue);
    } else {
      this.timeError = 'Could not identify the time specified';
      this.errorChange.emit(this.timeError);
    }
  }
}
