import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export interface OptionEx {
  value: string;
  display: string;
}

@Component({
    selector: 'app-edit-dropdown',
    templateUrl: './edit-dropdown.component.html',
    styleUrls: ['./edit-dropdown.component.css'],
    standalone: false
})
export class EditDropdownComponent implements OnInit {
  private _val: string;
  public _options: OptionEx[] = [];
  public _hints: OptionEx[] = [];
  private _maxHints: number = 5;

  @Input() id: string = 'edit';

  @Input() readonly = false;
  @Input() placeholder = '';

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

  // ControlValueAccessor implementation
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.readonly = isDisabled;
  }

  // Component methods
  setValue(value: string): void {
    this.value = value;
    this.onChange(value);
    this.onTouched();
  }

  onKeyUp(event: KeyboardEvent): void {
    // Your existing keyup logic
    this.onChange(this.value);
  }

  // Method to update hints
  updateHints(hints: Array<{value: string, display: string}>): void {
    this._hints = hints;
  }
}
