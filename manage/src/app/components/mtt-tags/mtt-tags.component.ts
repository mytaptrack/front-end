import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { default as StringMask } from 'string-mask';

@Component({
    selector: 'app-mtt-tags',
    templateUrl: './mtt-tags.component.html',
    styleUrls: ['./mtt-tags.component.scss'],
    standalone: false
})
export class MttTagsComponent implements OnInit {
  public _ngModel: string[] = [];
  public newTag: string;

  @Output() tagFieldChange = new EventEmitter<string[]>();

  @Input() autoSort: boolean = true;
  @Input() public typeText: string = 'tag';
  @Input() public edit: boolean = true;
  
  get tagField() { return this._ngModel; }
  @Input()
  public set tagField(val: string[]) {
    if(!val) {
      this._ngModel = [];
      this.tagFieldChange.emit(this._ngModel);
    } else {
      this._ngModel = val;
      if(this.autoSort) {
        this._ngModel.sort();
      }
    }
  }
  private _format: string;
  private _mask;
  public get format() { return this._format; }
  @Input()
  public set format(val: string) {
    this._format = val;
    if(val == 'phone') {
      this._mask = new StringMask('000-000-0000', { reverse: true });
    }
  }
  public get ngModel() {
    return this._ngModel;
  }

  constructor() { }

  ngOnInit(): void {
  }

  getDisplayFormat(val) {
    if(this._mask) {
      return this._mask.apply(val);
    }
    return val;
  }

  addTag() {
    if(!this.newTag) {
      return;
    }

    if(this.format == 'phone') {
      const preval = this.newTag.replace(/[\-,\(,\),\ ]/g, '');
      if(preval.length != 10) {
        alert('Value does not match a phone number (000-000-0000)');
        return;
      }
    }

    if(!this._ngModel.find(x => x == this.newTag)) {
      this._ngModel.push(this.newTag);
      if(this.autoSort) {
        this._ngModel.sort();
      }
      this.newTag = '';
      this.tagFieldChange.emit(this._ngModel);
    }
  }

  remove(tag: string) {
    if(!tag) {
      return;
    }

    const index = this._ngModel.findIndex(x => x == tag);
    if(index >= 0) {
      this._ngModel.splice(index, 1);
    }
  }
}
