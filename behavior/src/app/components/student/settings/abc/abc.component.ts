import { Component, Input, OnInit } from '@angular/core';
import { 
  AbcCollection, AccessLevel, UserSummaryRestrictions, StudentClass
} from '../../../..';

@Component({
  selector: 'app-abc',
  templateUrl: './abc.component.html',
  styleUrls: ['./abc.component.scss'],
  standalone: false
})
export class AbcComponent implements OnInit {
  @Input() student: StudentClass;
  @Input() restrictions: UserSummaryRestrictions;

  public get abcCollection() {
    return this.student.abc;
  }
  public set abcCollection(abc: AbcCollection) {

  }

  public get isReadOnly() {
    if(!this.restrictions) {
      return true;
    }
    return this.restrictions.abc != AccessLevel.admin;
  }

  constructor() { }

  ngOnInit(): void {
  }

}
