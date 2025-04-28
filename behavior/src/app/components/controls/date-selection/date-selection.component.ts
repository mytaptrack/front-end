import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';

import { 
  ReportDuration, Moment, moment
} from '../../..';

@Component({
  selector: 'app-date-selection',
  templateUrl: './date-selection.component.html',
  styleUrls: [ './date-selection.component.scss' ],
  standalone: false
})
export class DateSelectionComponent implements OnInit {
  public months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  public years = [];
  public showDownloadDropdown: boolean = false;
  public disabled: Observable<boolean> = new Observable();
  public ReportDuration = ReportDuration;
  
  @Output('selected') selected = new EventEmitter<{start: moment.Moment, end: moment.Moment, type: ReportDuration}>();
  
  private _fromDate: Date;
  private _toDate: Date;

  get toDate() { return this._toDate; }
  @Input()
  set toDate(val: Date) {
    this._toDate = val;
    if(this._fromDate && this._toDate) {
      this.notifyChange();
    }
  }

  get fromDate() { return this._fromDate; }
  @Input()
  set fromDate(val: Date) {
    this._fromDate = val;
    if(this._fromDate && this._toDate) {
      this.notifyChange();
    }
  }
  
  public selectionTypeVal: ReportDuration = ReportDuration.week;

  constructor() {
    const now = new Date();
    for(let i = now.getFullYear() - 5; i <= now.getFullYear(); i++) {
      this.years.push(i);
    }
  }

  public ngOnInit() {
  }

  notifyChange() {
    if(!this.toDate || !this.fromDate) {
      return;
    }
    let start = moment(this.fromDate);
    let end = moment(this.toDate);
    this.selected.emit({  
      start,
      end,
      type: ReportDuration.range
    });
  }

  enableOk(): boolean {
    return (this.fromDate && this.toDate)? true : false;
  }
  onOk() {
    this.notifyChange();
    this.showDownloadDropdown = false;
  }
}
