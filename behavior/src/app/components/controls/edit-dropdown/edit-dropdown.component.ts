import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export interface OptionEx {
  value: string;
  display: string;
}

@Component({
  selector: 'app-edit-dropdown',
  templateUrl: './edit-dropdown.component.html',
  styleUrls: ['./edit-dropdown.component.scss'],
  standalone: false
})
export class EditDropdownComponent implements OnInit {
  private _val: string;
  public _options: OptionEx[] = [];
  public _hints: OptionEx[] = [];
  private _maxHints: number = 5;

  @Input() public set hintsMax(val: number) {
    this._maxHints = val;
    this.setHints();
  }
  public get hintsMax() {
    return this._maxHints;
  }

  public get hints() {
    return this._hints;
  }
  @Input() public set options(val: string[]) {
    if(!val) {
      val = [];
    }
    this._options = val.map(x => ({ value: x, display: x } as OptionEx));
    this.setHints();
  }
  @Input() public set optionsEx(val: OptionEx[]) {
    this._options = val;
    this.setHints();
  }
  public get value() {
    return this._val;
  }
  @Input() public set value(val: string) {
    const original = this._val;
    if(this._val != val) {
      this._val = val;
      if (original != undefined) {
        this.valueChange.emit(val);
      }
      this.setHints();
    }
  };
  @Output() private valueChange = new EventEmitter<string>();

  constructor() { }

  ngOnInit(): void {
  }

  setHints() {
    this._hints = this._options.filter(x => !this.value || x.display.indexOf(this.value) >= 0);
    if(this._hints.length > this.hintsMax) {
      this._hints.splice(this.hintsMax);
    }
  }

  setValue(val: string) {
    this.value = val;
  }
}
