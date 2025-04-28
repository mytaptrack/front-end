import { Component, Input, OnInit, Output, EventEmitter} from '@angular/core';
import { AbcCollection } from '@mytaptrack/types';
import { AbcCollectionClass } from '../..';

@Component({
    selector: 'app-abc-collection',
    templateUrl: './abc-collection.component.html',
    styleUrls: ['./abc-collection.component.scss'],
    standalone: false
})
export class AbcCollectionComponent implements OnInit {
  private _item: AbcCollectionClass;
  public antecedents: string;
  public consequences: string;
  public isSaving: boolean;
  public isDeleting: boolean;
  
  public get studentView() {
    return this.studentId? true : false;
  }
  @Input() public readOnly: boolean = false;
  @Input() public studentId: string;
  @Input() public collections: AbcCollectionClass[];

  public get item(): AbcCollectionClass {
    return this._item;
  }
  @Input()
  public set item(val: AbcCollectionClass) {
    if(this._item == val && val) {
      return;
    }
    this._item = val;
    this.antecedents = (this._item.antecedents ?? []).join('\n');
    this.consequences = (this._item.consequences ?? []).join('\n');
  }

  @Output() public itemChange: EventEmitter<AbcCollection> = new EventEmitter();

  constructor() { }

  async setIsSaving(val: boolean) {
    this.isSaving = val;
  }
  async setIsDeleting(val: boolean) {
    this.isDeleting = val;
  }

  ngOnInit(): void {
    
  }

  async save() {
    if(this.collections && !this.item.name) {
      alert('The collection must have a name');
      return;
    }

    this.setIsSaving(true);
    this.item.antecedents = this.antecedents.split('\n').filter(x => x? true : false);
    this.item.consequences = this.consequences.split('\n').filter(x => x? true : false);
    try {
      await this.item.save();
    } finally {
      this.setIsSaving(false);
    }
  }

  cancel() {
    this.item.cancel();
    this.antecedents = (this._item.antecedents ?? []).join('\n');
    this.consequences = (this._item.consequences ?? []).join('\n');
  }

  async delete() {
    if(!confirm('Are you sure you want to delete these settings?')) {
      return;
    }

    this.setIsDeleting(true);
    try {
      if(this.collections) {
        await this.item.delete();
      } else {
        await this.item.delete();
        this.antecedents = (this._item.antecedents ?? []).join('\n');
        this.consequences = (this._item.consequences ?? []).join('\n');
        this.itemChange.emit(this.item);
      }
    } catch(err) {
      alert(err);
    } finally {
      this.setIsDeleting(false);
    }
  }
}
