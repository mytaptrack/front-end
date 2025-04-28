import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatChipInputEvent } from '@angular/material/chips';
import { default as StringMask } from 'string-mask';

@Component({
  selector: 'app-mtt-tags',
  templateUrl: './mtt-tags.component.html',
  styleUrls: ['./mtt-tags.component.scss'],
  standalone: false
})
export class MttTagsComponent implements OnInit {
  formControl = new FormControl(['angular']);
  form = new FormGroup({
    tag: new FormControl('tag', (control) => {
      if(!this._validation) {
        return null;
      }
      
      if(!control.value) {
        return null;
      }

      if(this._validation) {
        return this._validation.test(control.value) ? null : { invalid: true } as ValidationErrors;
      }
    }),
  });

  private _newTag: string;
  get newTag() { return this._newTag; }
  set newTag(val: string) {
    this._newTag = val;
    if(val && this._validation && !this._validation.test(val)) {
      this.error = `Invalid value.`;
    } else {
      delete this.error;
    }
  }

  error?: string;

  @Output() tagFieldChange = new EventEmitter<string[]>();

  private _validation?: RegExp;
  private _validStr?: string;
  @Input() set validation(val: string) {
    if(val) {
      this._validation = new RegExp(val);
      this._validStr = val;
    } else {
      delete this._validation;
      delete this._validStr;
    }
  }
  

  @Input() autoSort: boolean = true;
  @Input() typeText: string = 'tag';

  private _edit: boolean = true;
  get edit() { return this._edit; }
  @Input() set edit(val: boolean) { 
    this._edit = val;
  }
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
  public get format() { return this._format; }
  @Input()
  public set format(val: string) {
    this._format = val;
    if(val == 'phone') {
      this._validation = new RegExp('(\()*[0-9]{3}(\)|\-)*[0-9]{3}(\-)*[0-9]{4}');
    }
  }
  
  private _ngModel: string[] = [];
  public get ngModel() {
    return this._ngModel;
  }

  constructor() { }

  ngOnInit(): void {
  }

  addTag(event: MatChipInputEvent) {
    let value = (event.value || '').trim();
    if(!value) {
      return;
    }

    if(this._validation && !this._validation.test(value)) {
      this.error = `Invalid value.`;
      return;
    } else {
      // delete this.error;
    }

    if(this.format == 'phone') {
      const preval = value.replace(/[\-,\(,\),\ ]/g, '');
      value = preval.substring(0,3) + '-' + preval.substring(3,6) + '-' + preval.substring(6,10);
    }

    if(!this._ngModel.find(x => x == value)) {
      this._ngModel.push(value);
      if(this.autoSort) {
        this._ngModel.sort();
      }
      this.tagFieldChange.emit(this._ngModel);
      this.newTag = '';
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
