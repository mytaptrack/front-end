import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Moment, DateTimeService, ReportDuration
} from '../../..';

@Component({
  selector: 'app-date-dropdown',
  templateUrl: './date-dropdown.component.html',
  styleUrls: ['./date-dropdown.component.scss'],
  standalone: false
})
export class DateDropdownComponent implements OnInit {
  public showDownloadDropdown: boolean = false;
  public disabled: Observable<boolean> = new Observable();
  private _startDate: Moment;
  
  @Input() public selectionType: ReportDuration = ReportDuration.week;
  public get startDate() { return this._startDate; }
  @Input() public set startDate(date: Moment) { 
    this._startDate = date;
  }
  @Input() public endDate: Date;

  @Output('selected') selected = new EventEmitter<{start: Date, end: Date, type: ReportDuration}>();

  constructor(private dateService: DateTimeService) {
  }

  public ngOnInit() {
  }

  selectedChanged(data) {
    this.selected.emit(data);
  }
}
